require('dotenv').config();
const { google } = require('googleapis');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
    const res = await pool.query('SELECT * FROM google_corporate_integration');
    if(res.rows.length===0) return console.log('no int');
    const int = res.rows[0];
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    auth.setCredentials({access_token: int.access_token, refresh_token: int.refresh_token});
    const calendar = google.calendar({version: 'v3', auth});
    const events = await calendar.events.list({
        calendarId: 'primary',
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
    });
    console.log(`Found ${events.data.items.length} events.`);
    
    for (const event of events.data.items) {
        let startTime = event.start?.dateTime || event.start?.date;
        let endTime = event.end?.dateTime || event.end?.date;
        let allDay = !event.start?.dateTime;
        console.log('inserting:', event.summary, startTime);
        const meetLink = null;
        try {
            await pool.query(
                `INSERT INTO google_calendar_events 
                (id, calendar_id, title, description, location, start_time, end_time, all_day, status, google_meet_link, html_link, organizer_email, organizer_name, attendees, color_id, raw_event, synced_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
                [
                    event.id, 'primary', event.summary || 'Sem Título', event.description || null, event.location || null,
                    startTime, endTime || startTime, allDay, event.status, meetLink, event.htmlLink,
                    event.organizer?.email || null, event.organizer?.displayName || null,
                    JSON.stringify(event.attendees || []), event.colorId || null, JSON.stringify(event)
                ]
            );
            console.log('inserted ok');
        } catch(e) {
            console.error('insert error:', e.message);
        }
    }
}
test().catch(console.error).finally(()=>process.exit());
