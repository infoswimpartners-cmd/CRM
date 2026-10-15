/**
 * 会員プラン名および設定から月間レッスン上限と繰越上限を判定・正規化する共通ユーティリティ
 */

export interface MembershipLimits {
    limit: number
    maxRollover: number
}

/**
 * 会員情報オブジェクトから安全に月間上限回数と繰越上限回数を正規化します。
 * 全角数字（例: 月２回）や多桁回数表記（例: 全12回、全24回）にも堅牢に対応します。
 */
export function normalizeMembershipLimits(membership: any): MembershipLimits {
    const limit = membership?.monthly_lesson_limit ?? 0
    const maxRollover = membership?.max_rollover_limit ?? 0
    const rawName = membership?.name || ''
    // 全角英数字を半角に正規化
    const normName = rawName.normalize('NFKC')
    const isPackage = !!membership?.is_package

    if (isPackage || normName.includes('単発')) {
        return { limit: 0, maxRollover: 0 }
    }
    // 月2回 / 2回 (12回, 24回, 32回などの多桁を除外)
    if (/(?:^|[^0-9])(?:月?2回)/.test(normName)) {
        return { limit: 2, maxRollover: 1 }
    }
    // 月4回 / 4回 (14回, 24回などの多桁を除外)
    if (/(?:^|[^0-9])(?:月?4回)/.test(normName)) {
        return { limit: 4, maxRollover: 2 }
    }

    // プラン名に回数が含まれない場合でも、DBの月上限が2または4であれば繰越上限を安全に制限
    if (limit === 2) {
        return { limit: 2, maxRollover: maxRollover > 0 ? Math.min(maxRollover, 1) : 1 }
    }
    if (limit === 4) {
        return { limit: 4, maxRollover: maxRollover > 0 ? Math.min(maxRollover, 2) : 2 }
    }

    return { limit, maxRollover }
}

/**
 * プラン名や既存設定値から月間上限回数と繰越上限回数を推論・設定します。
 */
export function inferMembershipLimits(
    name: string,
    isPackage: boolean = false,
    existingMonthlyLimit?: number | null,
    existingMaxRollover?: number | null
): { monthlyLessonLimit: number; maxRolloverLimit: number } {
    const normName = (name || '').normalize('NFKC')

    if (isPackage || normName.includes('単発')) {
        return { monthlyLessonLimit: 0, maxRolloverLimit: 0 }
    }
    // 月2回 / 2回 (12回, 24回, 32回などの多桁を除外)
    if (/(?:^|[^0-9])(?:月?2回)/.test(normName)) {
        return { monthlyLessonLimit: 2, maxRolloverLimit: 1 }
    }
    // 月4回 / 4回 (14回, 24回などの多桁を除外)
    if (/(?:^|[^0-9])(?:月?4回)/.test(normName)) {
        return { monthlyLessonLimit: 4, maxRolloverLimit: 2 }
    }

    // プラン名に回数が含まれない場合、既存値があればそれを安全に保持
    if (existingMonthlyLimit !== undefined && existingMonthlyLimit !== null && existingMonthlyLimit > 0) {
        return {
            monthlyLessonLimit: existingMonthlyLimit,
            maxRolloverLimit: existingMaxRollover ?? (existingMonthlyLimit === 2 ? 1 : existingMonthlyLimit === 4 ? 2 : 0)
        }
    }

    return { monthlyLessonLimit: 0, maxRolloverLimit: 0 }
}
