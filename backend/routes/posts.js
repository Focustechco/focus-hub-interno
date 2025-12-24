const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/posts - Get all posts
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.name as author_name, u.avatar_url as author_avatar 
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.timestamp DESC
        `);

        const posts = result.rows.map(row => ({
            id: row.id,
            authorId: row.author_id,
            authorName: row.author_name,
            authorAvatar: row.author_avatar,
            content: row.content,
            createdAt: row.timestamp, // Map timestamp to createdAt
            likes: row.likes,
            isPinned: row.is_pinned || false, // Map is_pinned to isPinned
            comments: row.comments || []
        }));
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/posts - Create a new post
router.post('/', async (req, res) => {
    const { authorId, content } = req.body;

    try {
        const id = 'p' + Date.now();
        const result = await pool.query(
            `INSERT INTO posts (id, author_id, content, timestamp, likes, comments, is_pinned)
             VALUES ($1, $2, $3, NOW(), 0, '[]', false)
             RETURNING *`,
            [id, authorId, content]
        );

        const userResult = await pool.query('SELECT name, avatar_url FROM users WHERE id = $1', [authorId]);
        const user = userResult.rows[0];

        const newPost = {
            id: result.rows[0].id,
            authorId: result.rows[0].author_id,
            authorName: user.name,
            authorAvatar: user.avatar_url,
            content: result.rows[0].content,
            createdAt: result.rows[0].timestamp, // Map timestamp to createdAt
            likes: result.rows[0].likes,
            isPinned: false,
            comments: []
        };

        res.status(201).json(newPost);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/posts/:id - Update a post (e.g. toggle pin or content)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { isPinned, content } = req.body;

    try {
        let query = 'UPDATE posts SET ';
        const values = [];
        let valueIndex = 1;

        if (isPinned !== undefined) {
            query += `is_pinned = $${valueIndex}, `;
            values.push(isPinned);
            valueIndex++;
        }

        if (content !== undefined) {
            query += `content = $${valueIndex}, `;
            values.push(content);
            valueIndex++;
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ` WHERE id = $${valueIndex} RETURNING *`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Fetch author details again to return consistent object
        const post = result.rows[0];
        const userResult = await pool.query('SELECT name, avatar_url FROM users WHERE id = $1', [post.author_id]);
        const user = userResult.rows[0];

        const updatedPost = {
            id: post.id,
            authorId: post.author_id,
            authorName: user.name,
            authorAvatar: user.avatar_url,
            content: post.content,
            timestamp: post.timestamp,
            likes: post.likes,
            isPinned: post.is_pinned,
            comments: [] // Simplified
        };

        res.json(updatedPost);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/posts/:id - Delete a post
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json({ message: 'Post deleted', id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
