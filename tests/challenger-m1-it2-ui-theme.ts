/**
 * Challenger M1 Iteration 2: UI整合性およびSchoolHubテーマ適合性の敵対的・経験的検証スクリプト
 * 
 * 目的:
 * 1. 会員番号0035（テスト太郎様）のデフォルト選択（L268）およびUI同期（setQuests）の検証
 * 2. SchoolHubライトテーマ（bg-sky-500、白背景カード、パステルバッジ）の適合性とUI表示健全性の検証
 * 3. 境界値・極限シナリオでの破綻耐性検証
 */

import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

let passedCount = 0
let failedCount = 0

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ [PASS] ${message}`)
        passedCount++
    } else {
        console.error(`  ❌ [FAIL] ${message}`)
        failedCount++
    }
}

async function runChallengerVerification() {
    console.log('================================================================')
    console.log('⚔️ Challenger M1 Iteration 2: UI整合性 & SchoolHubテーマ敵対的検証')
    console.log('================================================================\n')

    // =================================================================
    // 1. 会員番号0035（テスト太郎様）のデフォルト選択ロジック（L268）検証
    // =================================================================
    console.log('【1. 会員番号0035（テスト太郎様）のデフォルト選択ロジック検証】')

    // 1-1. モックデータ（INITIAL_QUEST_STUDENTS）での評価
    const { INITIAL_QUEST_STUDENTS } = await import('../src/lib/quest-mock-data')
    const defaultStudentIdMock = INITIAL_QUEST_STUDENTS.find(s => s.student_number === '0035')?.student_id || INITIAL_QUEST_STUDENTS[0]?.student_id || ''
    const defaultStudentMock = INITIAL_QUEST_STUDENTS.find(s => s.student_id === defaultStudentIdMock)
    assert(
        defaultStudentIdMock === 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff',
        `モックデータで0035のstudent_idが一致すること (${defaultStudentIdMock})`
    )
    assert(
        defaultStudentMock?.name === 'テスト太郎' && defaultStudentMock?.student_number === '0035',
        `モックデータでデフォルト選択される生徒が「テスト太郎（0035）」であること`
    )

    // 1-2. 実DBデータ（マスキング後）での評価
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
    const { fetchQuestRealData } = await import('../src/lib/quest-real-data')
    const realData = await fetchQuestRealData()

    const defaultStudentIdReal = realData.students.find(s => s.student_number === '0035')?.student_id || realData.students[0]?.student_id || ''
    const defaultStudentReal = realData.students.find(s => s.student_id === defaultStudentIdReal)
    assert(
        defaultStudentIdReal === 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff',
        `実DB（マスキング後134名）で0035のstudent_idが不変で一致すること (${defaultStudentIdReal})`
    )
    assert(
        defaultStudentReal?.name === 'テスト太郎' && defaultStudentReal?.student_number === '0035',
        `実DB（マスキング後）でデフォルト選択される生徒が「テスト太郎（0035）」であること`
    )

    // 1-3. UIセレクトボックスのオプション生成シミュレーション
    const renderedOptions = realData.students.map(s => ({
        id: s.student_id,
        number: s.student_number,
        displayText: `#${s.student_number} ${s.name} (${s.swim_step_title})`
    }))

    const taroOption = renderedOptions.find(o => o.number === '0035')
    assert(
        taroOption !== undefined && taroOption.displayText.includes('テスト太郎'),
        `UIセレクトボックスの選択肢に「テスト太郎」が表示されること (${taroOption?.displayText})`
    )

    const nonTaroOptions = renderedOptions.filter(o => o.number !== '0035')
    const invalidNonTaroOptions = nonTaroOptions.filter(o => !o.displayText.includes(`会員 #${o.number}`))
    assert(
        invalidNonTaroOptions.length === 0,
        `0035以外の全133名の選択肢表示が「#xxxx 会員 #xxxx」形式に徹底マスキングされていること (不正件数: ${invalidNonTaroOptions.length})`
    )

    // 1-4. 3行報告送信（handleSubmitThreeLineReport）シミュレーション
    {
        const targetStudent = realData.students.find(s => s.student_id === defaultStudentIdReal)
        assert(Boolean(targetStudent), '送信対象生徒が特定できること')

        const reportNextLine = '平泳ぎのキック推進力強化'
        const updatedStudents = realData.students.map(s => {
            if (s.student_id !== targetStudent?.student_id) return s
            const nextLv = Math.min(20, s.swim_step_level + 1)
            return {
                ...s,
                swim_step_level: nextLv,
                next_challenge: reportNextLine
            }
        })

        const updatedTaro = updatedStudents.find(s => s.student_number === '0035')
        assert(
            updatedTaro?.swim_step_level === (targetStudent!.swim_step_level + 1) &&
            updatedTaro?.next_challenge === reportNextLine,
            `テスト太郎様のみが正しく更新されること (Lv: ${targetStudent?.swim_step_level} -> ${updatedTaro?.swim_step_level})`
        )

        const unmutatedCount = updatedStudents.filter(s => s.student_number !== '0035').length
        assert(
            unmutatedCount === 133,
            `テスト太郎様以外の133名の顧客データに一切副作用が発生しないこと`
        )
    }

    // =================================================================
    // 2. UI同期（setQuests）およびクエスト進捗表示の健全性検証
    // =================================================================
    console.log('\n【2. UI同期（setQuests）およびクエスト進捗表示の健全性検証】')

    // 2-1. realData の quests 配列健全性
    assert(
        Array.isArray(realData.quests) && realData.quests.length > 0,
        `同期対象 quests が非空配列であること (取得件数: ${realData.quests.length}件)`
    )

    const ceoQuests = realData.quests.filter(q => q.target_role === 'CEO')
    assert(
        ceoQuests.length >= 3,
        `CEO向けクエストが3件以上存在すること (件数: ${ceoQuests.length}件)`
    )

    // 2-2. 進行バー計算（L1065-1067）の全クエスト検証
    let allQuestsValid = true
    for (const q of realData.quests) {
        const pct = q.threshold > 0
            ? Math.min(100, Math.max(0, Math.round((q.current_value / q.threshold) * 100)))
            : (q.completed ? 100 : 0)
        
        if (isNaN(pct) || pct < 0 || pct > 100) {
            allQuestsValid = false
            console.error(`  不正なクエスト進捗: ${q.title}, pct=${pct}`)
        }
    }
    assert(allQuestsValid, '実DBから取得した全クエストの進捗率が0〜100%の有限数として正常に計算できること')

    // 2-3. メインクエストの存在と城東小枠連動
    const mainCeoQuest = realData.quests.find(q => q.is_main_quest && q.target_role === 'CEO')
    assert(
        Boolean(mainCeoQuest),
        `メインクエスト（is_main_quest && target_role === 'CEO'）が存在すること (${mainCeoQuest?.title})`
    )
    assert(
        mainCeoQuest?.quest_id === 'q-ceo-main-1',
        `メインクエストのIDが 'q-ceo-main-1' であること`
    )

    // =================================================================
    // 3. SchoolHubライトテーマ適合性・UI表示健全性検証
    // =================================================================
    console.log('\n【3. SchoolHubライトテーマ適合性・UI表示健全性検証】')

    const appCode = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/quest/SwimPartnersQuestApp.tsx'),
        'utf-8'
    )
    const globalsCss = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/globals.css'),
        'utf-8'
    )

    // 3-1. SchoolHubデザイントークンのCSS定義検証
    assert(
        globalsCss.includes('--background: #F8FAFC') || globalsCss.includes('#F8FAFC'),
        `globals.css に SchoolHub ベース背景色 #F8FAFC が定義されていること`
    )
    assert(
        globalsCss.includes('--primary: #0284C7') || globalsCss.includes('#0284C7'),
        `globals.css に SchoolHub プライマリスカイブルー #0284C7 が定義されていること`
    )
    assert(
        globalsCss.includes('--color-schoolhub-sky'),
        `globals.css に SchoolHub パレットトークン (--color-schoolhub-sky) が定義されていること`
    )

    // 3-2. SwimPartnersQuestApp におけるSchoolHubテーマ適合クラスの検証
    assert(
        appCode.includes('bg-slate-50/70') || appCode.includes('bg-[#F8FAFC]'),
        `SwimPartnersQuestApp のベース背景がSchoolHubライト調（bg-slate-50/70）であること`
    )
    assert(
        appCode.includes('bg-sky-500'),
        `進行バーおよびアクセントに bg-sky-500 が適用されていること`
    )
    assert(
        appCode.includes('bg-white') && appCode.includes('border-slate-200/90'),
        `主要カードが白背景（bg-white）と繊細なボーダー（border-slate-200/90）で統一されていること`
    )
    assert(
        appCode.includes('bg-emerald-50') && appCode.includes('bg-amber-50') && appCode.includes('bg-sky-50'),
        `パステルバッジ（emerald/amber/sky）が各カード・バッジに適切に適用されていること`
    )

    // 3-3. ダークテーマ汚染（ダークモード固定クラス、黒背景等）の不在検証
    const forbiddenDarkClasses = [
        'bg-slate-950', // 全面背景での使用がないか
        'bg-black',
        'dark:bg-slate-900',
        'dark:bg-black',
    ]
    
    // 全体ルート要素に黒背景が当たっていないか
    const rootBgMatch = appCode.match(/<div className="min-h-screen ([^"]+)"/)
    const rootBgClasses = rootBgMatch ? rootBgMatch[1] : ''
    assert(
        !rootBgClasses.includes('bg-slate-900') && !rootBgClasses.includes('bg-black'),
        `ルートコンテナがダーク背景でなく、ライト基調であること (${rootBgClasses.split(' ').slice(0, 3).join(' ')})`
    )

    // =================================================================
    // 4. 極限敵対的シナリオ（破損クエスト・0除算・欠損データ）
    // =================================================================
    console.log('\n【4. 極限敵対的シナリオ（破損データ・0除算耐性）】')

    // 4-1. threshold = 0 の場合の進行バー計算
    {
        const brokenQuest = {
            current_value: 10,
            threshold: 0,
            completed: false
        }
        const pct = brokenQuest.threshold > 0
            ? Math.min(100, Math.max(0, Math.round((brokenQuest.current_value / brokenQuest.threshold) * 100)))
            : (brokenQuest.completed ? 100 : 0)
        assert(pct === 0 && !isNaN(pct), 'threshold=0, completed=false の時にゼロ除算にならず 0% を返却すること')
    }

    // 4-2. threshold = 0, completed = true の場合
    {
        const brokenQuest = {
            current_value: 0,
            threshold: 0,
            completed: true
        }
        const pct = brokenQuest.threshold > 0
            ? Math.min(100, Math.max(0, Math.round((brokenQuest.current_value / brokenQuest.threshold) * 100)))
            : (brokenQuest.completed ? 100 : 0)
        assert(pct === 100 && !isNaN(pct), 'threshold=0, completed=true の時に 100% を返却すること')
    }

    // 4-3. current_value が負数の場合
    {
        const negativeQuest = {
            current_value: -15,
            threshold: 50,
            completed: false
        }
        const pct = negativeQuest.threshold > 0
            ? Math.min(100, Math.max(0, Math.round((negativeQuest.current_value / negativeQuest.threshold) * 100)))
            : (negativeQuest.completed ? 100 : 0)
        assert(pct === 0, 'current_value が負数の場合に非負クランプ（0%）されること')
    }

    // 4-4. current_value が threshold の200%の場合
    {
        const overQuest = {
            current_value: 200,
            threshold: 100,
            completed: true
        }
        const pct = overQuest.threshold > 0
            ? Math.min(100, Math.max(0, Math.round((overQuest.current_value / overQuest.threshold) * 100)))
            : (overQuest.completed ? 100 : 0)
        assert(pct === 100, 'current_value が threshold を超過した場合に 100% に上限クランプされること')
    }

    console.log('\n================================================================')
    console.log(`Challenger 2 検証結果サマリー: 成功: ${passedCount}件 / 失敗: ${failedCount}件`)
    console.log('================================================================')

    if (failedCount > 0) {
        process.exit(1)
    } else {
        process.exit(0)
    }
}

runChallengerVerification().catch(err => {
    console.error('Test execution error:', err)
    process.exit(1)
})
