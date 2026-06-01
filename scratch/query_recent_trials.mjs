import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function inspect() {
  console.log('--- 1. 直近の体験レッスンマスタの取得 ---')
  const { data: trialMasters, error: masterError } = await supabase
    .from('lesson_masters')
    .select('id, name, is_trial')
    .eq('is_trial', true)

  if (masterError) {
    console.error('Error fetching lesson masters:', masterError)
    return
  }
  console.log('体験レッスンマスタ:', trialMasters)

  const masterIds = trialMasters.map(m => m.id)

  console.log('\n--- 2. 直近のレッスン報告（体験レッスン優先） ---')
  const { data: recentLessons, error: lessonError } = await supabase
    .from('lessons')
    .select('id, created_at, student_id, student_name, lesson_master_id, lesson_date, price')
    .order('created_at', { ascending: false })
    .limit(10)

  if (lessonError) {
    console.error('Error fetching recent lessons:', lessonError)
    return
  }

  for (const lesson of recentLessons) {
    const isTrial = masterIds.includes(lesson.lesson_master_id)
    console.log(
      `ID: ${lesson.id} | 日時: ${lesson.lesson_date} | 生徒: ${lesson.student_name} (${lesson.student_id}) | マスタID: ${lesson.lesson_master_id} | 体験判定: ${isTrial ? '★体験' : '通常'}`
    )

    if (lesson.student_id) {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, status, line_user_id')
        .eq('id', lesson.student_id)
        .single()

      if (studentError) {
        console.error(`  Error fetching student (${lesson.student_id}):`, studentError.message)
      } else {
        console.log(`  -> 生徒ステータス: ${student.status} | LINE ID: ${student.line_user_id ? 'あり' : 'なし'}`)
      }
    }
  }
}

inspect()
