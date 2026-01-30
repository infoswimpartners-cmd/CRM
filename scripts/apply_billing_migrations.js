
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigrations() {
    let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('No connection string found (POSTGRES_URL or DATABASE_URL).');
        process.exit(1);
    }

    // Handle potential quotes
    connectionString = connectionString.replace(/['"]/g, '');

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const migrations = [
            'supabase/migrations/20260130160000_add_price_to_schedules.sql',
            'supabase/migrations/20260130170000_add_billing_summary_template.sql',
            'supabase/migrations/20260130173000_add_billing_approval_request_template.sql'
        ];

        for (const file of migrations) {
            const filePath = path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                console.log(`Applying ${file}...`);
                const sql = fs.readFileSync(filePath, 'utf8');
                await client.query(sql);
                console.log(`Applied ${file}.`);
            } else {
                console.error(`Migration file not found: ${file}`);
            }
        }

        console.log('All migrations applied successfully.');
    } catch (err) {
        console.error('Error applying migrations:', err);
    } finally {
        await client.end();
    }
}

applyMigrations();
