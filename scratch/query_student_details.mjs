import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function inspectMaeda() {
  console.log('--- 前田鈴 様の生徒情報 ---')
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', '9921c471-1952-493a-a3c7-88ef49c17441')
    .single()

  if (studentError) {
    console.error('Error fetching student:', studentError)
    return
  }
  console.log(JSON.stringify(student, null, 2))

  console.log('\n--- 前田鈴 様のレッスン報告履歴 ---')
  const { data: lessons, error: lessonError } = await supabase
    .from('lessons')
    .select('id, created_at, coach_id, lesson_date, price, menu_description, location')
    .eq('student_id', '9921c471-1952-493a-a3c7-88ef49c17441')
    .order('created_at', { ascending: false })

  if (lessonError) {
    console.error('Error fetching lessons:', lessonError)
    return
  }
  console.log(JSON.stringify(lessons, null, 2))
}

inspectMaeda()
