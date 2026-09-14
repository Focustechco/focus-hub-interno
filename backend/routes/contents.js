const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'documentos';
        if (file.fieldname === 'cover_image') {
            folder = 'capas';
        }
        const dir = path.join(__dirname, '..', 'storage', folder);
        // Ensure directory exists
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role && req.user.role.toUpperCase() === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }
};

// GET all contents
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contents ORDER BY order_index ASC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao buscar conteúdos' });
    }
});

// POST new content (Admin only)
router.post('/', isAdmin, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, description, category, icon, color, status, order_index } = req.body;
        
        let file_url = '';
        if (req.files['file'] && req.files['file'].length > 0) {
            file_url = `${req.protocol}://${req.get('host')}/storage/documentos/${req.files['file'][0].filename}`;
        } else {
            return res.status(400).json({ message: 'O arquivo é obrigatório.' });
        }

        let cover_image = null;
        if (req.files['cover_image'] && req.files['cover_image'].length > 0) {
            cover_image = `${req.protocol}://${req.get('host')}/storage/capas/${req.files['cover_image'][0].filename}`;
        }

        const id = `content-${Date.now()}`;
        const isActive = status === 'true' || status === true;

        const result = await pool.query(
            `INSERT INTO contents (id, title, description, category, file_url, cover_image, icon, color, status, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [id, title, description, category, file_url, cover_image, icon || 'Book', color || '#FF6B00', isActive, parseInt(order_index) || 0]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao criar conteúdo' });
    }
});

// PUT update content (Admin only)
router.put('/:id', isAdmin, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }]), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, icon, color, status, order_index } = req.body;
        
        // Fetch current to keep old urls if not updated
        const currentRes = await pool.query('SELECT * FROM contents WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ message: 'Conteúdo não encontrado' });
        }
        const current = currentRes.rows[0];

        let file_url = current.file_url;
        if (req.files['file'] && req.files['file'].length > 0) {
            file_url = `${req.protocol}://${req.get('host')}/storage/documentos/${req.files['file'][0].filename}`;
            // Optional: Delete old file
            try {
                if (current.file_url) {
                    const oldFilename = current.file_url.split('/').pop();
                    const oldPath = path.join(__dirname, '..', 'storage', 'documentos', oldFilename);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            } catch (e) { console.error("Error deleting old file:", e); }
        }

        let cover_image = current.cover_image;
        if (req.files['cover_image'] && req.files['cover_image'].length > 0) {
            cover_image = `${req.protocol}://${req.get('host')}/storage/capas/${req.files['cover_image'][0].filename}`;
             // Optional: Delete old cover
             try {
                if (current.cover_image) {
                    const oldFilename = current.cover_image.split('/').pop();
                    const oldPath = path.join(__dirname, '..', 'storage', 'capas', oldFilename);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            } catch (e) { console.error("Error deleting old cover:", e); }
        } else if (req.body.remove_cover === 'true') {
            cover_image = null;
            try {
                if (current.cover_image) {
                    const oldFilename = current.cover_image.split('/').pop();
                    const oldPath = path.join(__dirname, '..', 'storage', 'capas', oldFilename);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            } catch (e) { console.error("Error deleting old cover:", e); }
        }

        const isActive = status === 'true' || status === true;

        const result = await pool.query(
            `UPDATE contents 
             SET title = $1, description = $2, category = $3, file_url = $4, cover_image = $5, 
                 icon = $6, color = $7, status = $8, order_index = $9, updated_at = CURRENT_TIMESTAMP
             WHERE id = $10 RETURNING *`,
            [title, description, category, file_url, cover_image, icon || 'Book', color || '#FF6B00', isActive, parseInt(order_index) || 0, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao atualizar conteúdo' });
    }
});

// DELETE content (Admin only)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const currentRes = await pool.query('SELECT * FROM contents WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ message: 'Conteúdo não encontrado' });
        }
        const current = currentRes.rows[0];

        // Delete files from storage
        try {
            if (current.file_url) {
                const oldFilename = current.file_url.split('/').pop();
                const oldPath = path.join(__dirname, '..', 'storage', 'documentos', oldFilename);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            if (current.cover_image) {
                const oldFilename = current.cover_image.split('/').pop();
                const oldPath = path.join(__dirname, '..', 'storage', 'capas', oldFilename);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        } catch (e) { console.error("Error deleting files:", e); }

        await pool.query('DELETE FROM contents WHERE id = $1', [id]);
        res.json({ message: 'Conteúdo removido com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao remover conteúdo' });
    }
});

module.exports = router;
