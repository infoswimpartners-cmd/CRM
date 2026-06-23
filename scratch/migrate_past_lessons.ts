import { createClient } from '@supabase/supabase-js'
import { getCalculatedLessonAmounts } from '../src/actions/report'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function migrate() {
    console.log('過去のレッスン報告データの一括再計算を開始します...')

    // 1. 全レッスンレコードを取得
    const { data: lessons, error } = await supabaseAdmin
        .from('lessons')
        .select('id, coach_id, student_id, lesson_master_id, lesson_date, location, attendance_type, student_name')

    if (error) {
        console.error('レッスンデータの取得に失敗しました:', error)
        return
    }

    console.log(`取得件数: ${lessons.length}件`)

    let successCount = 0
    let failCount = 0

    for (const lesson of lessons) {
        try {
            // 2. 新しいロジックで再計算
            const amounts = await getCalculatedLessonAmounts(
                supabaseAdmin,
                lesson.coach_id,
                lesson.student_id,
                lesson.lesson_master_id,
                lesson.lesson_date,
                lesson.location,
                lesson.attendance_type || 'both'
            )

            // 3. DBを更新
            const { error: updateError } = await supabaseAdmin
                .from('lessons')
                .update({
                    base_price: amounts.base_price,
                    base_reward: amounts.base_reward,
                    facility_id: amounts.facility_id,
                    is_actual_distant_option: amounts.is_actual_distant_option
                })
                .eq('id', lesson.id)

            if (updateError) {
                console.error(`ID ${lesson.id} (${lesson.student_name}) の更新に失敗しました:`, updateError)
                failCount++
            } else {
                successCount++
            }
        } catch (e: any) {
            console.error(`ID ${lesson.id} (${lesson.student_name}) の計算中にエラーが発生しました:`, e.message)
            failCount++
        }
    }

    console.log(`一括再計算が完了しました。成功: ${successCount}件, 失敗: ${failCount}件`)
}

migrate()
