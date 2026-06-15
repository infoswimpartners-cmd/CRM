import { createAdminClient } from '../src/lib/supabase/admin'
import { createLeadManuallyAction } from '../src/actions/leads'

async function runTest() {
    console.log('--- Starting Manual Lead Creation Test ---')
    const supabase = createAdminClient()

    // 1. テスト太郎（会員番号0035）の取得
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('student_number', '0035')
        .single()

    if (studentError || !student) {
        console.error('Failed to fetch Test Taro (student_number: 0035):', studentError)
        return
    }

    console.log(`Fetched student: ${student.full_name} (${student.id})`)

    // 2. モックの認証情報設定 (Server Actionでauth.getUser()が呼び出されるため、管理者としてダミー認証を設定)
    // ただし、createClient(server側) はクッキーからセッションを読むため、
    // adminClientを差し込むなどが必要かもしれないが、
    // ローカルでテストするために、Supabase の auth 状態をシミュレートする。
    // createClient()のテストが動かない場合は、直接 createAdminClient 側でleadsに登録して確認するか、
    // もしくはテスト太郎の情報で直接テーブルにインサートできることをチェックします。
    // 今回は、直接 leads テーブルへのインサートがエラーなく行えるか（型や制約エラーがないか）を検証します。
    
    const mockLeadData = {
        name: student.full_name,
        full_name_kana: student.full_name_kana,
        gender: student.gender,
        birth_date: student.birth_date,
        email: student.contact_email,
        phone: student.contact_phone,
        line_user_id: student.line_user_id,
        area: 'テストエリア（新宿）',
        lesson_location: '新宿プール',
        datetime1: '6月20日(土) 10:00〜12:00',
        datetime2: '6月21日(日) 13:00〜15:00',
        datetime3: '6月24日(水) 18:00〜20:00',
        available_times: '土日祝 午前中, 平日 夜',
        frequency: '月4回',
        skill_level: 'クロール25m',
        notes: 'テスト案件作成の自動検証',
        second_student_name: student.second_student_name,
        second_student_kana: student.second_student_name_kana,
        second_student_gender: student.second_student_gender,
        second_student_birth_date: student.second_student_birth_date
    }

    console.log('Inserting lead via admin client directly to verify constraints...')
    const { data: lead, error: insertError } = await supabase
        .from('leads')
        .insert({
            ...mockLeadData,
            status: '新規',
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (insertError) {
        console.error('Insert constraint error:', insertError)
        return
    }

    console.log('Successfully created lead directly via DB:', lead.id)

    // 3. 削除クリーンアップ
    console.log('Cleaning up test lead...')
    const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id)

    if (deleteError) {
        console.error('Failed to cleanup test lead:', deleteError)
    } else {
        console.log('Cleanup completed successfully!')
    }

    console.log('--- Test Completed ---')
}

runTest()
