
import { getEmailTemplates, getEmailTriggers } from '@/actions/email-template'
import { EmailTemplateManager } from '@/components/admin/EmailTemplateManager'
import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
    title: 'メッセージ設定 | Swim Partners',
}

export default async function EmailTemplatesPage() {
    const templates = await getEmailTemplates()
    const triggers = await getEmailTriggers()

    // 体験レッスンマスタの取得
    const supabase = createAdminClient()
    const { data: trialMasters } = await supabase
        .from('lesson_masters')
        .select('*')
        .eq('is_trial', true)
        .eq('active', true)
        .order('display_order', { ascending: true })

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto h-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">メッセージ設定</h1>
                <p className="text-gray-500 mt-2">
                    LINE・メール等の自動配信メッセージや通知テンプレートの内容を一括管理・編集できます。
                </p>
            </div>

            <EmailTemplateManager templates={templates} triggers={triggers} trialMasters={trialMasters || []} />
        </div>
    )
}
