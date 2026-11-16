import assert from 'node:assert/strict'
import {
    WEEKLY_SALES_HEADERS,
    WEEKLY_SALES_SHEET_TITLE,
    aggregateWeeklySalesReport,
    getPreviousWeekRangeJst,
    writeWeeklySalesReportToSheet,
    type CrmMasterContext,
    type NormalizedSucceededPayment,
    type NormalizedSucceededRefund,
    type SheetsClientLike,
} from '../src/lib/weekly-sales-report'
import { GET as cronGetHandler } from '../src/app/api/cron/weekly-sales-report/route'
import { STRIPE_PRICES } from '../src/lib/constants'

class InMemorySheetsMock implements SheetsClientLike {
    public sheetTitles = new Set<string>()
    public rowsBySheet = new Map<string, any[][]>()

    public spreadsheets = {
        get: async ({ spreadsheetId }: { spreadsheetId: string }) => {
            assert.ok(spreadsheetId, 'spreadsheetId must be provided')
            return {
                data: {
                    sheets: Array.from(this.sheetTitles).map(title => ({
                        properties: { title },
                    })),
                },
            }
        },
        batchUpdate: async ({
            requestBody,
        }: {
            spreadsheetId: string
            requestBody: { requests: Array<{ addSheet?: { properties: { title: string } } }> }
        }) => {
            for (const req of requestBody.requests) {
                const title = req.addSheet?.properties?.title
                if (title) {
                    this.sheetTitles.add(title)
                    if (!this.rowsBySheet.has(title)) {
                        this.rowsBySheet.set(title, [])
                    }
                }
            }
            return {}
        },
        values: {
            get: async ({ range }: { spreadsheetId: string; range: string }) => {
                const sheetTitle = range.split('!')[0]
                const rows = this.rowsBySheet.get(sheetTitle) || []
                return {
                    data: {
                        values: rows.map(r => [...r]),
                    },
                }
            },
            update: async ({
                range,
                requestBody,
            }: {
                spreadsheetId: string
                range: string
                valueInputOption: string
                requestBody: { values: any[][] }
            }) => {
                const [sheetTitle, cellRange] = range.split('!')
                const rows = this.rowsBySheet.get(sheetTitle) || []
                const match = cellRange.match(/^A(\d+):J(\d+)$/)
                assert.ok(match, `Unexpected update range format: ${range}`)
                const rowIndex = parseInt(match[1], 10) - 1
                rows[rowIndex] = [...requestBody.values[0]]
                this.rowsBySheet.set(sheetTitle, rows)
                return {}
            },
            append: async ({
                range,
                requestBody,
            }: {
                spreadsheetId: string
                range: string
                valueInputOption: string
                insertDataOption?: string
                requestBody: { values: any[][] }
            }) => {
                const sheetTitle = range.split('!')[0]
                const rows = this.rowsBySheet.get(sheetTitle) || []
                for (const row of requestBody.values) {
                    rows.push([...row])
                }
                this.rowsBySheet.set(sheetTitle, rows)
                return {}
            },
        },
    }
}

async function runVerification() {
    console.log('=== 週次売上レポート自動出力 ローカル検証開始 ===\n')

    // -------------------------------------------------------------------------
    // 1. 対象期間（前週月曜00:00〜日曜23:59 JST）の計算検証
    // -------------------------------------------------------------------------
    // 実行日時: 2026-11-16 (月) 04:30:00 JST (= 2026-11-15T19:30:00.000Z)
    const cronExecutionTime = new Date('2026-11-16T04:30:00+09:00')
    const weekRange = getPreviousWeekRangeJst(cronExecutionTime)

    assert.equal(weekRange.weekStartDate, '2026-11-09', '週開始日は前週月曜(2026-11-09)であること')
    assert.equal(weekRange.weekEndDate, '2026-11-15', '週終了日は前週日曜(2026-11-15)であること')
    assert.equal(
        weekRange.startUtc.toISOString(),
        '2026-11-08T15:00:00.000Z',
        'JST月曜00:00:00はUTC日曜15:00:00であること'
    )
    assert.equal(
        weekRange.endUtc.toISOString(),
        '2026-11-15T14:59:59.999Z',
        'JST日曜23:59:59.999はUTC日曜14:59:59.999であること'
    )
    console.log(
        `[OK] 1. 対象期間算出: ${weekRange.weekStartDate} 00:00:00 JST 〜 ${weekRange.weekEndDate} 23:59:59 JST (unix: ${weekRange.startUnix} - ${weekRange.endUnix})`
    )

    // -------------------------------------------------------------------------
    // 2. テストデータによる集計値と手計算の一致検証
    // -------------------------------------------------------------------------
    const masters: CrmMasterContext = {
        membershipTypes: [
            {
                id: 'mt_m2_60',
                name: '月2回プラン（60分）',
                fee: 19000,
                pair_fee: 28500,
                is_package: false,
                monthly_lesson_limit: 2,
                stripe_price_id: 'price_m2_60',
                stripe_product_id: 'prod_m2_60',
                stripe_pair_price_id: 'price_m2_60_pair',
                stripe_pair_product_id: 'prod_m2_60_pair',
            },
            {
                id: 'mt_m4_60',
                name: '月4回プラン（60分）',
                fee: 36000,
                pair_fee: 54000,
                is_package: false,
                monthly_lesson_limit: 4,
                stripe_price_id: 'price_m4_60',
                stripe_product_id: 'prod_m4_60',
                stripe_pair_price_id: 'price_m4_60_pair',
                stripe_pair_product_id: 'prod_m4_60_pair',
            },
            {
                id: 'mt_m2_90',
                name: '月2回プラン（90分）',
                fee: 27000,
                pair_fee: 40500,
                is_package: false,
                monthly_lesson_limit: 2,
                stripe_price_id: 'price_m2_90',
                stripe_product_id: 'prod_m2_90',
            },
            {
                id: 'mt_single_base',
                name: '単発',
                fee: 0,
                is_package: false,
                monthly_lesson_limit: 0,
                stripe_price_id: 'price_single_0',
                stripe_product_id: 'prod_single_0',
            },
            {
                id: 'mt_pkg_25m',
                name: '25m完泳保証パッケージ',
                fee: 158000,
                is_package: true,
                monthly_lesson_limit: 0,
                stripe_price_id: 'price_pkg_25m',
                stripe_product_id: 'prod_pkg_25m',
            },
        ],
        lessonMasters: [
            {
                id: 'lm_trial',
                name: '初回体験レッスン',
                unit_price: 6000,
                pair_unit_price: 9000,
                is_trial: true,
                stripe_price_id: 'price_trial_60',
                stripe_product_id: 'prod_trial_60',
                stripe_pair_price_id: 'price_trial_60_pair',
                stripe_pair_product_id: 'prod_trial_60_pair',
            },
            {
                id: 'lm_single_60',
                name: '単発（60分）',
                unit_price: 10000,
                pair_unit_price: 15000,
                is_trial: false,
                stripe_price_id: 'price_single_60',
                stripe_product_id: 'prod_single_60',
                stripe_pair_price_id: 'price_single_60_pair',
                stripe_pair_product_id: 'prod_single_60_pair',
            },
            {
                id: 'lm_single_90',
                name: '単発（90分）',
                unit_price: 14000,
                pair_unit_price: 21000,
                is_trial: false,
                stripe_price_id: 'price_single_90',
                stripe_product_id: 'prod_single_90',
            },
        ],
        schedules: [
            {
                id: 'sched_trial_1',
                title: '初回体験レッスン',
                lesson_master_id: 'lm_trial',
                billing_status: 'paid',
                payment_intent_id: 'pi_trial_1',
            },
            {
                id: 'sched_single_1',
                title: '単発（60分）',
                lesson_master_id: 'lm_single_60',
                billing_status: 'paid',
                stripe_invoice_id: 'in_single_1',
            },
            {
                id: 'sched_overage_1',
                title: '単発（90分）',
                lesson_master_id: 'lm_single_90',
                billing_status: 'paid',
                stripe_invoice_id: 'in_sub_with_overage',
            },
        ],
        swimStepPaymentIntentIds: new Set(['pi_swim_step_1']),
    }

    const payments: NormalizedSucceededPayment[] = [
        // [対象外] 前週月曜00:00 JST の1秒前 (除外されるべき)
        {
            id: 'ch_before_range',
            amount: 19000,
            paidAtUnix: weekRange.startUnix - 1,
            lines: [{ amount: 19000, priceId: 'price_m2_60', lineType: 'subscription' }],
        },
        // [1] ストック売上: 月2回プラン（60分）継続決済 (月曜00:00:00 JST ちょうど)
        {
            id: 'ch_stock_1',
            amount: 19000,
            paidAtUnix: weekRange.startUnix,
            invoiceId: 'in_stock_1',
            lines: [
                {
                    amount: 19000,
                    priceId: 'price_m2_60',
                    productId: 'prod_m2_60',
                    description: '1 × 月2回プラン（60分）',
                    lineType: 'subscription',
                },
            ],
        },
        // [2] ストック売上: 月4回プラン（60分）ペア継続決済
        {
            id: 'ch_stock_2',
            amount: 54000,
            paidAtUnix: weekRange.startUnix + 3600,
            invoiceId: 'in_stock_2',
            lines: [
                {
                    amount: 54000,
                    priceId: 'price_m4_60_pair',
                    productId: 'prod_m4_60_pair',
                    description: '1 × 月4回プラン（60分）（ペア）',
                    lineType: 'subscription',
                },
            ],
        },
        // [3] 複合インボイス決済 (1決済内でストック売上 27,000円 + 追加単発レッスン 14,000円 = 41,000円)
        {
            id: 'ch_stock_and_single',
            amount: 41000,
            paidAtUnix: weekRange.startUnix + 7200,
            invoiceId: 'in_sub_with_overage',
            lines: [
                {
                    amount: 27000,
                    priceId: 'price_m2_90',
                    productId: 'prod_m2_90',
                    description: '1 × 月2回プラン（90分）',
                    lineType: 'subscription',
                },
                {
                    amount: 14000,
                    priceId: 'price_single_90',
                    productId: 'prod_single_90',
                    description: '追加レッスン料: 単発（90分）',
                    metadata: { schedule_id: 'sched_overage_1', type: 'deferred_overage' },
                    lineType: 'invoiceitem',
                },
            ],
        },
        // [4] 新規体験売上: 初回体験レッスン Checkout決済 (6,000円)
        {
            id: 'ch_trial_1',
            amount: 6000,
            paidAtUnix: weekRange.startUnix + 86400,
            paymentIntentId: 'pi_trial_1',
            metadata: { type: 'trial_fee', lesson_id: 'sched_trial_1' },
            lines: [
                {
                    amount: 6000,
                    priceId: 'price_trial_60',
                    description: '体験レッスン受講料',
                    metadata: { type: 'trial_fee', lesson_id: 'sched_trial_1' },
                },
            ],
        },
        // [5] 新規体験売上: 初回体験レッスン（ペア）決済 (9,000円)
        {
            id: 'ch_trial_2',
            amount: 9000,
            paidAtUnix: weekRange.startUnix + 90000,
            paymentIntentId: 'pi_trial_2',
            lines: [
                {
                    amount: 9000,
                    priceId: 'price_trial_60_pair',
                    productId: 'prod_trial_60_pair',
                    description: '初回体験レッスン（ペア）',
                },
            ],
        },
        // [6] 単発売上: 単発（60分）インボイス決済 (10,000円)
        {
            id: 'ch_single_1',
            amount: 10000,
            paidAtUnix: weekRange.startUnix + 172800,
            invoiceId: 'in_single_1',
            lines: [
                {
                    amount: 10000,
                    priceId: 'price_single_60',
                    productId: 'prod_single_60',
                    description: '単発（60分） [受講日: 2026/11/11]',
                    metadata: { schedule_id: 'sched_single_1' },
                    lineType: 'invoiceitem',
                },
            ],
        },
        // [7] 単発売上: ビジター単発60分 (constants.ts STRIPE_PRICES.TICKETS.VISITOR_60 = 9,000円)
        {
            id: 'ch_single_2',
            amount: 9000,
            paidAtUnix: weekRange.startUnix + 200000,
            lines: [
                {
                    amount: 9000,
                    priceId: STRIPE_PRICES.TICKETS.VISITOR_60,
                    description: '通常単発 [非会員/ビジター 60分]',
                },
            ],
        },
        // [8] その他売上: 25m完泳保証パッケージ (158,000円)
        {
            id: 'ch_other_pkg',
            amount: 158000,
            paidAtUnix: weekRange.startUnix + 300000,
            metadata: {
                type: 'membership_enrollment',
                membership_type_id: 'mt_pkg_25m',
                is_package: 'true',
            },
            lines: [
                {
                    amount: 158000,
                    priceId: 'price_pkg_25m',
                    productId: 'prod_pkg_25m',
                    description: '25m完泳保証パッケージ（一括払い）',
                    metadata: {
                        type: 'membership_enrollment',
                        membership_type_id: 'mt_pkg_25m',
                        is_package: 'true',
                    },
                },
            ],
        },
        // [9] その他売上: 単発プラン システム管理費・年会費 (1,200円)
        {
            id: 'ch_other_sysfee',
            amount: 1200,
            paidAtUnix: weekRange.startUnix + 400000,
            lines: [
                {
                    amount: 1200,
                    priceId: 'price_1UDkQlP0UQGtpYXmb0jVWVrp',
                    description: '単発プラン（年会費・システム管理料）',
                    lineType: 'subscription',
                },
            ],
        },
        // [10] その他売上: Swim Step 決済 (5,000円, 日曜23:59:59 JST ちょうど)
        {
            id: 'ch_other_swimstep',
            amount: 5000,
            paidAtUnix: weekRange.endUnix,
            paymentIntentId: 'pi_swim_step_1',
            metadata: { type: 'swim_step', booking_id: 'ss_1' },
            lines: [
                {
                    amount: 5000,
                    description: 'Swim Step グループレッスン',
                    metadata: { type: 'swim_step', booking_id: 'ss_1' },
                },
            ],
        },
        // [対象外] 翌週月曜00:00:00 JST の決済 (除外されるべき)
        {
            id: 'ch_after_range',
            amount: 10000,
            paidAtUnix: weekRange.endUnix + 1,
            lines: [{ amount: 10000, priceId: 'price_single_60' }],
        },
    ]

    const refunds: NormalizedSucceededRefund[] = [
        // [返金1] 対象週内の全額返金 (6,000円)
        {
            id: 're_1',
            amount: 6000,
            createdUnix: weekRange.startUnix + 100000,
            status: 'succeeded',
            chargeId: 'ch_trial_1',
        },
        // [返金2] 対象週内の半額返金 (5,000円)
        {
            id: 're_2',
            amount: 5000,
            createdUnix: weekRange.endUnix - 100,
            status: 'succeeded',
            chargeId: 'ch_prev_week_single',
        },
        // [対象外] 失敗した返金 (status !== 'succeeded')
        {
            id: 're_failed',
            amount: 3000,
            createdUnix: weekRange.startUnix + 50000,
            status: 'failed',
        },
        // [対象外] 期間外の返金
        {
            id: 're_outside',
            amount: 10000,
            createdUnix: weekRange.endUnix + 10,
            status: 'succeeded',
        },
    ]

    const report = aggregateWeeklySalesReport({
        weekRange,
        payments,
        refunds,
        masters,
        generatedAt: cronExecutionTime,
    })

    // 手計算による期待値:
    // ストック売上 = 19,000 + 54,000 + 27,000 = 100,000
    // 新規体験売上 = 6,000 + 9,000 = 15,000
    // 単発売上     = 14,000 + 10,000 + 9,000 = 33,000
    // その他売上   = 158,000 + 1,200 + 5,000 = 164,200
    // 内訳合計     = 100,000 + 15,000 + 33,000 + 164,200 = 312,200
    // 返金         = 6,000 + 5,000 = 11,000
    // 確定売上合計 = 312,200 - 11,000 = 301,200
    // 決済件数     = 10件
    assert.equal(report.stockSales, 100000, 'ストック売上が手計算(100,000円)と一致すること')
    assert.equal(report.trialSales, 15000, '新規体験売上が手計算(15,000円)と一致すること')
    assert.equal(report.singleSales, 33000, '単発売上が手計算(33,000円)と一致すること')
    assert.equal(report.otherSales, 164200, 'その他売上が手計算(164,200円)と一致すること')
    assert.equal(report.refundAmount, 11000, '返金が手計算(11,000円)と一致すること')
    assert.equal(report.confirmedTotalSales, 301200, '確定売上合計が手計算(301,200円)と一致すること')
    assert.equal(report.paymentCount, 10, '決済件数が手計算(10件)と一致すること')
    assert.equal(report.generatedAt, '2026-11-16 04:30:00', '生成日時がJST表記であること')

    console.log('[OK] 2. テストデータ集計値と手計算の一致検証:')
    console.table(report)

    // -------------------------------------------------------------------------
    // 3. スプレッドシート出力と冪等性（同一週の上書き更新・二重計上防止）検証
    // -------------------------------------------------------------------------
    const mockSheets = new InMemorySheetsMock()
    const testSpreadsheetId = '1TestSpreadsheetIdForWeeklySalesReport999999'

    // 初回実行 (2026-11-09週) -> 新規追記 (Row 2)
    const write1 = await writeWeeklySalesReportToSheet({
        report,
        spreadsheetIdOrUrl: `https://docs.google.com/spreadsheets/d/${testSpreadsheetId}/edit#gid=0`,
        sheetsClient: mockSheets,
    })
    assert.equal(write1.action, 'appended', '初回実行は appended になること')
    assert.equal(write1.rowNumber, 2, 'ヘッダーの次の2行目に追加されること')

    let currentRows = mockSheets.rowsBySheet.get(WEEKLY_SALES_SHEET_TITLE)!
    assert.equal(currentRows.length, 2, 'ヘッダー行 + データ1行 = 計2行であること')
    assert.deepEqual(currentRows[0], [...WEEKLY_SALES_HEADERS], '1行目が指定の10列ヘッダーであること')

    // 同一週で再実行 (返金が1,000円増えたケースを想定) -> 2行目を上書き更新し、行数が増えないこと
    const rerunTime = new Date('2026-11-16T05:00:00+09:00')
    const updatedReport = {
        ...report,
        refundAmount: 12000,
        confirmedTotalSales: 300200,
        generatedAt: '2026-11-16 05:00:00',
    }
    const write2 = await writeWeeklySalesReportToSheet({
        report: updatedReport,
        spreadsheetIdOrUrl: testSpreadsheetId,
        sheetsClient: mockSheets,
    })
    assert.equal(write2.action, 'updated', '同一週の再実行は updated になること')
    assert.equal(write2.rowNumber, 2, '既存の2行目が上書き更新されること')

    currentRows = mockSheets.rowsBySheet.get(WEEKLY_SALES_SHEET_TITLE)!
    assert.equal(currentRows.length, 2, '再実行しても行が重複せず計2行のままであること')
    assert.equal(currentRows[1][6], 12000, '返金列が最新値(12,000)に上書きされていること')
    assert.equal(currentRows[1][7], 300200, '確定売上合計列が最新値(300,200)に上書きされていること')
    assert.equal(currentRows[1][9], '2026-11-16 05:00:00', '生成日時が更新されていること')

    // 翌週分の実行 (2026-11-16週) -> 3行目に新規追記されること
    const nextWeekRange = getPreviousWeekRangeJst(new Date('2026-11-23T04:30:00+09:00'))
    const nextWeekReport = aggregateWeeklySalesReport({
        weekRange: nextWeekRange,
        payments: [],
        refunds: [],
        masters,
        generatedAt: new Date('2026-11-23T04:30:00+09:00'),
    })
    const write3 = await writeWeeklySalesReportToSheet({
        report: nextWeekReport,
        spreadsheetIdOrUrl: testSpreadsheetId,
        sheetsClient: mockSheets,
    })
    assert.equal(write3.action, 'appended', '異なる週の実行は appended になること')
    assert.equal(write3.rowNumber, 3, '3行目に追記されること')
    currentRows = mockSheets.rowsBySheet.get(WEEKLY_SALES_SHEET_TITLE)!
    assert.equal(currentRows.length, 3, '計3行（ヘッダー + 2週分）になること')

    console.log(
        '[OK] 3. 冪等性検証: 初回追記(Row 2) → 同一週再実行で上書き更新(Row 2のまま重複なし) → 翌週実行で新規追記(Row 3)'
    )

    // -------------------------------------------------------------------------
    // 4. エンドポイント認証ガードの検証
    // -------------------------------------------------------------------------
    const originalCronSecret = process.env.CRON_SECRET
    try {
        process.env.CRON_SECRET = 'test_super_secret_cron_token_123'

        // (a) Authorizationヘッダーなし
        const reqNoAuth = new Request('http://localhost:3000/api/cron/weekly-sales-report')
        const resNoAuth = await cronGetHandler(reqNoAuth)
        assert.equal(resNoAuth.status, 401, '認証ヘッダーなしは 401 Unauthorized を返すこと')

        // (b) 不正なトークン
        const reqWrongAuth = new Request('http://localhost:3000/api/cron/weekly-sales-report', {
            headers: { authorization: 'Bearer invalid_token' },
        })
        const resWrongAuth = await cronGetHandler(reqWrongAuth)
        assert.equal(resWrongAuth.status, 401, '不正なトークンは 401 Unauthorized を返すこと')

        // (c) CRON_SECRET 環境変数自体が未設定の場合も拒否すること
        delete process.env.CRON_SECRET
        const reqEmptySecret = new Request('http://localhost:3000/api/cron/weekly-sales-report', {
            headers: { authorization: 'Bearer ' },
        })
        const resEmptySecret = await cronGetHandler(reqEmptySecret)
        assert.equal(
            resEmptySecret.status,
            401,
            'CRON_SECRET未設定時も認証なしで実行できないこと (401)'
        )
    } finally {
        if (originalCronSecret === undefined) {
            delete process.env.CRON_SECRET
        } else {
            process.env.CRON_SECRET = originalCronSecret
        }
    }

    console.log(
        '[OK] 4. エンドポイント認証検証: ヘッダーなし(401) / 不正トークン(401) / CRON_SECRET未設定時(401) すべて遮断確認'
    )
    console.log('\n=== 全受け入れ条件のローカル検証が完了しました ===')
}

runVerification().catch(err => {
    console.error('検証エラー:', err)
    process.exit(1)
})
