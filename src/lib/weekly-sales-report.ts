import { STRIPE_PRICES } from './constants'

export const WEEKLY_SALES_SHEET_TITLE = '週次売上'

export const WEEKLY_SALES_HEADERS = [
    '週開始日',
    '週終了日',
    'ストック売上',
    '新規体験売上',
    '単発売上',
    'その他売上',
    '返金',
    '確定売上合計',
    '決済件数',
    '生成日時',
] as const

export type SalesCategory = 'stock' | 'trial' | 'single' | 'other'

export interface WeekDateRangeJst {
    /** YYYY-MM-DD (Monday in JST) */
    weekStartDate: string
    /** YYYY-MM-DD (Sunday in JST) */
    weekEndDate: string
    /** UTC Date corresponding to Monday 00:00:00.000 JST */
    startUtc: Date
    /** UTC Date corresponding to Sunday 23:59:59.999 JST */
    endUtc: Date
    /** Unix timestamp (seconds) for Monday 00:00:00 JST */
    startUnix: number
    /** Unix timestamp (seconds) for Sunday 23:59:59 JST */
    endUnix: number
}

export interface MembershipTypeMaster {
    id: string
    name: string
    fee?: number | null
    pair_fee?: number | null
    is_package?: boolean | null
    monthly_lesson_limit?: number | null
    stripe_price_id?: string | null
    stripe_product_id?: string | null
    stripe_pair_price_id?: string | null
    stripe_pair_product_id?: string | null
}

export interface LessonMasterRecord {
    id: string
    name: string
    unit_price?: number | null
    pair_unit_price?: number | null
    is_trial?: boolean | null
    stripe_price_id?: string | null
    stripe_product_id?: string | null
    stripe_pair_price_id?: string | null
    stripe_pair_product_id?: string | null
}

export interface LessonScheduleLookupRecord {
    id: string
    title?: string | null
    lesson_master_id?: string | null
    billing_status?: string | null
    stripe_invoice_id?: string | null
    stripe_invoice_item_id?: string | null
    payment_intent_id?: string | null
}

export interface CrmMasterContext {
    membershipTypes: MembershipTypeMaster[]
    lessonMasters: LessonMasterRecord[]
    schedules: LessonScheduleLookupRecord[]
    swimStepPaymentIntentIds?: Set<string>
}

export interface NormalizedPaymentLineItem {
    amount: number
    priceId?: string | null
    productId?: string | null
    description?: string | null
    metadata?: Record<string, string | undefined> | null
    lineType?: 'subscription' | 'invoiceitem' | 'one_time' | string | null
}

export interface NormalizedSucceededPayment {
    /** Unique payment identifier (e.g. Charge ID or Invoice ID) */
    id: string
    /** Gross succeeded payment amount in JPY */
    amount: number
    /** Unix timestamp (seconds) when the payment succeeded */
    paidAtUnix: number
    paymentIntentId?: string | null
    invoiceId?: string | null
    description?: string | null
    metadata?: Record<string, string | undefined> | null
    lines?: NormalizedPaymentLineItem[]
}

export interface NormalizedSucceededRefund {
    id: string
    /** Refunded amount in JPY */
    amount: number
    /** Unix timestamp (seconds) when the refund occurred */
    createdUnix: number
    status: string
    chargeId?: string | null
    paymentIntentId?: string | null
}

export interface WeeklySalesReportRow {
    weekStartDate: string
    weekEndDate: string
    stockSales: number
    trialSales: number
    singleSales: number
    otherSales: number
    refundAmount: number
    confirmedTotalSales: number
    paymentCount: number
    generatedAt: string
}

export interface SheetWriteResult {
    action: 'appended' | 'updated'
    rowNumber: number
    spreadsheetId: string
    sheetTitle: string
}

/**
 * Normalizes Japanese full-width alphanumeric/parentheses strings via NFKC.
 */
export function normalizeText(input?: string | null): string {
    if (!input) return ''
    return input.normalize('NFKC').trim()
}

/**
 * Formats a UTC Date as 'YYYY-MM-DD HH:mm:ss' in JST (Asia/Tokyo, UTC+9).
 */
export function formatDateTimeJst(date: Date = new Date()): string {
    const jstMs = date.getTime() + 9 * 60 * 60 * 1000
    const jst = new Date(jstMs)
    const y = jst.getUTCFullYear()
    const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
    const d = String(jst.getUTCDate()).padStart(2, '0')
    const hh = String(jst.getUTCHours()).padStart(2, '0')
    const mm = String(jst.getUTCMinutes()).padStart(2, '0')
    const ss = String(jst.getUTCSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

/**
 * Calculates the previous week's Monday 00:00:00 JST to Sunday 23:59:59 JST
 * relative to a given reference Date.
 */
export function getPreviousWeekRangeJst(referenceDate: Date = new Date()): WeekDateRangeJst {
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000
    const refJst = new Date(referenceDate.getTime() + JST_OFFSET_MS)

    const year = refJst.getUTCFullYear()
    const month = refJst.getUTCMonth()
    const date = refJst.getUTCDate()
    const dayOfWeek = refJst.getUTCDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Number of days elapsed since the current week's Monday in JST (Mon=0, Tue=1, ..., Sun=6)
    const daysSinceCurrentMonday = (dayOfWeek + 6) % 7
    const daysToPreviousMonday = daysSinceCurrentMonday + 7

    // Midnight 00:00:00.000 JST of previous Monday represented in JST-shifted UTC
    const prevMondayJstWall = new Date(Date.UTC(year, month, date - daysToPreviousMonday, 0, 0, 0, 0))
    const prevSundayJstWall = new Date(Date.UTC(year, month, date - daysToPreviousMonday + 6, 23, 59, 59, 999))

    const startUtc = new Date(prevMondayJstWall.getTime() - JST_OFFSET_MS)
    const endUtc = new Date(prevSundayJstWall.getTime() - JST_OFFSET_MS)

    const formatYmd = (d: Date) => {
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const day = String(d.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    return {
        weekStartDate: formatYmd(prevMondayJstWall),
        weekEndDate: formatYmd(prevSundayJstWall),
        startUtc,
        endUtc,
        startUnix: Math.floor(startUtc.getTime() / 1000),
        endUnix: Math.floor(endUtc.getTime() / 1000),
    }
}

/**
 * Determines whether a MembershipTypeMaster represents a monthly recurring stock plan (月2回 / 月4回).
 */
export function isStockMembershipType(mt: MembershipTypeMaster): boolean {
    if (mt.is_package) return false
    const normName = normalizeText(mt.name)
    if (normName.includes('単発') || normName.includes('パッケージ')) return false
    if (mt.monthly_lesson_limit === 2 || mt.monthly_lesson_limit === 4) {
        return true
    }
    if (
        (normName.includes('月2回') || normName.includes('月4回')) &&
        !normName.includes('12回') &&
        !normName.includes('14回') &&
        !normName.includes('24回') &&
        !normName.includes('32回')
    ) {
        return true
    }
    return false
}

/**
 * Classifies a single payment line item into one of the 4 sales breakdown categories
 * ('stock' | 'trial' | 'single' | 'other') by matching against CRM product/lesson masters.
 */
export function classifyPaymentLineItem(
    item: NormalizedPaymentLineItem,
    parentPayment: Pick<NormalizedSucceededPayment, 'paymentIntentId' | 'invoiceId' | 'description' | 'metadata'>,
    masters: CrmMasterContext
): SalesCategory {
    const meta = {
        ...(parentPayment.metadata || {}),
        ...(item.metadata || {}),
    }
    const priceId = item.priceId || null
    const productId = item.productId || null
    const combinedDesc = normalizeText(
        [item.description, parentPayment.description].filter(Boolean).join(' ')
    )

    // 1. Explicit metadata type checks that unambiguously identify the transaction type
    const metaType = normalizeText(meta.type)
    if (metaType === 'trial_fee' || metaType === 'trio_trial') {
        return 'trial'
    }
    if (metaType === 'swim_step' || metaType === 'ticket_purchase' || metaType === 'trio_ticket_purchase') {
        return 'other'
    }
    if (meta.is_package === 'true') {
        return 'other'
    }
    if (
        parentPayment.paymentIntentId &&
        masters.swimStepPaymentIntentIds?.has(parentPayment.paymentIntentId)
    ) {
        return 'other'
    }

    // 2. Check linked lesson_schedule (by schedule_id / lesson_id / invoice_item_id / payment_intent_id / invoice_id)
    const scheduleId = meta.schedule_id || meta.lesson_id
    let matchedSchedule: LessonScheduleLookupRecord | undefined
    if (scheduleId) {
        matchedSchedule = masters.schedules.find(s => s.id === scheduleId)
    }
    if (!matchedSchedule && parentPayment.paymentIntentId) {
        matchedSchedule = masters.schedules.find(
            s => s.payment_intent_id === parentPayment.paymentIntentId
        )
    }

    if (matchedSchedule) {
        if (matchedSchedule.billing_status === 'cancelled_with_fee' || combinedDesc.includes('キャンセル料')) {
            return 'other'
        }
        if (matchedSchedule.lesson_master_id) {
            const lm = masters.lessonMasters.find(m => m.id === matchedSchedule!.lesson_master_id)
            if (lm) {
                if (lm.is_trial || normalizeText(lm.name).includes('体験')) {
                    return 'trial'
                }
                if (normalizeText(lm.name).includes('単発')) {
                    return 'single'
                }
                return 'other'
            }
        }
        const schedTitle = normalizeText(matchedSchedule.title)
        if (schedTitle.includes('体験') || schedTitle.includes('トライアル')) {
            return 'trial'
        }
        return 'single'
    }

    // 3. Match against lesson_masters by Stripe Price ID or Product ID
    if (priceId || productId) {
        const matchedLessonMaster = masters.lessonMasters.find(
            lm =>
                (priceId && (lm.stripe_price_id === priceId || lm.stripe_pair_price_id === priceId)) ||
                (productId && (lm.stripe_product_id === productId || lm.stripe_pair_product_id === productId))
        )
        if (matchedLessonMaster) {
            if (matchedLessonMaster.is_trial || normalizeText(matchedLessonMaster.name).includes('体験')) {
                return 'trial'
            }
            if (normalizeText(matchedLessonMaster.name).includes('単発')) {
                return 'single'
            }
            return 'other'
        }
    }

    // 4. Match against membership_types by membership_type_id, Stripe Price ID, or Product ID
    const membershipTypeId = meta.membership_type_id
    const matchedMembership = masters.membershipTypes.find(
        mt =>
            (membershipTypeId && mt.id === membershipTypeId && item.lineType !== 'invoiceitem') ||
            (priceId && (mt.stripe_price_id === priceId || mt.stripe_pair_price_id === priceId)) ||
            (productId && (mt.stripe_product_id === productId || mt.stripe_pair_product_id === productId))
    )
    if (matchedMembership) {
        if (isStockMembershipType(matchedMembership)) {
            return 'stock'
        }
        return 'other'
    }

    // 5. Match against constants.ts STRIPE_PRICES & Single Plan Annual/System Management Fee
    const singleAnnualPriceIds = [
        'price_1UDkQlP0UQGtpYXmb0jVWVrp',
        'price_1UDkQmP0UQGtpYXmMYM0n7FE',
    ]
    if (priceId && singleAnnualPriceIds.includes(priceId)) {
        return 'other'
    }

    const subscriptionPriceIds = Object.values(STRIPE_PRICES.SUBSCRIPTIONS) as string[]
    if (priceId && subscriptionPriceIds.includes(priceId)) {
        return 'stock'
    }

    const singleTicketPriceIds = Object.values(STRIPE_PRICES.TICKETS) as string[]
    if (priceId && singleTicketPriceIds.includes(priceId)) {
        return 'single'
    }

    // 6. Overage / single lesson metadata or description match when linked to membership_type_id for initial fee
    if (membershipTypeId) {
        const mtById = masters.membershipTypes.find(m => m.id === membershipTypeId)
        if (mtById) {
            if (isStockMembershipType(mtById)) {
                return 'stock'
            }
            return 'other'
        }
    }

    if (
        metaType === 'deferred_overage' ||
        metaType === 'immediate_overage' ||
        metaType === 'overage_lesson'
    ) {
        return 'single'
    }

    // 7. Fallback by description matching CRM product naming conventions
    if (combinedDesc.includes('キャンセル料') || combinedDesc.includes('システム管理') || combinedDesc.includes('年会費') || combinedDesc.includes('完泳')) {
        return 'other'
    }
    if (combinedDesc.includes('体験') || combinedDesc.includes('トライアル')) {
        return 'trial'
    }
    if (
        (combinedDesc.includes('月2回') || combinedDesc.includes('月4回')) &&
        !combinedDesc.includes('追加レッスン')
    ) {
        return 'stock'
    }
    if (combinedDesc.includes('単発') || combinedDesc.includes('追加レッスン')) {
        return 'single'
    }

    return 'other'
}

/**
 * Aggregates succeeded payments and refunds within the target week into a WeeklySalesReportRow.
 */
export function aggregateWeeklySalesReport(params: {
    weekRange: WeekDateRangeJst
    payments: NormalizedSucceededPayment[]
    refunds: NormalizedSucceededRefund[]
    masters: CrmMasterContext
    generatedAt?: Date
}): WeeklySalesReportRow {
    const { weekRange, payments, refunds, masters, generatedAt = new Date() } = params

    let stockSales = 0
    let trialSales = 0
    let singleSales = 0
    let otherSales = 0
    let paymentCount = 0

    // Deduplicate payments by ID and filter strictly to [startUnix, endUnix]
    const seenPaymentIds = new Set<string>()

    for (const payment of payments) {
        if (!payment || payment.amount <= 0) continue
        if (payment.paidAtUnix < weekRange.startUnix || payment.paidAtUnix > weekRange.endUnix) {
            continue
        }
        if (seenPaymentIds.has(payment.id)) continue
        seenPaymentIds.add(payment.id)

        paymentCount += 1

        const lines =
            payment.lines && payment.lines.length > 0
                ? payment.lines
                : [
                      {
                          amount: payment.amount,
                          description: payment.description,
                          metadata: payment.metadata,
                          lineType: 'one_time',
                      },
                  ]

        const linesTotal = lines.reduce((sum, l) => sum + l.amount, 0)

        for (const line of lines) {
            if (line.amount === 0) continue
            const category = classifyPaymentLineItem(line, payment, masters)
            if (category === 'stock') stockSales += line.amount
            else if (category === 'trial') trialSales += line.amount
            else if (category === 'single') singleSales += line.amount
            else otherSales += line.amount
        }

        // If invoice had a discount/adjustment where payment.amount differs from sum of lines,
        // reconcile the difference in 'other' so breakdown sum always equals gross paid amount.
        const diff = payment.amount - linesTotal
        if (diff !== 0) {
            otherSales += diff
        }
    }

    // Aggregate succeeded refunds that occurred within [startUnix, endUnix]
    let refundAmount = 0
    const seenRefundIds = new Set<string>()
    for (const refund of refunds) {
        if (!refund || refund.amount <= 0) continue
        if (refund.status !== 'succeeded') continue
        if (refund.createdUnix < weekRange.startUnix || refund.createdUnix > weekRange.endUnix) {
            continue
        }
        if (seenRefundIds.has(refund.id)) continue
        seenRefundIds.add(refund.id)

        refundAmount += refund.amount
    }

    const totalBreakdown = stockSales + trialSales + singleSales + otherSales
    const confirmedTotalSales = totalBreakdown - refundAmount

    return {
        weekStartDate: weekRange.weekStartDate,
        weekEndDate: weekRange.weekEndDate,
        stockSales,
        trialSales,
        singleSales,
        otherSales,
        refundAmount,
        confirmedTotalSales,
        paymentCount,
        generatedAt: formatDateTimeJst(generatedAt),
    }
}

/**
 * Converts a WeeklySalesReportRow into the 10-column array matching WEEKLY_SALES_HEADERS.
 */
export function formatReportRowValues(row: WeeklySalesReportRow): (string | number)[] {
    return [
        row.weekStartDate,
        row.weekEndDate,
        row.stockSales,
        row.trialSales,
        row.singleSales,
        row.otherSales,
        row.refundAmount,
        row.confirmedTotalSales,
        row.paymentCount,
        row.generatedAt,
    ]
}

/**
 * Minimal interface for Google Sheets client operations to support both live googleapis
 * and deterministic in-memory unit/integration testing.
 */
export interface SheetsClientLike {
    spreadsheets: {
        get(params: { spreadsheetId: string }): Promise<{
            data: {
                sheets?: Array<{
                    properties?: {
                        title?: string | null
                    } | null
                }>
            }
        }>
        batchUpdate(params: {
            spreadsheetId: string
            requestBody: {
                requests: Array<{
                    addSheet?: {
                        properties: {
                            title: string
                        }
                    }
                }>
            }
        }): Promise<unknown>
        values: {
            get(params: { spreadsheetId: string; range: string }): Promise<{
                data: {
                    values?: any[][] | null
                }
            }>
            update(params: {
                spreadsheetId: string
                range: string
                valueInputOption: string
                requestBody: {
                    values: any[][]
                }
            }): Promise<unknown>
            append(params: {
                spreadsheetId: string
                range: string
                valueInputOption: string
                insertDataOption?: string
                requestBody: {
                    values: any[][]
                }
            }): Promise<unknown>
        }
    }
}

/**
 * Extracts a Google Spreadsheet ID from either a full Google Sheets URL or a raw ID string.
 */
export function resolveSpreadsheetId(urlOrId: string): string | null {
    const trimmed = urlOrId.trim()
    if (!trimmed) return null
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) return match[1]
    if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed
    return null
}

/**
 * Writes (or idempotently updates in place if weekStartDate already exists) a WeeklySalesReportRow
 * to the '週次売上' tab of the target Google Spreadsheet.
 */
export async function writeWeeklySalesReportToSheet(params: {
    report: WeeklySalesReportRow
    spreadsheetIdOrUrl?: string
    sheetTitle?: string
    sheetsClient?: SheetsClientLike
}): Promise<SheetWriteResult> {
    const rawId =
        params.spreadsheetIdOrUrl ||
        process.env.SALES_REPORT_SPREADSHEET_ID ||
        process.env.WEEKLY_SALES_REPORT_SPREADSHEET_ID ||
        ''

    const spreadsheetId = resolveSpreadsheetId(rawId)
    if (!spreadsheetId) {
        throw new Error(
            '売上レポート出力先のスプレッドシートID（SALES_REPORT_SPREADSHEET_ID）が設定されていません。'
        )
    }

    const sheetTitle = params.sheetTitle || WEEKLY_SALES_SHEET_TITLE

    let sheets: SheetsClientLike
    if (params.sheetsClient) {
        sheets = params.sheetsClient
    } else {
        const [{ google }, { getGoogleAuthClient, getGoogleAuthClientAsync }] = await Promise.all([
            import('googleapis'),
            import('@/lib/google-analytics'),
        ])
        const scopes = ['https://www.googleapis.com/auth/spreadsheets']
        const auth = getGoogleAuthClient(scopes) || (await getGoogleAuthClientAsync(scopes))
        if (!auth) {
            throw new Error(
                'Googleサービスアカウント認証情報（GOOGLE_SERVICE_ACCOUNT_KEY）が設定されていないか不正です。'
            )
        }
        sheets = google.sheets({ version: 'v4', auth }) as unknown as SheetsClientLike
    }

    // 1. Ensure target tab ('週次売上') exists
    const metaRes = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetExists = metaRes.data.sheets?.some(
        s => s.properties?.title === sheetTitle
    )

    if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: sheetTitle,
                            },
                        },
                    },
                ],
            },
        })
    }

    // 2. Read existing values in A:J to check headers and existing week row
    const getRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetTitle}!A:J`,
    })
    let existingRows = getRes.data.values || []

    // Insert header row if the sheet is completely empty
    if (existingRows.length === 0) {
        const headerRow = [...WEEKLY_SALES_HEADERS]
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetTitle}!A1:J1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headerRow],
            },
        })
        existingRows = [headerRow]
    }

    const rowValues = formatReportRowValues(params.report)

    // 3. Idempotency check: Find existing row with the same weekStartDate in Column A
    let matchingRowIndex = -1
    for (let i = 0; i < existingRows.length; i++) {
        const cellA = String(existingRows[i]?.[0] ?? '').trim()
        if (cellA === params.report.weekStartDate) {
            matchingRowIndex = i
            break
        }
    }

    if (matchingRowIndex !== -1) {
        const sheetRowNumber = matchingRowIndex + 1
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetTitle}!A${sheetRowNumber}:J${sheetRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowValues],
            },
        })
        return {
            action: 'updated',
            rowNumber: sheetRowNumber,
            spreadsheetId,
            sheetTitle,
        }
    }

    // 4. Append new row if weekStartDate does not exist yet
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetTitle}!A:J`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [rowValues],
        },
    })

    return {
        action: 'appended',
        rowNumber: existingRows.length + 1,
        spreadsheetId,
        sheetTitle,
    }
}

/**
 * Fetches CRM master records and Stripe payment/refund records for the given week range,
 * then computes the WeeklySalesReportRow.
 */
export async function fetchAndBuildWeeklySalesReport(
    weekRange: WeekDateRangeJst,
    generatedAt: Date = new Date()
): Promise<WeeklySalesReportRow> {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { stripe } = await import('@/lib/stripe')

    const supabase = createAdminClient()

    // 1. Load CRM Master Data
    const [
        { data: membershipTypesData, error: mtErr },
        { data: lessonMastersData, error: lmErr },
    ] = await Promise.all([
        supabase
            .from('membership_types')
            .select(
                'id, name, fee, pair_fee, is_package, monthly_lesson_limit, stripe_price_id, stripe_product_id, stripe_pair_price_id, stripe_pair_product_id'
            ),
        supabase
            .from('lesson_masters')
            .select(
                'id, name, unit_price, pair_unit_price, is_trial, stripe_price_id, stripe_product_id, stripe_pair_price_id, stripe_pair_product_id'
            ),
    ])

    if (mtErr) {
        throw new Error(`membership_types取得エラー: ${mtErr.message}`)
    }
    if (lmErr) {
        throw new Error(`lesson_masters取得エラー: ${lmErr.message}`)
    }

    // 2. Fetch succeeded charges and paid invoices from Stripe in [startUnix, endUnix]
    const charges: any[] = []
    for await (const charge of stripe.charges.list({
        created: { gte: weekRange.startUnix, lte: weekRange.endUnix },
        limit: 100,
    })) {
        if (charge.status === 'succeeded' && charge.paid && charge.amount > 0) {
            charges.push(charge)
        }
    }

    // Fetch refunds created in [startUnix, endUnix]
    const refunds: NormalizedSucceededRefund[] = []
    for await (const refund of stripe.refunds.list({
        created: { gte: weekRange.startUnix, lte: weekRange.endUnix },
        limit: 100,
    })) {
        if (refund.status === 'succeeded' && refund.amount > 0) {
            refunds.push({
                id: refund.id,
                amount: refund.amount,
                createdUnix: refund.created,
                status: refund.status,
                chargeId: typeof refund.charge === 'string' ? refund.charge : refund.charge?.id || null,
                paymentIntentId:
                    typeof refund.payment_intent === 'string'
                        ? refund.payment_intent
                        : refund.payment_intent?.id || null,
            })
        }
    }

    // Collect Invoice IDs and PaymentIntent IDs to enrich line items and metadata
    const invoiceIds = new Set<string>()
    const paymentIntentIds = new Set<string>()

    for (const charge of charges) {
        const invId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice?.id
        if (invId) invoiceIds.add(invId)
        const piId =
            typeof charge.payment_intent === 'string'
                ? charge.payment_intent
                : charge.payment_intent?.id
        if (piId) paymentIntentIds.add(piId)
    }

    // Retrieve Invoice details for invoice-backed charges
    const invoiceMap = new Map<string, any>()
    for (const invId of invoiceIds) {
        try {
            const inv = await stripe.invoices.retrieve(invId, {
                expand: ['lines.data.price'],
            })
            invoiceMap.set(invId, inv)
        } catch (err) {
            console.warn(`[WeeklySalesReport] Failed to retrieve invoice ${invId}:`, err)
        }
    }

    // Retrieve Checkout Sessions for non-invoice PaymentIntents to obtain session metadata & line items
    const checkoutByPiMap = new Map<string, { session: any; lineItems: any[] }>()
    for (const charge of charges) {
        const invId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice?.id
        const piId =
            typeof charge.payment_intent === 'string'
                ? charge.payment_intent
                : charge.payment_intent?.id
        if (!invId && piId) {
            try {
                const sessions = await stripe.checkout.sessions.list({
                    payment_intent: piId,
                    limit: 1,
                })
                const session = sessions.data[0]
                if (session) {
                    const lineItemsRes = await stripe.checkout.sessions.listLineItems(session.id, {
                        limit: 20,
                    })
                    checkoutByPiMap.set(piId, {
                        session,
                        lineItems: lineItemsRes.data || [],
                    })
                }
            } catch (err) {
                console.warn(`[WeeklySalesReport] Failed to fetch checkout session for PI ${piId}:`, err)
            }
        }
    }

    // Collect schedule IDs referenced in metadata or payment_intent_id
    const candidateScheduleIds = new Set<string>()
    for (const charge of charges) {
        if (charge.metadata?.schedule_id) candidateScheduleIds.add(charge.metadata.schedule_id)
        if (charge.metadata?.lesson_id) candidateScheduleIds.add(charge.metadata.lesson_id)
    }
    for (const inv of invoiceMap.values()) {
        for (const line of inv.lines?.data || []) {
            if (line.metadata?.schedule_id) candidateScheduleIds.add(line.metadata.schedule_id)
            if (line.metadata?.lesson_id) candidateScheduleIds.add(line.metadata.lesson_id)
        }
    }
    for (const { session } of checkoutByPiMap.values()) {
        if (session.metadata?.schedule_id) candidateScheduleIds.add(session.metadata.schedule_id)
        if (session.metadata?.lesson_id) candidateScheduleIds.add(session.metadata.lesson_id)
    }

    const schedulesMap = new Map<string, LessonScheduleLookupRecord>()
    if (candidateScheduleIds.size > 0) {
        const { data: byIds } = await supabase
            .from('lesson_schedules')
            .select(
                'id, title, lesson_master_id, billing_status, stripe_invoice_id, stripe_invoice_item_id, payment_intent_id'
            )
            .in('id', Array.from(candidateScheduleIds))
        for (const s of byIds || []) {
            schedulesMap.set(s.id, s)
        }
    }

    if (paymentIntentIds.size > 0) {
        const { data: byPis } = await supabase
            .from('lesson_schedules')
            .select(
                'id, title, lesson_master_id, billing_status, stripe_invoice_id, stripe_invoice_item_id, payment_intent_id'
            )
            .in('payment_intent_id', Array.from(paymentIntentIds))
        for (const s of byPis || []) {
            schedulesMap.set(s.id, s)
        }
    }

    const swimStepPaymentIntentIds = new Set<string>()
    if (paymentIntentIds.size > 0) {
        const { data: swimStepRows } = await supabase
            .from('swim_step_bookings')
            .select('stripe_payment_intent_id')
            .in('stripe_payment_intent_id', Array.from(paymentIntentIds))
        for (const row of swimStepRows || []) {
            if (row.stripe_payment_intent_id) {
                swimStepPaymentIntentIds.add(row.stripe_payment_intent_id)
            }
        }
    }

    // Build NormalizedSucceededPayment list
    const normalizedPayments: NormalizedSucceededPayment[] = charges.map(charge => {
        const invId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice?.id || null
        const piId =
            typeof charge.payment_intent === 'string'
                ? charge.payment_intent
                : charge.payment_intent?.id || null

        if (invId && invoiceMap.has(invId)) {
            const inv = invoiceMap.get(invId)
            const lines: NormalizedPaymentLineItem[] = (inv.lines?.data || []).map((line: any) => {
                const priceObj = line.price || line.plan
                const priceId = typeof priceObj === 'string' ? priceObj : priceObj?.id || null
                const productId =
                    typeof priceObj?.product === 'string'
                        ? priceObj.product
                        : priceObj?.product?.id || null
                return {
                    amount: line.amount ?? 0,
                    priceId,
                    productId,
                    description: line.description || null,
                    metadata: line.metadata || {},
                    lineType: line.type || null,
                }
            })

            return {
                id: charge.id,
                amount: charge.amount,
                paidAtUnix: charge.created,
                paymentIntentId: piId,
                invoiceId: invId,
                description: charge.description || inv.description || null,
                metadata: { ...(inv.metadata || {}), ...(charge.metadata || {}) },
                lines,
            }
        }

        if (piId && checkoutByPiMap.has(piId)) {
            const { session, lineItems } = checkoutByPiMap.get(piId)!
            const mergedMeta = { ...(charge.metadata || {}), ...(session.metadata || {}) }
            const lines: NormalizedPaymentLineItem[] = lineItems.map((li: any) => {
                const priceObj = li.price
                const priceId = typeof priceObj === 'string' ? priceObj : priceObj?.id || null
                const productId =
                    typeof priceObj?.product === 'string'
                        ? priceObj.product
                        : priceObj?.product?.id || null
                return {
                    amount: li.amount_total ?? li.amount_subtotal ?? charge.amount,
                    priceId,
                    productId,
                    description: li.description || null,
                    metadata: mergedMeta,
                    lineType: 'one_time',
                }
            })

            return {
                id: charge.id,
                amount: charge.amount,
                paidAtUnix: charge.created,
                paymentIntentId: piId,
                invoiceId: null,
                description: charge.description || null,
                metadata: mergedMeta,
                lines: lines.length > 0 ? lines : undefined,
            }
        }

        return {
            id: charge.id,
            amount: charge.amount,
            paidAtUnix: charge.created,
            paymentIntentId: piId,
            invoiceId: invId,
            description: charge.description || null,
            metadata: charge.metadata || {},
        }
    })

    const masters: CrmMasterContext = {
        membershipTypes: (membershipTypesData || []) as MembershipTypeMaster[],
        lessonMasters: (lessonMastersData || []) as LessonMasterRecord[],
        schedules: Array.from(schedulesMap.values()),
        swimStepPaymentIntentIds,
    }

    return aggregateWeeklySalesReport({
        weekRange,
        payments: normalizedPayments,
        refunds,
        masters,
        generatedAt,
    })
}
