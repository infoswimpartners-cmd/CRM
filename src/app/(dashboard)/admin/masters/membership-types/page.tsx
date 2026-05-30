import { createClient } from '@/lib/supabase/server'
import { AddMembershipTypeDialog } from '@/components/admin/AddMembershipTypeDialog'
import { MembershipTypeTable } from '@/components/admin/MembershipTypeTable'
import { AddPackageTypeDialog } from '@/components/admin/AddPackageTypeDialog'
import { PackageTypeTable } from '@/components/admin/PackageTypeTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Package, CalendarDays, Eye } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MastersNav } from '@/components/admin/MastersNav'
import { EnrollTermsSettingsForm } from '@/components/admin/EnrollTermsSettingsForm'
import { EnrollRulesSettingsForm } from '@/components/admin/EnrollRulesSettingsForm'
import { EnrollSinglePriceConfigForm } from '@/components/admin/EnrollSinglePriceConfigForm'
import { getAppConfig } from '@/actions/app_configs'

export const dynamic = 'force-dynamic'

export default async function MembershipTypesPage() {
    const supabase = await createClient()

    // 入会フォーム用同意事項チェックリスト設定の読み込み
    const defaultTerms = [
        {
            id: "billing-monthly",
            label: "クレジットカード決済の同意 (月謝プラン用)",
            text: "利用規約およびプライバシーポリシーに同意し、クレジットカード決済による毎月の月謝の自動引き落とし（継続課金）を承諾します。",
            target: "monthly"
        },
        {
            id: "billing-package",
            label: "クレジットカード決済の同意 (パッケージプラン用)",
            text: "利用規約およびプライバシーポリシーに同意し、パッケージプランの一括決済（クレジットカード決済）を行うことに同意します。",
            target: "package"
        },
        {
            id: "cancel",
            label: "キャンセル規定の同意",
            text: "前日18:00以降のレッスンキャンセルについては、理由を問わず「受講1回分の消化（またはキャンセル料100%）」の取り扱いとなることを承諾します。",
            target: "all"
        },
        {
            id: "initial-lessons",
            label: "初回レッスン枠自動割り当ての同意",
            text: "体験レッスン後、初回月謝プランによる正式な第1回目・第2回目のレッスン枠については、コーチの手配を迅速に行うために事務局による自動割り当て（または指定手配）となることを承諾します。",
            target: "monthly"
        }
    ];
    const initialTermsJson = await getAppConfig('enroll_consent_terms') || JSON.stringify(defaultTerms);

    // 入会フォーム用受講ルールチェックリスト設定の読み込み（デフォルト値をフォールバックに設定）
    const defaultRules = [
        {
            id: "rule-facility-fee",
            label: "コーチの交通費・施設利用料",
            text: "コーチの交通費・施設利用料がすべて含まれています。",
            target: "all"
        },
        {
            id: "rule-transfer-period",
            label: "振替の有効期間 (月謝用)",
            text: "振替の有効期間は【2ヶ月間】となります。",
            target: "monthly"
        },
        {
            id: "rule-no-admission-fee",
            label: "入会金・年会費不要",
            text: "入会金・年会費は一切かかりません。",
            target: "all"
        },
        {
            id: "rule-package-guarantee",
            label: "完泳保証 (パッケージ用)",
            text: "プロの完泳保証付き（万が一12回で泳げなかった場合、最大4回分の補講レッスンを無償提供）。",
            target: "package"
        }
    ];
    const initialRulesJson = await getAppConfig('enroll_rules_terms') || JSON.stringify(defaultRules);

    // 単発レッスン料金表示設定の読み込み
    const initialShowSinglePrices = await getAppConfig('enroll_show_single_prices') || 'true';

    const { data: allTypes } = await supabase
        .from('membership_types')
        .select(`
            *,
            default_lesson:lesson_masters!default_lesson_master_id (
                name
            )
        `)
        .order('display_order', { ascending: true })

    // 月次プランとパッケージプランを分離
    const monthlyTypes = (allTypes || []).filter((t: any) => !t.is_package)
    const packageTypes = (allTypes || []).filter((t: any) => t.is_package)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">マスタ管理</h1>
                        <p className="text-gray-500">各種マスタデータの設定を行います。</p>
                    </div>
                </div>
                <Button variant="outline" className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 shadow-sm" asChild>
                    <a href="/enroll?preview=true" target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 text-slate-500" />
                        入会フォームのプレビュー
                    </a>
                </Button>
            </div>

            <MastersNav />

            <Tabs defaultValue="monthly" className="w-full">
                <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6">
                    <TabsTrigger value="monthly" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        月次プラン
                    </TabsTrigger>
                    <TabsTrigger value="package" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        パッケージ
                    </TabsTrigger>
                </TabsList>

                {/* 月次プランタブ */}
                <TabsContent value="monthly">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">月次プラン一覧</h2>
                            <p className="text-sm text-slate-500 mt-0.5">毎月の継続課金プランを管理します。</p>
                        </div>
                        <AddMembershipTypeDialog />
                    </div>
                    <MembershipTypeTable types={monthlyTypes as any} />
                </TabsContent>

                {/* パッケージプランタブ */}
                <TabsContent value="package">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">パッケージプラン一覧</h2>
                            <p className="text-sm text-slate-500 mt-0.5">一括払いのチケット制プランを管理します。決済完了時にチケットが自動付与されます。</p>
                        </div>
                        <AddPackageTypeDialog />
                    </div>
                    <PackageTypeTable types={packageTypes as any} />
                </TabsContent>
            </Tabs>

            <EnrollTermsSettingsForm
                initialTermsJson={initialTermsJson}
            />

            <EnrollRulesSettingsForm
                initialRulesJson={initialRulesJson}
            />

            <EnrollSinglePriceConfigForm
                initialShowSinglePrices={initialShowSinglePrices}
            />
        </div>
    )
}
