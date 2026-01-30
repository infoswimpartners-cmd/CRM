
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Construct connection string if not present, but usually locally it might be different.
// However, the user's run_migration.ts suggests trying DATABASE_URL.
// Since I can't easily guess the local postgres password/port if not in env, I'll rely on env.
// If env is missing, I'll try the default local supabase one: postgresql://postgres:postgres@127.0.0.1:54322/postgres

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function runMigration() {
    console.log('Connecting to database...');
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();

        const migrationFile = 'supabase/migrations/20260130153000_add_second_student_kana.sql';
        const migrationPath = path.resolve(process.cwd(), migrationFile);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found at ${migrationPath}`);
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log(`Running migration: ${migrationFile}`);
        await client.query(sql);
        console.log('Migration successful!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
