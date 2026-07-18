require('dotenv').config();
const { google } = require('googleapis');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:@focusOS19964@db.afxfikprunkspcfgzzil.supabase.co:5432/postgres' });

async function listCalendars() {
    try {
        const result = await pool.query('SELECT * FROM google_corporate_integration LIMIT 1');
        if (result.rows.length === 0) {
            console.log('No integration found');
            process.exit(1);
        }
        
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
        
        // List all calendars
        const calRes = await calendar.calendarList.list();
        console.log("Calendars available:");
        for (const cal of calRes.data.items) {
            console.log(`- ${cal.summary} (ID: ${cal.id}, Primary: ${cal.primary})`);
            
            // fetch 5 events from this calendar
            const eventsRes = await calendar.events.list({
                calendarId: cal.id,
                timeMin: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
                maxResults: 5,
                singleEvents: true,
                orderBy: 'startTime',
            });
            console.log(`  -> Found ${eventsRes.data.items.length} recent events`);
            if (eventsRes.data.items.length > 0) {
                console.log(`  -> Example: ${eventsRes.data.items[0].summary}`);
            }
        }
        
    } catch(e) {
        console.error(e);
    }
    process.exit();
}

listCalendars();
