import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CreditCard } from 'lucide-react'
import StripePortalButton from '@/app/member/profile/StripePortalButton'
import MembershipBillingCard from '@/components/member/MembershipBillingCard'
import { getAppConfig } from '@/actions/app_configs'

import { getCachedMemberData } from '@/lib/member-data'

export default async function MemberBillingPage() {
    const { user, student } = await getCachedMemberData();

    if (!user) {
        redirect('/member/login')
    }

    if (!student) {
        console.error('Failed to fetch student profile')
        redirect('/member/dashboard')
    }

    // 会員区分がいずれも設定されていない（入会していない）場合はアクセス拒否
    if (!student.membership_type_id && !student.is_trio) {
        redirect('/member/dashboard')
    }

    const supabase = await createClient()

    // データの並列取得 (未請求レッスン、有効なプライベートプラン、進行中のプラン変更・追加申請、利用規約/同意事項設定、利用規約本文)
    const [pendingSchedulesRes, activePlansRes, pendingRequestRes, consentTerms, consentRules, termsOfService] = await Promise.all([
        supabase
            .from('lesson_schedules')
            .select('id, start_time, title, price')
            .eq('student_id', student.id)
            .in('billing_status', ['future_billing', 'pending'])
            .order('start_time', { ascending: true }),
        supabase
            .from('membership_types')
            .select('id, name, fee, active, is_package, description, rules')
            .eq('active', true)
            .eq('is_package', false)
            .not('name', 'ilike', '%trio%') // Trioプランは除外
            .order('display_order', { ascending: true }),
        supabase
            .from('membership_change_requests')
            .select('*, requested:membership_types!requested_membership_type_id(name)')
            .eq('student_id', student.id)
            .eq('status', 'pending')
            .limit(1),
        getAppConfig('enroll_consent_terms'),
        getAppConfig('enroll_rules_terms'),
        getAppConfig('terms_of_service_trial')
    ])

    const pendingSchedules = pendingSchedulesRes.data || []
    const activePlans = activePlansRes.data || []
    const pendingRequest = pendingRequestRes.data && pendingRequestRes.data.length > 0 ? pendingRequestRes.data[0] : null

    // デフォルトの同意事項 (フォールバック用)
    const defaultTerms = [
        {
            id: "billing-monthly",
            label: "クレジットカード決済の同意",
            text: "利用規約およびプライバシーポリシーに同意し、クレジットカード決済による毎月の月謝の自動引き落とし（継続課金）を承諾します。",
            target: "monthly"
        },
        {
            id: "cancel",
            label: "キャンセル規定の同意",
            text: "前日18:00以降のレッスンキャンセルについては、理由を問わず「受講1回分の消化（またはキャンセル料100%）」の取り扱いとなることを承諾します。",
            target: "all"
        }
    ]

    const consentTermsJson = consentTerms || JSON.stringify(defaultTerms)
    const consentRulesJson = consentRules || '[]'
    const termsOfServiceText = termsOfService || '利用規約が設定されていません。'

    // Trio（月2回）プランの情報を別途DBから取得（Trio追加申請時にIDが必要になるため）
    const { data: trioPlan } = await supabase
        .from('membership_types')
        .select('id, name, fee')
        .eq('active', true)
        .ilike('name', '%trio%')
        .limit(1)
        .single()

    return (
        <div className="container mx-auto px-4 py-8 pb-32 max-w-4xl min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center text-white transform rotate-3">
                    <CreditCard className="w-7 h-7" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-indigo-950 tracking-tight">ご契約・お支払い</h1>
                    <p className="text-sm font-bold text-indigo-400 mt-1 uppercase tracking-widest">Billing & Payments</p>
                </div>
            </div>

            <MembershipBillingCard
                student={student}
                activePlans={activePlans}
                pendingSchedules={pendingSchedules}
                pendingRequest={pendingRequest}
                trioPlanId={trioPlan?.id || null}
                consentTermsJson={consentTermsJson}
                consentRulesJson={consentRulesJson}
                termsOfServiceText={termsOfServiceText}
            />

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white/80 backdrop-blur-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-indigo-50/50 to-white border-b border-indigo-50/50 p-8">
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-indigo-500" />
                        <CardTitle className="text-xl font-black text-gray-800">クレジットカード情報</CardTitle>
                    </div>
                    <CardDescription className="text-gray-500 font-medium">
                        お支払い用のクレジットカードの登録・変更・確認を安全に行えます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 md:p-10 flex justify-center">
                    <StripePortalButton />
                </CardContent>
            </Card>
        </div>
    )
}
