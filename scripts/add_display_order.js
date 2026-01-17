
const dotenv = require('dotenv')
const path = require('path')
const { Client } = require('pg')

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function addDisplayOrderColumn(table) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        console.error('Error: DATABASE_URL is not set. Cannot run DDL migrations.')
        process.exit(1)
    }

    console.log(`Attempting to add 'display_order' column to ${table} via direct PG connection...`)
    const client = new Client({ connectionString })

    try {
        await client.connect()
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;`)
        console.log(`Successfully ensured 'display_order' exists in ${table}.`)
    } catch (err) {
        console.error(`Failed to alter table ${table}:`, err.message)
    } finally {
        await client.end()
    }
}

async function main() {
    await addDisplayOrderColumn('lesson_masters')
    await addDisplayOrderColumn('membership_types')
}

main().catch(console.error)
