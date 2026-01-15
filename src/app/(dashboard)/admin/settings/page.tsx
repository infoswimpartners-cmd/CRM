import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { TemplateEditorForm } from '@/components/admin/TemplateEditorForm'

export default async function SettingsPage() {
    const supabase = await createClient()

    // Fetch Body
    const { data: bodyConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'reminder_email_template')
        .single()

    // Fetch Subject
    const { data: subjectConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'reminder_email_subject')
        .single()

    const initialBody = bodyConfig?.value || ''
    const initialSubject = subjectConfig?.value || '【Swim Partners】明日のレッスン予約のリマインド'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">システム設定</h1>
                <p className="text-gray-500">アプリケーションの環境設定</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>リマインドメール設定</CardTitle>
                    <CardDescription>
                        自動送信されるリマインドメールの件名と本文を編集します。<br />
                        以下の変数が使用可能です: {'{{student_name}}'}, {'{{date}}'}, {'{{time}}'}, {'{{coach_name}}'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TemplateEditorForm initialSubject={initialSubject} initialBody={initialBody} />
                </CardContent>
            </Card>
        </div>
    )
}
