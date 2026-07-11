const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { pool } = require('../config/db');

// ---------------------------------------------------------------------------
// Helper – build an authenticated OAuth2 client for a given user
// ---------------------------------------------------------------------------
async function getAuthClient(userId) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { rows } = await pool.query(
    `SELECT google_access_token, google_refresh_token, google_token_expires
       FROM users
      WHERE id = $1`,
    [userId]
  );

  if (!rows.length || !rows[0].google_access_token) {
    throw new Error('Google account not connected');
  }

  const user = rows[0];

  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
    expiry_date: user.google_token_expires
      ? new Date(user.google_token_expires).getTime()
      : undefined,
  });

  // Auto-refresh when the token has expired (or is about to)
  const now = Date.now();
  const expiresAt = user.google_token_expires
    ? new Date(user.google_token_expires).getTime()
    : 0;

  if (expiresAt && expiresAt - now < 60_000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      await pool.query(
        `UPDATE users
            SET google_access_token  = $1,
                google_refresh_token = COALESCE($2, google_refresh_token),
                google_token_expires = $3
          WHERE id = $4`,
        [
          credentials.access_token,
          credentials.refresh_token || null,
          credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
          userId,
        ]
      );
    } catch (err) {
      console.error('[Drive] Token refresh failed:', err.message);
      throw new Error('Failed to refresh Google token');
    }
  }

  return oauth2Client;
}

// ---------------------------------------------------------------------------
// Helper – decide whether a user may access a given folder
// ---------------------------------------------------------------------------
const DRIVE_FILE_FIELDS =
  'id, name, mimeType, modifiedTime, size, owners, starred, iconLink, thumbnailLink, webViewLink, parents';

async function isAllowedFolder(userId, userRole, userSector, folderId, drive) {
  if (userRole === 'ADMIN') return true;

  // 1) Direct match in permissions table
  const { rows } = await pool.query(
    `SELECT id FROM drive_folder_permissions
      WHERE folder_id = $1 AND sector = $2
      LIMIT 1`,
    [folderId, userSector]
  );
  if (rows.length > 0) return true;

  // 2) Walk parent chain to see if an ancestor folder is allowed
  let currentId = folderId;
  const visited = new Set();

  while (currentId && currentId !== 'root') {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    try {
      const fileRes = await drive.files.get({
        fileId: currentId,
        fields: 'parents',
        supportsAllDrives: true,
      });

      const parents = fileRes.data.parents;
      if (!parents || parents.length === 0) break;

      const parentId = parents[0];

      const { rows: parentRows } = await pool.query(
        `SELECT id FROM drive_folder_permissions
          WHERE folder_id = $1 AND sector = $2
          LIMIT 1`,
        [parentId, userSector]
      );

      if (parentRows.length > 0) return true;

      currentId = parentId;
    } catch {
      break;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// GET /files – list files / folders
// ---------------------------------------------------------------------------
router.get('/files', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    const folderId = req.query.folderId || 'root';
    const pageToken = req.query.pageToken || undefined;
    const pageSize = parseInt(req.query.pageSize, 10) || 30;

    // Non-admin requesting root → return only allowed root folders
    if (folderId === 'root' && req.user.role !== 'ADMIN') {
      const { rows: perms } = await pool.query(
        `SELECT folder_id, folder_name FROM drive_folder_permissions
          WHERE sector = $1
          ORDER BY folder_name`,
        [req.user.sector]
      );

      const files = [];
      for (const perm of perms) {
        try {
          const fileRes = await drive.files.get({
            fileId: perm.folder_id,
            fields: DRIVE_FILE_FIELDS,
            supportsAllDrives: true,
          });
          files.push(fileRes.data);
        } catch (err) {
          console.error(`[Drive] Could not fetch folder ${perm.folder_id}:`, err.message);
        }
      }

      return res.json({ files, nextPageToken: null });
    }

    // Non-admin requesting a specific folder → check permission
    if (req.user.role !== 'ADMIN') {
      const allowed = await isAllowedFolder(
        req.user.id,
        req.user.role,
        req.user.sector,
        folderId,
        drive
      );
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied to this folder' });
      }
    }

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken, files(${DRIVE_FILE_FIELDS})`,
      orderBy: 'folder, name',
      pageSize,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    res.json({
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken || null,
    });
  } catch (err) {
    console.error('[Drive] Error listing files:', err.message);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// ---------------------------------------------------------------------------
// GET /files/:id – single file details
// ---------------------------------------------------------------------------
router.get('/files/:id', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    if (req.user.role !== 'ADMIN') {
      const allowed = await isAllowedFolder(
        req.user.id,
        req.user.role,
        req.user.sector,
        req.params.id,
        drive
      );
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied to this file' });
      }
    }

    const response = await drive.files.get({
      fileId: req.params.id,
      fields: DRIVE_FILE_FIELDS,
      supportsAllDrives: true,
    });

    res.json(response.data);
  } catch (err) {
    console.error('[Drive] Error getting file:', err.message);
    if (err.code === 404) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Failed to get file details' });
  }
});

// ---------------------------------------------------------------------------
// GET /search – search files
// ---------------------------------------------------------------------------
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    let q = `name contains '${searchQuery.replace(/'/g, "\\'")}' and trashed = false`;

    // Non-admin: restrict search to allowed folders
    if (req.user.role !== 'ADMIN') {
      const { rows: perms } = await pool.query(
        `SELECT folder_id FROM drive_folder_permissions WHERE sector = $1`,
        [req.user.sector]
      );

      if (perms.length === 0) {
        return res.json({ files: [] });
      }

      const parentClauses = perms
        .map((p) => `'${p.folder_id}' in parents`)
        .join(' or ');
      q += ` and (${parentClauses})`;
    }

    const response = await drive.files.list({
      q,
      fields: `files(${DRIVE_FILE_FIELDS})`,
      orderBy: 'folder, name',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    res.json({ files: response.data.files || [] });
  } catch (err) {
    console.error('[Drive] Error searching files:', err.message);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// ---------------------------------------------------------------------------
// GET /recent – recently modified files
// ---------------------------------------------------------------------------
router.get('/recent', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    let q = 'trashed = false';

    if (req.user.role !== 'ADMIN') {
      const { rows: perms } = await pool.query(
        `SELECT folder_id FROM drive_folder_permissions WHERE sector = $1`,
        [req.user.sector]
      );

      if (perms.length === 0) {
        return res.json({ files: [] });
      }

      const parentClauses = perms
        .map((p) => `'${p.folder_id}' in parents`)
        .join(' or ');
      q += ` and (${parentClauses})`;
    }

    const response = await drive.files.list({
      q,
      fields: `files(${DRIVE_FILE_FIELDS})`,
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    res.json({ files: response.data.files || [] });
  } catch (err) {
    console.error('[Drive] Error listing recent files:', err.message);
    res.status(500).json({ error: 'Failed to list recent files' });
  }
});

// ---------------------------------------------------------------------------
// GET /shared – files shared with me
// ---------------------------------------------------------------------------
router.get('/shared', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: 'sharedWithMe = true and trashed = false',
      fields: `files(${DRIVE_FILE_FIELDS})`,
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    res.json({ files: response.data.files || [] });
  } catch (err) {
    console.error('[Drive] Error listing shared files:', err.message);
    res.status(500).json({ error: 'Failed to list shared files' });
  }
});

// ---------------------------------------------------------------------------
// GET /starred – starred files
// ---------------------------------------------------------------------------
router.get('/starred', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: 'starred = true and trashed = false',
      fields: `files(${DRIVE_FILE_FIELDS})`,
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    res.json({ files: response.data.files || [] });
  } catch (err) {
    console.error('[Drive] Error listing starred files:', err.message);
    res.status(500).json({ error: 'Failed to list starred files' });
  }
});

// ---------------------------------------------------------------------------
// GET /trash – trashed files (admin only)
// ---------------------------------------------------------------------------
router.get('/trash', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: 'trashed = true',
      fields: `files(${DRIVE_FILE_FIELDS})`,
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    res.json({ files: response.data.files || [] });
  } catch (err) {
    console.error('[Drive] Error listing trashed files:', err.message);
    res.status(500).json({ error: 'Failed to list trashed files' });
  }
});

// ---------------------------------------------------------------------------
// GET /storage – storage quota information
// ---------------------------------------------------------------------------
router.get('/storage', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.about.get({
      fields: 'storageQuota',
    });

    res.json(response.data.storageQuota);
  } catch (err) {
    console.error('[Drive] Error getting storage info:', err.message);
    res.status(500).json({ error: 'Failed to get storage information' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /files/:id/star – toggle star on a file
// ---------------------------------------------------------------------------
router.patch('/files/:id/star', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    // Get current starred status
    const current = await drive.files.get({
      fileId: req.params.id,
      fields: 'starred',
      supportsAllDrives: true,
    });

    const newStarred = !current.data.starred;

    const response = await drive.files.update({
      fileId: req.params.id,
      requestBody: { starred: newStarred },
      fields: DRIVE_FILE_FIELDS,
      supportsAllDrives: true,
    });

    res.json(response.data);
  } catch (err) {
    console.error('[Drive] Error toggling star:', err.message);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /files/:id – move file to trash (admin only)
// ---------------------------------------------------------------------------
router.delete('/files/:id', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    await drive.files.update({
      fileId: req.params.id,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });

    res.json({ message: 'File moved to trash' });
  } catch (err) {
    console.error('[Drive] Error trashing file:', err.message);
    res.status(500).json({ error: 'Failed to trash file' });
  }
});

// ---------------------------------------------------------------------------
// GET /files/:id/preview – preview information for a file
// ---------------------------------------------------------------------------
router.get('/files/:id/preview', async (req, res) => {
  try {
    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    if (req.user.role !== 'ADMIN') {
      const allowed = await isAllowedFolder(
        req.user.id,
        req.user.role,
        req.user.sector,
        req.params.id,
        drive
      );
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied to this file' });
      }
    }

    const response = await drive.files.get({
      fileId: req.params.id,
      fields: 'id, name, mimeType, webViewLink, exportLinks, thumbnailLink',
      supportsAllDrives: true,
    });

    res.json({
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      webViewLink: response.data.webViewLink || null,
      exportLinks: response.data.exportLinks || null,
      thumbnailLink: response.data.thumbnailLink || null,
    });
  } catch (err) {
    console.error('[Drive] Error getting preview:', err.message);
    if (err.code === 404) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Failed to get preview info' });
  }
});

// ---------------------------------------------------------------------------
// GET /permissions – list all folder permissions (admin only)
// ---------------------------------------------------------------------------
router.get('/permissions', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rows } = await pool.query(
      `SELECT id, folder_id, folder_name, sector, created_by, created_at
         FROM drive_folder_permissions
        ORDER BY sector, folder_name`
    );

    res.json(rows);
  } catch (err) {
    console.error('[Drive] Error listing permissions:', err.message);
    res.status(500).json({ error: 'Failed to list permissions' });
  }
});

// ---------------------------------------------------------------------------
// POST /permissions – add a folder permission (admin only)
// ---------------------------------------------------------------------------
router.post('/permissions', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { folderId, folderName, sector } = req.body;

    if (!folderId || !folderName || !sector) {
      return res
        .status(400)
        .json({ error: 'folderId, folderName, and sector are required' });
    }

    const validSectors = ['Administração', 'Tech', 'RH', 'Comercial', 'Financeiro'];
    if (!validSectors.includes(sector)) {
      return res.status(400).json({ error: 'Invalid sector' });
    }

    const { rows } = await pool.query(
      `INSERT INTO drive_folder_permissions (folder_id, folder_name, sector, created_by)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (folder_id, sector) DO NOTHING
       RETURNING *`,
      [folderId, folderName, sector, req.user.id]
    );

    if (rows.length === 0) {
      return res
        .status(409)
        .json({ error: 'Permission already exists for this folder and sector' });
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[Drive] Error adding permission:', err.message);
    res.status(500).json({ error: 'Failed to add permission' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /permissions/:id – remove a folder permission (admin only)
// ---------------------------------------------------------------------------
router.delete('/permissions/:id', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rows } = await pool.query(
      `DELETE FROM drive_folder_permissions WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json({ message: 'Permission removed', permission: rows[0] });
  } catch (err) {
    console.error('[Drive] Error removing permission:', err.message);
    res.status(500).json({ error: 'Failed to remove permission' });
  }
});

// ---------------------------------------------------------------------------
// GET /root-folders – list root-level folders in Drive (admin only)
// ---------------------------------------------------------------------------
router.get('/root-folders', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const auth = await getAuthClient(req.user.id);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: "'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name, mimeType, modifiedTime, iconLink)',
      orderBy: 'name',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    res.json({ folders: response.data.files || [] });
  } catch (err) {
    console.error('[Drive] Error listing root folders:', err.message);
    res.status(500).json({ error: 'Failed to list root folders' });
  }
});

module.exports = router;
