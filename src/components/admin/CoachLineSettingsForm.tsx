'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateCoachLineFriendUrlAction } from "@/actions/coaches"

interface CoachLineSettingsFormProps {
    coachId: string
    initialLineFriendUrl: string
}

export function CoachLineSettingsForm({ coachId, initialLineFriendUrl }: CoachLineSettingsFormProps) {
    const [saving, setSaving] = useState(false)
    const [url, setUrl] = useState(initialLineFriendUrl || '')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const result = await updateCoachLineFriendUrlAction(coachId, url.trim())
            if (!result.success) throw new Error(result.error)

            toast.success('LINE設定を更新しました')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || '更新に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="line_friend_url">LINE友達追加URL</Label>
                <Input
                    id="line_friend_url"
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="例: https://line.me/ti/p/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                    アサイン確定時のLINE通知メッセージに挿入される、コーチ個人のLINE友達追加URLです。
                </p>
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存する
                </Button>
            </div>
        </form>
    )
}
