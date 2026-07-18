require('dotenv').config();
const { google } = require('googleapis');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:@focusOS19964@db.afxfikprunkspcfgzzil.supabase.co:5432/postgres' });

async function sync() {
    try {
        const result = await pool.query('SELECT * FROM google_corporate_integration LIMIT 1');
        const integration = result.rows[0];
        
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        
        oAuth2Client.setCredentials({
            access_token: integration.access_token,
            refresh_token: integration.refresh_token,
            expiry_date: integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : null
        });
        
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
            timeMax: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
            showDeleted: true,
        });
        
        const events = response.data.items || [];
        console.log("Fetched events length:", events.length);
        
        let synced = 0;
        for (const event of events) {
            if (event.status === 'cancelled') {
                await pool.query('DELETE FROM google_calendar_events WHERE id = $1', [event.id]);
                continue;
            }

            let startTime = event.start?.dateTime || event.start?.date;
            let endTime = event.end?.dateTime || event.end?.date;
            let allDay = !event.start?.dateTime;
            
            if (!startTime) continue;
            
            const meetLink = event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null;
            
            try {
                await pool.query(
                    `INSERT INTO google_calendar_events 
                    (id, calendar_id, title, description, location, start_time, end_time, all_day, status, google_meet_link, html_link, organizer_email, organizer_name, attendees, color_id, raw_event, synced_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
                    ON CONFLICT (id) DO UPDATE SET 
                        calendar_id = $2, title = $3, description = $4, location = $5, start_time = $6, end_time = $7, all_day = $8, status = $9, google_meet_link = $10, html_link = $11, organizer_email = $12, organizer_name = $13, attendees = $14, color_id = $15, raw_event = $16, synced_at = NOW()`,
                    [
                        event.id,
                        'primary',
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
                synced++;
            } catch(e) {
                console.error("DB INSERT ERROR for event", event.summary, ":", e.message);
            }
        }
        console.log("Successfully synced", synced, "events.");
    } catch(e) {
        console.error("Fetch Error:", e.message);
    }
    process.exit();
}
sync();
