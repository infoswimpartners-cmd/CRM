
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL, // Ensure this env var exists or construct it
        // If DATABASE_URL is not set, try constructing from components if needed
        // But usually Supabase projects have DATABASE_URL or POSTGRES_URL
    });

    try {
        if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
            // Fallback for local development if needed, but better to rely on env
            console.log("No DATABASE_URL found, assuming local default: postgresql://postgres:postgres@127.0.0.1:54322/postgres");
            await client.connect(); // Modify connection above if needed
        } else {
            await client.connect();
        }

        const migrationPath = path.join(__dirname, 'supabase/migrations/20260123_update_student_rpc_status.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration successful!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
