
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://svsmgjulytmhlxcaczge.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2c21nanVseXRtaGx4Y2FjemdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDkzMTksImV4cCI6MjA4Mzg4NTMxOX0.DzfkVRnY1TjakldcnlilbFPra9OTie6QxeHsdGpWn9E"

const supabase = createClient(supabaseUrl, supabaseKey)

async function listCoaches() {
    console.log('--- Listing Coaches & Ranks ---')
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, override_coach_rank')
        .order('role', { ascending: true })

    if (error) {
        console.error('Error:', error)
        return
    }

    profiles.forEach(p => {
        const rank = p.override_coach_rank !== null ? p.override_coach_rank : 'Auto'
        console.log(`[${p.role.padEnd(6)}] ${p.full_name?.padEnd(10)} | Override: ${rank}`)
    })
    console.log('-------------------------------')

    console.log('--- Listing Lesson Masters ---')
    const { data: masters, error: masterError } = await supabase
        .from('lesson_masters')
        .select('*')
        .order('id', { ascending: true })

    if (masterError) {
        console.error('Error masters:', masterError)
    } else {
        masters.forEach(m => {
            console.log(`[${m.id}] ${m.name} | Price: ${m.unit_price} | Trial: ${m.is_trial}`)
        })
    }
    console.log('-------------------------------')
}

listCoaches()
