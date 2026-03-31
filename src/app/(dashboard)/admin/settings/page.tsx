import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from 'lucide-react'
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm"
import { PaymentSlipTemplateForm } from "@/components/admin/PaymentSlipTemplateForm"

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
                        <p>リマインドメールの設定は「メール設定」メニューに統合されました。</p>
                        <a href="/admin/email-templates" className="text-blue-600 underline mt-2 inline-block">メール設定へ移動</a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
