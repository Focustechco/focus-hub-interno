const { Pool, types } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// IMPORTANT: By default, pg converts TIMESTAMP and DATE to JavaScript Date objects
// which then get serialized as UTC ISO strings, causing timezone issues.
// Override the default parsers to return raw strings instead.

// Type OID for TIMESTAMP (1114), TIMESTAMPTZ (1184), DATE (1082)
// Return them as strings to preserve the local time
types.setTypeParser(1114, (stringValue) => stringValue); // TIMESTAMP WITHOUT TIME ZONE
types.setTypeParser(1184, (stringValue) => stringValue); // TIMESTAMP WITH TIME ZONE  
types.setTypeParser(1082, (stringValue) => stringValue); // DATE

const SUPABASE_DB_URL = 'postgresql://postgres.vxqernhfgulaewtmfagh:Focus%21%40%214235@aws-1-us-west-2.pooler.supabase.com:6543/postgres';
const dbUrl = (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.com'))
    ? process.env.DATABASE_URL
    : SUPABASE_DB_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
