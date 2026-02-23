import { createClient } from './src/lib/supabase/server'
async function main() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase.from('lessons').select('*').limit(1)
        if (error) {
            console.error('Query Error:', error.message)
            return
        }
        if (data && data.length > 0) {
            console.log('COLUMNS_START')
            console.log(JSON.stringify(Object.keys(data[0])))
            console.log('COLUMNS_END')
        } else {
            console.log('EMPTY_TABLE')
        }
    } catch (e: any) {
        console.error('ERROR:', e.message)
    }
}
main()
