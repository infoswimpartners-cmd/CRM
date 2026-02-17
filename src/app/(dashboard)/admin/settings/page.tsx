import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm"
import { PaymentSlipTemplateForm } from "@/components/admin/PaymentSlipTemplateForm"

export default async function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">システム設定</h1>
                <p className="text-gray-500">アプリケーションの環境設定</p>
            </div>

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
