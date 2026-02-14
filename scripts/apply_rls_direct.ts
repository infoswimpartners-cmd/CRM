
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Construct connection string usually available as POSTGRES_URL or similar in Vercel/Supabase envs
// If not, we might need to build it. Supabase usually provides DATABASE_URL (transaction pooler) or DIRECT_URL (session).
// Session mode is needed for schema changes if transaction pooler doesn't support it, but RLS creation should be fine.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('No DATABASE_URL or POSTGRES_URL found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase in many environments
});

async function main() {
    try {
        await client.connect();

        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260212110000_add_admin_lesson_policies.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration:', migrationPath);
        await client.query(sql);
        console.log('Migration applied successfully.');

    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

main();
