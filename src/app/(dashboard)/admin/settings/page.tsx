import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Bell, ArrowRight, Database, Building2 } from 'lucide-react'
import Link from 'next/link'
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm"
import { PaymentSlipTemplateForm } from "@/components/admin/PaymentSlipTemplateForm"
import { TermsSettingsForm } from "@/components/admin/TermsSettingsForm"

export default async function SettingsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return <div>Profile not found</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">システム設定</h1>
                <p className="text-gray-500">アプリケーションの環境設定</p>
            </div>

            <Card className="border-blue-200 bg-blue-50/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Database className="h-5 w-5 text-blue-600" />
                        マスタ設定（施設・レッスン種類・会員区分・報酬設定）
                    </CardTitle>
                    <CardDescription>
                        プール施設情報、レッスン種別・料金、会員種別、顧客ステータス、コーチ報酬率を一元管理できます。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 text-sm">施設管理マスタ</div>
                                    <div className="text-xs text-slate-500">プール施設・利用料設定・所在地</div>
                                </div>
                            </div>
                            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <Link href="/admin/masters/facilities">
                                    施設を開く <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                    <Database className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 text-sm">マスタ管理全体</div>
                                    <div className="text-xs text-slate-500">レッスン種類・会員区分・ステータス・報酬</div>
                                </div>
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/admin/masters">
                                    一覧へ <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>全体スケジュール - Googleカレンダー連携</CardTitle>
                    <CardDescription>
                        スクール全体のレッスンスケジュールや体験申し込みをGoogleカレンダー（メインカレンダー）と同期します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-full">
                                <Calendar className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <div className="font-medium">Googleカレンダーステータス</div>
                                {profile.google_refresh_token ? (
                                    <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        連携済み
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 mt-1">未連携</div>
                                )}
                            </div>
                        </div>
                        {profile.google_refresh_token ? (
                            <Button variant="outline" disabled className="text-green-600 border-green-200 bg-green-50">
                                連携中
                            </Button>
                        ) : (
                            <Button asChild>
                                <a href="/api/google/auth">連携する</a>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>利用規約設定</CardTitle>
                    <CardDescription>
                        体験申し込みフォームに表示される利用規約を編集します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TermsSettingsForm />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-indigo-600" />
                        Google Chat Webhook設定（コーチ通知・お知らせ配信）
                    </CardTitle>
                    <CardDescription>
                        コーチへの前日レッスンリマインドやLINE日程調整検知、全体お知らせで使用するGoogle Chatスペースを管理します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-indigo-50/30">
                        <div>
                            <div className="font-semibold text-slate-800">連携Webhookスペースの登録・編集</div>
                            <p className="text-xs text-slate-500 mt-1">
                                Google Chatの各スペースで発行したWebhook URLを一元管理できます。
                            </p>
                        </div>
                        <Button asChild className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                            <Link href="/admin/webhooks">
                                Webhook管理を開く <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>会社情報・支払通知書設定</CardTitle>
                </CardHeader>
                <CardContent>
                    <CompanySettingsForm />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>通知書テンプレート設定</CardTitle>
                </CardHeader>
                <CardContent>
                    <PaymentSlipTemplateForm />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>各種設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-blue-800">
                        <p className="font-bold">お知らせ</p>
                        <p>前日リマインドや各種通知の設定は「メッセージ設定」メニューに統合されました。</p>
                        <a href="/admin/email-templates" className="text-blue-600 underline mt-2 inline-block">メッセージ設定へ移動</a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
