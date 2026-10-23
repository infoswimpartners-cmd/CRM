// SwimPartners Quest（ERP & Gamification Dashboard）型定義
// 5大テーブル（Students, Coaches, Lessons_Transactions, Monthly_Finance, Quests_Achievements）および評価エンジンの型定義

export type StudentGrade = '未就学児' | '小学生' | '成人'

export type AreaTier = 'Tier1都心' | 'Tier2城南' | 'Tier3千葉城東' | 'サテライト'

export type PlanType =
    | '都度払い[フロー]'
    | '月2回[ストック]'
    | '月4回[ストック]'
    | 'スイムステップ城東小[固定スクール]'
    | '25m完泳保証[高単価パッケージ]'
    | 'スイムシッター[送迎付]'

export type FunnelStage =
    | 'LINE友だち追加未申込'
    | 'ステップ配信中(Day1/3/5)'
    | '日程調整・コーチ打診中'
    | '体験予約済'
    | '本契約継続中'
    | '休会・退会'

export type AcquisitionChannel = 'Google広告' | 'Meta広告' | '紹介' | '自然検索AIO'

export type AioArticleStatus = '未作成' | 'AI下書き済' | '公開済(AIO上位)'

// ① 顧客テーブル（Students / 既存拡張）
export interface QuestStudent {
    student_id: string
    student_number: string
    name: string
    grade: StudentGrade
    area_station: string
    area_tier: AreaTier
    plan_type: PlanType
    status: FunnelStage
    acquisition_channel: AcquisitionChannel
    swim_step_level: number // Lv.1 〜 Lv.20
    swim_step_rank?: SkillRank // SSS 〜 D
    swim_step_title: string // 例: "Lv.1 水慣れ", "Lv.8 クロール息継ぎ", "Lv.20 4泳法マスター"
    next_challenge: string // 次回レッスンの課題
    aio_status: AioArticleStatus
    cumulative_revenue: number // 累計決済額 = 実績LTV
    monthly_fee: number // 月額単価または都度単価
    retention_months: number // 継続月数
    assigned_coach_id: string
    assigned_coach_name: string
    is_tower_mansion_referral?: boolean // タワマン（WCT等）紹介フラグ
    is_pair_lesson?: boolean // ペアレッスンフラグ
}

export type CoachType =
    | 'Type A:都心主力'
    | 'Type B:平日キッズ'
    | 'Type C:土日集中'
    | 'Type D:千葉ローカル'

export type RewardRank = 'Standard' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

export interface GratitudeMessage {
    id: string
    student_name: string
    date: string
    rating: number
    comment: string
    exp_bonus: number
}

export type SkillRank = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D'

export interface SkillEvaluation {
    id: string
    name: string // 例: "【豪腕収益術】STR" / "【水恐怖心ゼロ化】"
    category: '経営・ギルド' | '指導・技術' | '成約・定着' | '機動・スピード' | 'ホスピタリティ' | '水泳進級'
    rank: SkillRank // SSS 〜 D
    score: number // 0 〜 100
    level: number // 1 〜 10
    currentValueLabel: string // 例: "月粗利 ¥982,000"
    nextThresholdLabel: string // 例: "SSS昇格まで あと¥68,000"
    abilityDescription: string // 発動アビリティ・効果
    badgeIcon: string
}

export interface CoachSkillNode {
    id: string
    name: string
    category: '指導技術' | '成約・定着' | 'スピード対応' | '専門スキル'
    rank?: SkillRank
    level: number
    max_level: number
    unlocked: boolean
    description: string
    bonusExpRate?: number
}

// ② コーチテーブル（Coaches / 新規・拡張）
export interface QuestCoach {
    coach_id: string
    name: string
    avatar_initials: string
    coach_type: CoachType
    home_station: string
    rpg_class?: string // RPGクラス・二つ名（例: "疾風のフォーム矯正士", "深海のクロージングマスター"）
    target_monthly_income: number // 希望月収目標
    current_month_lessons: number // 当月完遂コマ数
    reward_rank: RewardRank // Standard[50%] 〜 Platinum[70%]
    coach_exp: number // 累計獲得経験値
    coach_level: number // コーチLv
    trial_conversion_rate: number // 体験→本契約引き上げ率 (0.0 - 1.0)
    avg_satisfaction: number // 保護者アンケート満足度スコア (1.0 - 5.0)
    fast_pass_rate: number // 1時間以内即レス受託率 (0.0 - 1.0)
    is_ceo?: boolean // 代表自身かどうか
    gratitude_chest: GratitudeMessage[] // 感謝の宝箱コレクション
    skills: CoachSkillNode[] // スキルツリー
    evaluations?: SkillEvaluation[] // 各分野のスキルランク評価
}

// ③ レッスン＆収支トランザクション（Lessons_Transactions / 既存拡張）
export interface LessonTransaction {
    lesson_id: string
    date: string // YYYY-MM-DD
    year_month: string // YYYY-MM
    student_id: string
    student_name: string
    coach_id: string
    coach_name: string
    pool_facility: string
    area_tier: AreaTier
    revenue_type: 'stock' | 'flow' | 'fixed_school'
    plan_label: string
    revenue: number // 売上金額 (例: 6,000 / 9,000 / 6,500 / 10,000 / 13,000)
    coach_fee: number // コーチ支払報酬 (ランク連動自動計算 + 成約インセンティブ等)
    facility_transport_cost: number // 施設貸切費(ヤエスク4,950円等)・交通費実費
    stripe_fee: number // 決済手数料 3.6%
    is_ceo_operated: boolean // 代表自身が稼働したか
    gross_profit: number // 粗利 = 売上 - コーチ報酬 - 施設交通費
    assign_hours?: number // 申込から確定までの時間（時間単位）
    is_fast_pass?: boolean // 1時間以内即レス受託か
    is_trial_converted?: boolean // 初回体験から成約したか
}

// ④ 月次財務・投資管理テーブル（Monthly_Finance / 新規）
export interface MonthlyFinance {
    year_month: string // YYYY-MM
    flow_revenue: number // 都度・単発・体験売上
    stock_revenue: number // 月謝・サブスク・25m保証売上
    fixed_school_revenue: number // 城東小スイムステップ（固定スクール）売上
    total_revenue: number // 総売上高
    coach_cost_total: number // コーチ支払報酬合計
    facility_transport_total: number // 施設貸切費・交通費合計
    stripe_fee_total: number // Stripe決済手数料合計 (3.6%)
    ad_spend_google: number // Google広告費
    ad_spend_meta: number // Meta広告費
    system_tool_cost: number // LINE/サーバー/ツール固定費
    insurance_cost: number // 賠責保険等
    ceo_operated_hours: number // 代表実働時間
    ceo_shadow_cost: number // 代表実働の仮想人件費 (代表稼働時間 × 時給3,500円)
    safe_reserve_cash: number // 生活防衛・安全確保資金
    total_cash_balance: number // 現在の総保有キャッシュ
    investable_cash: number // 自己資金投資可能枠 (総キャッシュ - 安全防衛資金)
    new_customers_count: number // 当月新規獲得顧客数
    line_friends_added: number // 当月LINE友だち追加数
    joto_friday_enrolled: number // 城東小金曜枠の現在在籍数
    joto_friday_capacity: number // 城東小金曜枠の目標定員
}

// ⑤ ゲーミフィケーション・クエスト定義テーブル（Quests_Achievements / 新規）
export type QuestTargetRole = 'CEO' | 'Coach'
export type QuestFrequencyType = 'Daily' | 'Weekly' | 'Monthly' | 'Milestone'

export interface QuestAchievement {
    quest_id: string
    target_role: QuestTargetRole
    quest_type: QuestFrequencyType
    title: string
    description: string
    condition_metric: string
    current_value: number
    threshold: number
    unit: string
    reward_exp: number
    reward_Label?: string
    badge_icon: string
    is_main_quest?: boolean
    completed: boolean
}

// ファストパス・クエストボード用（緊急受託案件）
export interface FastPassLeadQuest {
    lead_id: string
    student_label: string // 例: "港区・小2男児（水慣れ〜バタ足）"
    area_tier: AreaTier
    pool_facility: string
    preferred_datetime: string
    plan_interest: PlanType
    estimated_reward: number // 例: 4,500円
    fast_pass_exp: number // 例: +50 EXP
    conversion_bonus_exp: number // 例: +500 EXP
    conversion_incentive: number // 例: +3,000円
    time_remaining_minutes: number // ファストパス期限残り分数
    matching_coach_types: CoachType[]
    accepted_by_coach_id?: string | null
}

// 6軸経営ステータス（6角形レーダーチャート用）
export interface SixAxisRadarScore {
    axis: string
    code: 'STR' | 'VIT' | 'AGI' | 'INT' | 'DEX' | 'LUK'
    score: number // 0 - 100
    rank: SkillRank // SSS 〜 D
    fullMark: number
    rawValueLabel: string
    targetLabel: string
    description: string
    abilityName: string // 発動スキル名（例: "豪腕収益術", "鉄壁ストック術"）
}

// エリア別・施設別ROIマトリクス行
export interface AreaRoiItem {
    area_name: string
    area_tier: AreaTier
    main_facilities: string
    lesson_count: number
    total_revenue: number
    avg_transport_facility_cost: number
    total_gross_profit: number
    gross_margin_rate: number // %
    roi_rank: 'S (最重点投資)' | 'A (高収益)' | 'B (安定)' | 'C (要改善)'
}
