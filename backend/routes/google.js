const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { pool } = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const cron = require('node-cron');

// Create OAuth2 client
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

// Helper: sync events from Google Calendar to DB
const syncCalendarEvents = async (integrationId, oAuth2Client) => {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    // Get integration config
    const resConfig = await pool.query('SELECT selected_calendars FROM google_corporate_integration WHERE id = $1', [integrationId]);
    if (resConfig.rows.length === 0) return 0;
    const selectedCalendars = resConfig.rows[0].selected_calendars || ['primary'];

    let totalSynced = 0;
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // 1 month ago
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 6); // 6 months ahead

    for (const calendarId of selectedCalendars) {
        try {
            const response = await calendar.events.list({
                calendarId,
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                maxResults: 2500,
                singleEvents: true,
                orderBy: 'startTime',
                showDeleted: true,
            });

            const events = response.data.items || [];
            
            for (const event of events) {
                if (event.status === 'cancelled') {
                    await pool.query('DELETE FROM google_calendar_events WHERE id = $1', [event.id]);
                    continue;
                }

                // Determine start/end times
                let startTime = event.start?.dateTime || event.start?.date;
                let endTime = event.end?.dateTime || event.end?.date;
                let allDay = !event.start?.dateTime;
                
                if (!startTime) continue;
                
                const meetLink = event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null;
                
                await pool.query(
                    `INSERT INTO google_calendar_events 
                    (id, calendar_id, title, description, location, start_time, end_time, all_day, status, google_meet_link, html_link, organizer_email, organizer_name, attendees, color_id, raw_event, synced_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
                    ON CONFLICT (id) DO UPDATE SET 
                        calendar_id = $2, title = $3, description = $4, location = $5, start_time = $6, end_time = $7, all_day = $8, status = $9, google_meet_link = $10, html_link = $11, organizer_email = $12, organizer_name = $13, attendees = $14, color_id = $15, raw_event = $16, synced_at = NOW()`,
                    [
                        event.id,
                        calendarId,
                        event.summary || 'Sem Título',
                        event.description || null,
                        event.location || null,
                        startTime,
                        endTime || startTime,
                        allDay,
                        event.status,
                        meetLink,
                        event.htmlLink,
                        event.organizer?.email || null,
                        event.organizer?.displayName || null,
                        JSON.stringify(event.attendees || []),
                        event.colorId || null,
                        JSON.stringify(event)
                    ]
                );
                totalSynced++;
            }
        } catch (err) {
            console.error(`Error syncing calendar ${calendarId}:`, err.message);
            await pool.query(
                'UPDATE google_corporate_integration SET sync_status = $1 WHERE id = $2',
                ['error', integrationId]
            );
            throw err;
        }
    }
    
    // Update stats
    await pool.query(
        'UPDATE google_corporate_integration SET last_sync_at = NOW(), sync_status = $1, events_count = $2 WHERE id = $3',
        ['success', totalSynced, integrationId]
    );
    
    return totalSynced;
};

// GET /api/google/auth-url (ADMIN ONLY)
router.get('/auth-url', authMiddleware, adminOnly, (req, res) => {
    const oAuth2Client = getOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // Force to get refresh token
        scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]
    });
    res.json({ url: authUrl });
});

// GET /api/google/callback (PUBLIC - Google redirects here)
router.get('/callback', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;

    if (error) {
        return res.redirect(`${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173'}/admin?google_error=${error}`);
    }

    if (!code) {
        return res.status(400).send('Código de autorização não fornecido');
    }

    try {
        const oAuth2Client = getOAuth2Client();
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Get user profile info
        const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
        const userInfo = await oauth2.userinfo.get();
        const { email, name, picture } = userInfo.data;

        // Limpar integração anterior se houver (apenas uma conta por workspace)
        await pool.query('DELETE FROM google_corporate_integration');
        
        // Insert new integration
        const result = await pool.query(
            `INSERT INTO google_corporate_integration 
            (google_email, google_name, google_avatar_url, access_token, refresh_token, token_expires_at, sync_status)
            VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7)
            RETURNING id`,
            [
                email, 
                name, 
                picture, 
                tokens.access_token, 
                tokens.refresh_token || '', // Sometimes refresh token is undefined if not prompted
                tokens.expiry_date,
                'syncing'
            ]
        );
        
        const integrationId = result.rows[0].id;
        
        // Start async sync (do not block the response)
        syncCalendarEvents(integrationId, oAuth2Client).catch(e => {
            console.error('Initial sync failed:', e);
            pool.query('UPDATE google_corporate_integration SET sync_status = $1 WHERE id = $2', ['error', integrationId]);
        });

        // Redirect back to frontend
        const frontendUrl = process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/admin?google_setup=success`);
    } catch (err) {
        console.error('Google Callback Error:', err);
        const frontendUrl = process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/admin?google_error=auth_failed`);
    }
});

// GET /api/google/status (ALL USERS)
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT google_email, google_name, google_avatar_url, last_sync_at, sync_status, events_count FROM google_corporate_integration LIMIT 1');
        if (result.rows.length === 0) {
            return res.json({ connected: false });
        }
        res.json({ connected: true, integration: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao verificar status' });
    }
});

// POST /api/google/sync (ADMIN ONLY)
router.post('/sync', authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM google_corporate_integration LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Integração Google não configurada' });
        }
        
        const integration = result.rows[0];
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials({
            access_token: integration.access_token,
            refresh_token: integration.refresh_token,
            expiry_date: integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : null
        });
        
        const total = await syncCalendarEvents(integration.id, oAuth2Client);
        res.json({ message: 'Sincronização concluída', eventsSynced: total });
    } catch (err) {
        console.error('Sync manual failed:', err);
        res.status(500).json({ message: 'Erro na sincronização manual' });
    }
});

// DELETE /api/google/disconnect (ADMIN ONLY)
router.delete('/disconnect', authMiddleware, adminOnly, async (req, res) => {
    try {
        await pool.query('DELETE FROM google_corporate_integration');
        await pool.query('DELETE FROM google_calendar_events');
        res.json({ message: 'Integração removida com sucesso' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao desconectar' });
    }
});

// Auto-sync Google Calendar events every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    try {
        const result = await pool.query('SELECT * FROM google_corporate_integration LIMIT 1');
        if (result.rows.length === 0) return;
        
        const integration = result.rows[0];
        // Se houver um intervalo configurado e for diferente de 5, podemos ajustar ou manter este fixo
        
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials({
            access_token: integration.access_token,
            refresh_token: integration.refresh_token,
            expiry_date: integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : null
        });
        
        await syncCalendarEvents(integration.id, oAuth2Client);
        console.log('[Cron] Google Calendar events synced successfully.');
    } catch (err) {
        console.error('[Cron] Failed to sync Google Calendar events:', err.message);
    }
});

// Create new event
router.post('/events', authMiddleware, async (req, res) => {
    try {
        const { title, description, startTime, endTime, attendees } = req.body;
        if (!title || !startTime || !endTime) {
            return res.status(400).json({ error: 'Título, data de início e fim são obrigatórios' });
        }

        const result = await pool.query('SELECT * FROM google_corporate_integration LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Integração do Google Calendar não configurada' });
        }

        const integration = result.rows[0];
        const oAuth2Client = getOAuth2Client();
        const tokenExpiresAtMs = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
        
        oAuth2Client.setCredentials({
            access_token: integration.access_token,
            refresh_token: integration.refresh_token,
            expiry_date: tokenExpiresAtMs
        });

        // Ensure token is fresh
        if (tokenExpiresAtMs <= Date.now() + 60000) {
            const { credentials } = await oAuth2Client.refreshAccessToken();
            await pool.query(
                'UPDATE google_corporate_integration SET access_token = $1, token_expires_at = to_timestamp($2 / 1000.0) WHERE id = $3',
                [credentials.access_token, credentials.expiry_date, integration.id]
            );
            oAuth2Client.setCredentials(credentials);
        }

        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        const event = {
            summary: title,
            description: description,
            start: {
                dateTime: new Date(startTime).toISOString(),
            },
            end: {
                dateTime: new Date(endTime).toISOString(),
            },
            attendees: attendees && Array.isArray(attendees) ? attendees.map(email => ({ email })) : [],
            conferenceData: {
                createRequest: {
                    requestId: Math.random().toString(36).substring(7),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        const calendarId = (integration.selected_calendars && integration.selected_calendars.length > 0) 
            ? integration.selected_calendars[0] 
            : 'primary';

        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
            sendUpdates: 'all',
            conferenceDataVersion: 1
        });

        const createdEvent = response.data;
        const meetLink = createdEvent.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null;
        let eventStartTime = createdEvent.start?.dateTime || createdEvent.start?.date;
        let eventEndTime = createdEvent.end?.dateTime || createdEvent.end?.date;
        let allDay = !createdEvent.start?.dateTime;

        // Insert into DB immediately so frontend sees it without waiting for full sync
        await pool.query(
            `INSERT INTO google_calendar_events 
            (id, calendar_id, title, description, location, start_time, end_time, all_day, status, google_meet_link, html_link, organizer_email, organizer_name, attendees, color_id, raw_event, synced_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            ON CONFLICT (id) DO UPDATE SET 
                calendar_id = $2, title = $3, description = $4, location = $5, start_time = $6, end_time = $7, all_day = $8, status = $9, google_meet_link = $10, html_link = $11, organizer_email = $12, organizer_name = $13, attendees = $14, color_id = $15, raw_event = $16, synced_at = NOW()`,
            [
                createdEvent.id,
                calendarId,
                createdEvent.summary || 'Sem Título',
                createdEvent.description || null,
                createdEvent.location || null,
                eventStartTime,
                eventEndTime || eventStartTime,
                allDay,
                createdEvent.status,
                meetLink,
                createdEvent.htmlLink,
                createdEvent.organizer?.email || null,
                createdEvent.organizer?.displayName || null,
                JSON.stringify(createdEvent.attendees || []),
                createdEvent.colorId || null,
                JSON.stringify(createdEvent)
            ]
        );

        // Sync right away (async, don't await so we don't block the response)
        syncCalendarEvents(integration.id, oAuth2Client).catch(err => {
            console.error('Background sync failed after creating event:', err.message);
        });

        res.json({ success: true, event: response.data });
    } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        res.status(500).json({ error: 'Falha ao criar evento no Google Calendar' });
    }
});

module.exports = router;
