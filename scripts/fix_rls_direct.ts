
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    console.error('No DATABASE_URL found in .env.local')
    process.exit(1)
}

console.log('Using connection string length:', connectionString.length)

// Manual config construction to bypass potential pg-connection-string issues
let config;
try {
    const url = new URL(connectionString);
    config = {
        user: url.username,
        password: url.password,
        host: url.hostname,
        port: parseInt(url.port || '5432'),
        database: url.pathname.slice(1), // remove leading /
        ssl: { rejectUnauthorized: false } // Required for Supabase/Neon usually
    };
    console.log('Parsed config:', { ...config, password: '***' });
} catch (e) {
    console.error('Failed to parse connection string with URL:', e);
    process.exit(1);
}

const client = new Client(config)

const sql = `
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow Admin Update Lesson Masters" ON public.lesson_masters;
    
    CREATE POLICY "Allow Admin Update Lesson Masters"
    ON public.lesson_masters
    FOR UPDATE
    TO authenticated
    USING (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
    
    -- Ensure Insert is also allowed
    DROP POLICY IF EXISTS "Allow Admin Insert Lesson Masters" ON public.lesson_masters;
    CREATE POLICY "Allow Admin Insert Lesson Masters"
    ON public.lesson_masters
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
END
$$;
`

async function run() {
    try {
        await client.connect()
        console.log('Connected to DB. Applying RLS Policy...')
        await client.query(sql)
        console.log('RLS Policy Applied Successfully.')
    } catch (err) {
        console.error('Error applying RLS:', err)
    } finally {
        await client.end()
    }
}

run()
