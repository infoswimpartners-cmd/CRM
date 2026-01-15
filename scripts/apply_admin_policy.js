const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runMigration() {
    console.log('Connecting to database...');
    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL is not defined in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected. Applying Admin Policy...');

        const migrationPath = path.resolve(__dirname, '../supabase/migrations/20240114_allow_admin_update_profiles.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        await client.query(migrationSql);

        console.log('Admin Policy Applied Successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
