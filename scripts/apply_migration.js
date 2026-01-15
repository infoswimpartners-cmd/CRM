const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runMigration() {
    console.log('Connecting to database...');
    // Try to get DATABASE_URL, if not, try to construct from Supabase params if possible, 
    // but usually DATABASE_URL is standard for pg client.
    // If DATABASE_URL is not in .env.local, this will fail.
    // In Supabase projects, usually there is a connection string.

    // Fallback: the user might only have NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.
    // If so, we can't run DDL via 'pg' unless we have the postgres connection string.

    // Let's assume DATABASE_URL exists or ask user. 
    // But since I can't see .env.local, I'll try to just check if I can run it.

    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL is not defined in .env.local');
        console.error('Please make sure you have the Direct Connection String in your .env.local file');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected.');

        // 3. Add reward_master_id to membership_types
        console.log('Applying migration: 20240114_add_reward_master_to_membership.sql...');
        const migrationSql = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20240114_add_reward_master_to_membership.sql'), 'utf8');

        // Wrap in DO block to avoid error if column exists
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership_types' AND column_name = 'reward_master_id') THEN 
                    ${migrationSql}
                END IF; 
            END $$;
        `);


        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
