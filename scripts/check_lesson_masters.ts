
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: lessonMasters, error } = await supabase
        .from('lesson_masters')
        .select('*')

    if (error) {
        console.error(error)
        return
    }

    console.log(JSON.stringify(lessonMasters, null, 2))
}

main()
