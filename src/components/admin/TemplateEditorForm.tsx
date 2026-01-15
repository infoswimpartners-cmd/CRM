'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateEmailTemplate, sendTestEmail } from '@/app/(dashboard)/admin/settings/actions_v2'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'

interface TemplateEditorFormProps {
    initialSubject: string
    initialBody: string
}

export function TemplateEditorForm({ initialSubject, initialBody }: TemplateEditorFormProps) {
    const [subject, setSubject] = useState(initialSubject ?? '')
    const [body, setBody] = useState(initialBody ?? '')
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateEmailTemplate(subject, body)
            if (result.error) {
                toast.error('保存に失敗しました: ' + result.error)
            } else {
                toast.success('設定を保存しました')
            }
        } catch (e) {
            toast.error('エラーが発生しました')
        } finally {
            setIsSaving(false)
        }
    }

    const handleTestSend = async () => {
        setIsTesting(true)
        try {
            const result = await sendTestEmail(subject, body)
            if (result.error) {
                toast.error('テスト送信に失敗しました: ' + result.error)
            } else {
                toast.success(`テストメールを送信しました (${result.email})`)
            }
        } catch (e) {
            toast.error('エラーが発生しました')
        } finally {
            setIsTesting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="subject">件名</Label>
                <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="【Swim Partners】明日のレッスン予約のリマインド"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="body">本文</Label>
                <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                />
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={handleTestSend} disabled={isTesting || isSaving}>
                    {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    テスト送信
                </Button>
                <Button onClick={handleSave} disabled={isSaving || isTesting}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存
                </Button>
            </div>
        </div>
    )
}
