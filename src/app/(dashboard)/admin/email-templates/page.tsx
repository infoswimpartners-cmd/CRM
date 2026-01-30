
import { getEmailTemplates } from '@/actions/email-template'
import { EmailTemplateManager } from '@/components/admin/EmailTemplateManager'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'メールテンプレート管理 | Swim Partners',
}

export default async function EmailTemplatesPage() {
    const templates = await getEmailTemplates()

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto h-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">メール設定</h1>
                <p className="text-gray-500 mt-2">
                    システムから送信される自動返信メールや通知メールの内容を編集できます。
                </p>
            </div>

            <EmailTemplateManager templates={templates} />
        </div>
    )
}
