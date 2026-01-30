
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function migrate() {
    // Use connection string if available, or build from parts
    // Assuming DATABASE_URL is standard for Supabase
    const dbUrl = process.env.DATABASE_URL
    console.log('DB URL found:', !!dbUrl)
    if (!dbUrl) {
        console.error('DATABASE_URL is missing')
        process.exit(1)
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log('Connected to DB')

        // Add columns if not exist
        await client.query(`
      ALTER TABLE lesson_schedules 
      ADD COLUMN IF NOT EXISTS billing_scheduled_at TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ DEFAULT NULL;
    `)

        console.log('Columns added successfully')
    } catch (e) {
        console.error('Migration failed:', e)
    } finally {
        await client.end()
    }
}

migrate()
