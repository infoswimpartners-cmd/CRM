import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const LOCAL_API_URL = 'http://localhost:3000/api/webhooks/onboarding'

async function runTest() {
    console.log("=== Onboarding Webhook Test ===")

    // テスト用のユニークなメールアドレス
    const emailA = `test_single_${Math.floor(Math.random() * 10000)}@example.com`
    const emailB = `test_pair_${Math.floor(Math.random() * 10000)}@example.com`

    // --- テストケースA: 1名申し込み ---
    console.log("\n[Test Case A] 1名申し込み（2人目なし）")
    const payloadA = {
        name: 'テスト単身太郎',
        kana: 'テストタンシンタロウ',
        email: emailA,
        phone: '090-1111-2222',
        birth_date: '1995-05-05',
        gender: '男性',
        type: 'trial',
        message: '1名での体験レッスン申し込みテストです'
    }

    try {
        const resA = await fetch(LOCAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadA)
        })

        if (!resA.ok) {
            const errText = await resA.text()
            throw new Error(`Webhook POST failed: ${resA.status} - ${errText}`)
        }

        const dataA = await resA.json()
        console.log("Response:", dataA)

        if (dataA.success && dataA.studentId) {
            // DBの値を確認
            const { data: student, error } = await supabase
                .from('students')
                .select('id, full_name, apply_pair_membership_fee, apply_pair_pricing, second_student_name')
                .eq('id', dataA.studentId)
                .single()

            if (error) throw error
            console.log("Created Student in DB:")
            console.log(JSON.stringify(student, null, 2))

            // アサーション
            if (student.apply_pair_membership_fee === false && student.apply_pair_pricing === false) {
                console.log("✅ SUCCESS: 1名申し込み時はペアトグルが正しく両方とも false になっています。")
            } else {
                console.error("❌ FAILED: 1名申し込みですがペアトグルが true になっています。")
            }

            // クリーンアップ
            await supabase.from('students').delete().eq('id', student.id)
            console.log("Cleaned up student A.")
        }
    } catch (err) {
        console.error("Test Case A Error:", err)
    }

    // --- テストケースB: 2名申し込み ---
    console.log("\n[Test Case B] 2名同時申し込み（2人目あり）")
    const payloadB = {
        name: 'テスト主太郎',
        kana: 'テストヌシタロウ',
        email: emailB,
        phone: '090-3333-4444',
        birth_date: '1990-10-10',
        gender: '男性',
        type: 'trial',
        second_name: 'テスト相棒花子',
        second_name_kana: 'テストアイボウハナコ',
        second_student_birth_date: '1992-12-12',
        second_student_gender: '女性',
        message: '2名での体験レッスン申し込みテストです'
    }

    try {
        const resB = await fetch(LOCAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadB)
        })

        if (!resB.ok) {
            const errText = await resB.text()
            throw new Error(`Webhook POST failed: ${resB.status} - ${errText}`)
        }

        const dataB = await resB.json()
        console.log("Response:", dataB)

        if (dataB.success && dataB.studentId) {
            // DBの値を確認
            const { data: student, error } = await supabase
                .from('students')
                .select('id, full_name, apply_pair_membership_fee, apply_pair_pricing, second_student_name')
                .eq('id', dataB.studentId)
                .single()

            if (error) throw error
            console.log("Created Student in DB:")
            console.log(JSON.stringify(student, null, 2))

            // アサーション
            if (student.apply_pair_membership_fee === true && student.apply_pair_pricing === true && student.second_student_name === 'テスト相棒花子') {
                console.log("✅ SUCCESS: 2名申し込み時はペアトグルが正しく両方とも true になっています。")
            } else {
                console.error("❌ FAILED: 2名申し込みですがペアトグルが正しく設定されていません。")
            }

            // クリーンアップ
            await supabase.from('students').delete().eq('id', student.id)
            console.log("Cleaned up student B.")
        }
    } catch (err) {
        console.error("Test Case B Error:", err)
    }
}

runTest()
