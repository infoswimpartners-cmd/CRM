import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_QUEST_FINANCE_SETTINGS, QuestFinanceSettings } from '@/types/quest-erp'

export const dynamic = 'force-dynamic'

// 現在の固定費・財務設定を取得
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 })
        }

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('app_configs')
            .select('value')
            .eq('key', 'quest_finance_settings')
            .maybeSingle()

        if (error) {
            console.error('[API Quest Settings GET] Error:', error)
            return NextResponse.json(DEFAULT_QUEST_FINANCE_SETTINGS)
        }

        let settings = { ...DEFAULT_QUEST_FINANCE_SETTINGS }
        if (data?.value) {
            try {
                settings = { ...settings, ...JSON.parse(data.value) }
            } catch (e) {
                console.warn('[API Quest Settings GET] JSON parse error, using defaults:', e)
            }
        }

        return NextResponse.json(settings)
    } catch (err: any) {
        console.error('[API Quest Settings GET] Exception:', err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}

// 固定費・財務設定を更新
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 })
        }

        const body = await request.json()

        // 既存設定を取得してマージ
        const adminClient = createAdminClient()
        const { data: existingData } = await adminClient
            .from('app_configs')
            .select('value')
            .eq('key', 'quest_finance_settings')
            .maybeSingle()

        let currentSettings = { ...DEFAULT_QUEST_FINANCE_SETTINGS }
        if (existingData?.value) {
            try {
                currentSettings = { ...currentSettings, ...JSON.parse(existingData.value) }
            } catch (e) {
                // ignore
            }
        }

        const updatedSettings: QuestFinanceSettings = {
            ...currentSettings,
            safe_reserve_cash: Number(body.safe_reserve_cash ?? currentSettings.safe_reserve_cash),
            total_cash_balance: Number(body.total_cash_balance ?? currentSettings.total_cash_balance),
            ad_spend_google_default: Number(body.ad_spend_google_default ?? currentSettings.ad_spend_google_default),
            ad_spend_meta_default: Number(body.ad_spend_meta_default ?? currentSettings.ad_spend_meta_default),
            system_tool_cost_default: Number(body.system_tool_cost_default ?? currentSettings.system_tool_cost_default),
            insurance_cost_default: Number(body.insurance_cost_default ?? currentSettings.insurance_cost_default),
            joto_friday_capacity: Number(body.joto_friday_capacity ?? currentSettings.joto_friday_capacity),
            facility_cost_per_lesson: Number(body.facility_cost_per_lesson ?? currentSettings.facility_cost_per_lesson),
            ceo_hourly_rate: Number(body.ceo_hourly_rate ?? currentSettings.ceo_hourly_rate),
        }

        const { error: upsertError } = await adminClient
            .from('app_configs')
            .upsert({
                key: 'quest_finance_settings',
                value: JSON.stringify(updatedSettings),
                description: 'SwimPartners Quest 財務マスタ・固定費・資金設定',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' })

        if (upsertError) {
            console.error('[API Quest Settings POST] Upsert error:', upsertError)
            return NextResponse.json({ error: upsertError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            settings: updatedSettings,
        })
    } catch (err: any) {
        console.error('[API Quest Settings POST] Exception:', err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}
