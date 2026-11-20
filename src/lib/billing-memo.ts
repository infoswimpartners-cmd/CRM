import type Stripe from 'stripe'

/** 体験以降のデフォルト但書テンプレート */
export const DEFAULT_REGULAR_RECEIPT_MEMO_TEMPLATE = '{{month}}月分水泳レッスン費として'

/**
 * テンプレート文字列内の {{year}} / {{month}} を日本時間基準で展開する
 */
export function formatReceiptMemoTemplate(template: string, targetDate: Date = new Date()): string {
    const jstDate = new Date(targetDate.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const year = String(jstDate.getFullYear())
    const month = String(jstDate.getMonth() + 1)

    return template
        .replace(/\{\{year\}\}/g, year)
        .replace(/\{\{month\}\}/g, month)
        .trim()
}

/**
 * Stripe顧客メタデータから「体験用メモ」「体験以降（通常）用メモ」を抽出する
 */
export function extractCustomerMemoSettings(metadata?: Stripe.Metadata | null): {
    trialMemo: string
    regularMemo: string
} {
    const meta = metadata || {}
    let trialMemo = (meta.trial_receipt_memo || '').trim()
    let regularMemo = (meta.regular_receipt_memo || '').trim()

    // 旧仕様 (receipt_memo のみ) からの互換性フォールバック
    const legacyMemo = (meta.receipt_memo || '').trim()
    if (!trialMemo && !regularMemo && legacyMemo) {
        if (legacyMemo.includes('体験')) {
            trialMemo = legacyMemo
        } else {
            regularMemo = legacyMemo
        }
    }

    return { trialMemo, regularMemo }
}

/**
 * 請求種別に応じた最終的な請求書・領収書メモ（但書）を解決する
 */
export function resolveInvoiceMemo(
    metadata?: Stripe.Metadata | null,
    options: { isTrial?: boolean; date?: Date; fallbackToDefaultRegular?: boolean } = {}
): string | undefined {
    const { isTrial = false, date = new Date(), fallbackToDefaultRegular = true } = options
    const { trialMemo, regularMemo } = extractCustomerMemoSettings(metadata)

    if (isTrial) {
        return trialMemo ? formatReceiptMemoTemplate(trialMemo, date) : undefined
    }

    if (regularMemo) {
        return formatReceiptMemoTemplate(regularMemo, date)
    }

    if (fallbackToDefaultRegular) {
        return formatReceiptMemoTemplate(DEFAULT_REGULAR_RECEIPT_MEMO_TEMPLATE, date)
    }

    return undefined
}
