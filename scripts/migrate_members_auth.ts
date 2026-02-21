import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log('🚀 Starting Member Auth Migration...');

    let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment.');
        console.log('Env keys:', Object.keys(process.env));
        process.exit(1);
    }

    connectionString = connectionString.trim();

    // Normalize protocol to postgresql://
    if (!connectionString.includes('://')) {
        if (connectionString.startsWith('postgres:')) {
            connectionString = connectionString.replace('postgres:', 'postgresql://');
        } else if (connectionString.startsWith('postgresql:')) {
            connectionString = connectionString.replace('postgresql:', 'postgresql://');
        }
    } else {
        // Ensure standard protocol
        if (connectionString.startsWith('postgres://')) {
            connectionString = connectionString.replace('postgres://', 'postgresql://');
        }
    }

    // Fix if it somehow has single slash after protocol (rare but possible in some env exports)
    // e.g. postgres:/user:pass...
    if (connectionString.match(/^postgres(ql)?:[^/]\//)) {
        connectionString = connectionString.replace(/:([^/])\//, '://$1/');
    }

    console.log('✅ Connection string check:');
    console.log('   Original length:', (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.length);
    console.log('   Final starts with:', connectionString.substring(0, 15) + '...');


    // Manual parsing as fallback/primary to avoid pg-connection-string issues
    const regex = /^(?:postgres|postgresql):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = connectionString.match(regex);

    let clientConfig: any;

    if (match) {
        console.log('✅ Manual parsing successful');
        const [, user, password, host, port, database] = match;
        // Handle database with query params?
        const dbName = database.split('?')[0];

        clientConfig = {
            user,
            password,
            host,
            port: parseInt(port),
            database: dbName,
            ssl: { rejectUnauthorized: false }
        };
    } else {
        console.log('⚠️ Manual parsing failed, trying string directly...');
        // Fallback or just try string (though known to fail)
        clientConfig = {
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        };
    }

    const client = new Client(clientConfig);

    try {
        await client.connect();
        console.log('✅ Connected to Database');

        const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260217100000_add_member_auth_fields.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log(`📦 Applying migration: ${path.basename(migrationPath)}`);

        // Split by semicolon? No, supabase migrations usually are one block or safe to run as one query.
        // But `\i ...` or `create trigger ...` logic might need splitting if specific pg client limitations exist.
        // Usually `client.query` can handle multiple statements.

        await client.query(sql);

        console.log('✅ Migration Applied Successfully!');

    } catch (e) {
        console.error('❌ Migration Failed:', e);
    } finally {
        await client.end();
    }
}

main();
