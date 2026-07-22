import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || (process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres:' + process.env.SUPABASE_SERVICE_ROLE_KEY + '@db.') : null);
  
  if (!process.env.DATABASE_URL) {
     console.log("No DATABASE_URL in .env.local, please set it or we can't run the migration automatically.");
     process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260708142100_add_pricing_group_and_visibility.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log("Executing migration...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
