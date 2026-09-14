const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/agenda/events
// Busca eventos da agenda (todos os usuários autenticados têm acesso)
router.get('/events', async (req, res) => {
    try {
        const { start, end, search } = req.query;
        let query = 'SELECT * FROM google_calendar_events WHERE 1=1';
        let params = [];
        let paramIndex = 1;

        if (start) {
            query += ` AND start_time >= $${paramIndex}`;
            params.push(start);
            paramIndex++;
        }

        if (end) {
            query += ` AND start_time <= $${paramIndex}`;
            params.push(end);
            paramIndex++;
        }

        if (search) {
            query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex} OR organizer_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ' ORDER BY start_time ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching agenda events:', err);
        res.status(500).json({ message: 'Erro ao buscar eventos da agenda corporativa' });
    }
});

// GET /api/agenda/dashboard
// Retorna os KPIs da agenda para a dashboard corporativa
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        
        // Next 7 days
        const endOfWeek = new Date(startOfDay);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        // 1. Events today
        const todayRes = await pool.query(
            'SELECT COUNT(*) as count FROM google_calendar_events WHERE start_time >= $1 AND start_time < $2',
            [startOfDay.toISOString(), endOfDay.toISOString()]
        );
        const eventsToday = parseInt(todayRes.rows[0].count, 10);

        // 2. Events this week
        const weekRes = await pool.query(
            'SELECT COUNT(*) as count FROM google_calendar_events WHERE start_time >= $1 AND start_time < $2',
            [startOfDay.toISOString(), endOfWeek.toISOString()]
        );
        const eventsThisWeek = parseInt(weekRes.rows[0].count, 10);

        // 3. Next meeting
        const nextMeetingRes = await pool.query(
            'SELECT * FROM google_calendar_events WHERE start_time > $1 ORDER BY start_time ASC LIMIT 1',
            [now.toISOString()]
        );
        const nextMeeting = nextMeetingRes.rows[0] || null;

        // 4. Meetings today (events with Meet link)
        const meetingsTodayRes = await pool.query(
            'SELECT COUNT(*) as count FROM google_calendar_events WHERE start_time >= $1 AND start_time < $2 AND google_meet_link IS NOT NULL',
            [startOfDay.toISOString(), endOfDay.toISOString()]
        );
        const meetingsToday = parseInt(meetingsTodayRes.rows[0].count, 10);

        res.json({
            eventsToday,
            eventsThisWeek,
            nextMeeting,
            meetingsToday,
            hoursCommitted: 0, // Simplified for now
            upcomingEvents: [] // Will fetch on frontend
        });
    } catch (err) {
        console.error('Error fetching agenda dashboard:', err);
        res.status(500).json({ message: 'Erro ao buscar métricas da agenda' });
    }
});

// PUT /api/agenda/events/:id/color
// Atualiza a cor de um evento
router.put('/events/:id/color', async (req, res) => {
    try {
        const { id } = req.params;
        const { color_hex } = req.body;
        
        await pool.query(
            'UPDATE google_calendar_events SET color_hex = $1 WHERE id = $2',
            [color_hex, id]
        );
        
        res.json({ success: true, message: 'Cor atualizada com sucesso' });
    } catch (err) {
        console.error('Error updating event color:', err);
        res.status(500).json({ message: 'Erro ao atualizar cor do evento' });
    }
});

module.exports = router;

