
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

async function applySchema() {
    const client = new Client({
        connectionString,
    })

    try {
        await client.connect()
        console.log('Connected to database')

        const schemaPath = path.join(process.cwd(), 'supabase/migrations/20240114000000_init.sql')
        const schemaSql = fs.readFileSync(schemaPath, 'utf8')

        console.log('Applying schema...')

        // We need to drop schema public cascade and recreate it to simulate a reset
        await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
        await client.query('GRANT ALL ON SCHEMA public TO postgres;')
        await client.query('GRANT ALL ON SCHEMA public TO public;')

        // Run the schema SQL
        await client.query(schemaSql)

        console.log('Schema applied successfully!')
    } catch (err) {
        console.error('Error applying schema:', err)
        process.exit(1)
    } finally {
        await client.end()
    }
}

applySchema()
