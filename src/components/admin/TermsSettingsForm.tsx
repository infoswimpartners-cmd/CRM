'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function TermsSettingsForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [termsText, setTermsText] = useState('')

    useEffect(() => {
        fetch('/api/admin/settings/terms')
            .then(res => res.json())
            .then(data => {
                setTermsText(data.terms_of_service_trial || '')
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/admin/settings/terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ terms_of_service_trial: termsText })
            })
            if (!res.ok) throw new Error('Failed to update')
            toast.success('利用規約を更新しました')
        } catch (error) {
            console.error(error)
            toast.error('更新に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /></div>

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="terms_text">体験申し込みの利用規約</Label>
                <p className="text-xs text-slate-500 mb-2">申し込みフォーム内に表示される利用規約の文章を設定します。</p>
                <Textarea
                    id="terms_text"
                    value={termsText}
                    onChange={e => setTermsText(e.target.value)}
                    placeholder="利用規約の本文を入力してください"
                    className="min-h-[300px]"
                />
            </div>
            
            <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    更新する
                </Button>
            </div>
        </form>
    )
}
