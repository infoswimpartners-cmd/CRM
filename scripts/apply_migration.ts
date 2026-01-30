import { Client } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

async function applyMigration() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not found in .env.local')
        process.exit(1)
    }

    // Explicitly use connection string with sslmode=require if needed, usually direct URL is better for migrations
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    })

    try {
        await client.connect()
        console.log('Connected to database.')

        const sql = fs.readFileSync('supabase/migrations/20260122_update_student_status_constraint.sql', 'utf8')
        console.log('Applying migration:\n', sql)

        await client.query(sql)
        console.log('✅ Migration updated status constraint applied successfully.')
    } catch (err) {
        console.error('Migration failed:', err)
    } finally {
        await client.end()
    }
}

applyMigration()
