/**
 * Challenger M1 Iteration 2: 顧客データマスキング徹底漏洩監査スクリプト
 * 
 * 目的:
 * 実DB取得時およびフォールバック（テストデータ）取得時において、
 * 会員番号0035（テスト太郎様）以外の生徒名・メモ・レッスン履歴・リード問い合わせに
 * 平文露出が1件もないか（漏洩ゼロ）を敵対的に検証する。
 */

import * as dotenv from 'dotenv'
import path from 'path'

interface LeakItem {
    source: string
    type: string
    id: string
    studentNumber?: string
    exposedValue: string
    reason: string
}

async function auditMasking() {
    console.log('================================================================')
    console.log('🕵️‍♂️ Challenger 顧客データマスキング徹底漏洩監査開始')
    console.log('================================================================\n')

    const leaks: LeakItem[] = []

    // -------------------------------------------------------------
    // 検証A: フォールバック（テストデータ / 環境変数未設定環境）
    // -------------------------------------------------------------
    console.log('【監査A: フォールバック時（テストデータ環境）の検証】')
    // process.env を一時クリア
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const origAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // モジュール再インポート
    const { fetchQuestRealData } = await import('../src/lib/quest-real-data')
    const fallbackData = await fetchQuestRealData()

    console.log(`フォールバック生徒数: ${fallbackData.students.length}`)
    console.log(`フォールバックレッスン数: ${fallbackData.transactions.length}`)
    console.log(`フォールバックリード数: ${fallbackData.fastPassQuests.length}`)

    for (const s of fallbackData.students) {
        const is0035 = s.student_number === '0035' || (s.name && s.name.includes('テスト太郎'))
        if (!is0035) {
            // 0035以外なのに平文の名前が出ているか判定
            if (!s.name.startsWith('会員 #') && s.name !== '受講生徒') {
                leaks.push({
                    source: 'fallbackData.students',
                    type: '生徒名平文露出',
                    id: s.student_id,
                    studentNumber: s.student_number,
                    exposedValue: s.name,
                    reason: `会員番号0035以外の生徒名が平文表示: "${s.name}"`
                })
            }
            // 課題メモに具体的固有メモが出ていないか判定
            if (!s.next_challenge.endsWith('の反復安定化とフォーム意識の定着')) {
                leaks.push({
                    source: 'fallbackData.students',
                    type: '個別メモ平文露出',
                    id: s.student_id,
                    studentNumber: s.student_number,
                    exposedValue: s.next_challenge,
                    reason: `会員番号0035以外の個別メモが平文表示: "${s.next_challenge}"`
                })
            }
        }
    }

    for (const t of fallbackData.transactions) {
        const is0035 = t.student_name.includes('テスト太郎') || t.student_name.includes('0035')
        if (!is0035) {
            if (!t.student_name.startsWith('会員 #') && t.student_name !== '受講生徒') {
                leaks.push({
                    source: 'fallbackData.transactions',
                    type: 'レッスン受講者名平文露出',
                    id: t.lesson_id,
                    exposedValue: t.student_name,
                    reason: `会員番号0035以外のレッスン受講生徒名が平文表示: "${t.student_name}"`
                })
            }
        }
    }

    for (const q of fallbackData.fastPassQuests) {
        const is0035 = q.student_label.includes('テスト太郎') || q.student_label.includes('0035')
        if (!is0035) {
            if (!q.student_label.startsWith('新規問合せ生 #')) {
                leaks.push({
                    source: 'fallbackData.fastPassQuests',
                    type: 'リード問い合わせ者名平文露出',
                    id: q.lead_id,
                    exposedValue: q.student_label,
                    reason: `会員番号0035以外のリード問い合わせ者名が平文表示: "${q.student_label}"`
                })
            }
        }
    }

    // -------------------------------------------------------------
    // 検証B: 実DB環境（.env.local ロード）
    // -------------------------------------------------------------
    console.log('\n【監査B: 実DB環境（.env.local ロード時）の検証】')
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
    const liveData = await fetchQuestRealData()

    console.log(`実DB生徒数: ${liveData.students.length}`)
    console.log(`実DBレッスン履歴数: ${liveData.transactions.length}`)
    console.log(`実DBリード数: ${liveData.fastPassQuests.length}`)

    for (const s of liveData.students) {
        const is0035 = s.student_number === '0035' || (s.name && s.name.includes('テスト太郎'))
        if (!is0035) {
            if (!s.name.startsWith('会員 #') && s.name !== '受講生徒') {
                leaks.push({
                    source: 'liveData.students',
                    type: '生徒名平文露出',
                    id: s.student_id,
                    studentNumber: s.student_number,
                    exposedValue: s.name,
                    reason: `会員番号0035以外の生徒名が平文表示: "${s.name}"`
                })
            }
            if (!s.next_challenge.endsWith('の反復安定化とフォーム意識の定着')) {
                leaks.push({
                    source: 'liveData.students',
                    type: '個別メモ平文露出',
                    id: s.student_id,
                    studentNumber: s.student_number,
                    exposedValue: s.next_challenge,
                    reason: `会員番号0035以外の個別メモが平文表示: "${s.next_challenge}"`
                })
            }
        } else {
            // テスト太郎様であることの確認
            if (s.student_number !== '0035' && !s.name.includes('テスト太郎')) {
                leaks.push({
                    source: 'liveData.students',
                    type: 'テスト顧客データ不整合',
                    id: s.student_id,
                    exposedValue: s.name,
                    reason: '0035判定されたがテスト太郎の名前でない'
                })
            }
        }
    }

    for (const t of liveData.transactions) {
        const is0035 = t.student_name.includes('テスト太郎') || t.student_name.includes('0035')
        if (!is0035) {
            if (!t.student_name.startsWith('会員 #') && t.student_name !== '受講生徒') {
                leaks.push({
                    source: 'liveData.transactions',
                    type: 'レッスン受講者名平文露出',
                    id: t.lesson_id,
                    exposedValue: t.student_name,
                    reason: `会員番号0035以外のレッスン受講生徒名が平文表示: "${t.student_name}"`
                })
            }
        }
    }

    for (const q of liveData.fastPassQuests) {
        const is0035 = q.student_label.includes('テスト太郎') || q.student_label.includes('0035')
        if (!is0035) {
            if (!q.student_label.startsWith('新規問合せ生 #')) {
                leaks.push({
                    source: 'liveData.fastPassQuests',
                    type: 'リード問い合わせ者名平文露出',
                    id: q.lead_id,
                    exposedValue: q.student_label,
                    reason: `会員番号0035以外のリード問い合わせ者名が平文表示: "${q.student_label}"`
                })
            }
        }
    }

    // コーチ側の感謝チェスト（gratitude_chest）に漏洩がないか
    for (const c of liveData.coaches) {
        for (const g of (c.gratitude_chest || [])) {
            const is0035 = g.student_name.includes('テスト太郎') || g.student_name.includes('0035')
            if (!is0035) {
                leaks.push({
                    source: 'liveData.coaches.gratitude_chest',
                    type: '保護者・生徒名平文露出',
                    id: g.id,
                    exposedValue: g.student_name,
                    reason: `0035テスト太郎様以外の生徒・保護者名が露出: "${g.student_name}"`
                })
            }
        }
    }

    // クエスト一覧に他顧客名が含まれていないか
    for (const quest of liveData.quests) {
        const text = `${quest.title} ${quest.description}`
        // 一般的な生徒名パターンや0035以外の名前がないか
        // 会員番号0035テスト太郎以外の人名が混入していないか
        const words = ['佐藤', '高橋', '渡辺', '山本', '中村', '小松', '大木', '難波', '森本']
        for (const w of words) {
            if (text.includes(w)) {
                leaks.push({
                    source: 'liveData.quests',
                    type: 'クエスト文面での顧客名露出',
                    id: quest.quest_id,
                    exposedValue: text,
                    reason: `クエスト文面に顧客名「${w}」が含まれている`
                })
            }
        }
    }

    console.log('\n================================================================')
    console.log(`監査結果サマリー: 検出漏洩件数: ${leaks.length}件`)
    console.log('================================================================')

    if (leaks.length > 0) {
        console.error('\n🚨 以下の情報漏洩・未マスキングが検出されました:')
        leaks.forEach((l, idx) => {
            console.error(`[#${idx + 1}] ソース: ${l.source} | 種別: ${l.type} | 値: "${l.exposedValue}"`)
            console.error(`    理由: ${l.reason}`)
        })
        process.exit(1)
    } else {
        console.log('\n✅ 完璧です！会員番号0035（テスト太郎様）以外の顧客情報の露出は0件（完全保護）でした。')
        process.exit(0)
    }
}

auditMasking().catch(err => {
    console.error('Audit crashed:', err)
    process.exit(1)
})
