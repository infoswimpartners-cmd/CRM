
'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function PaymentSlipTemplateForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        payment_slip_title: '',
        payment_slip_header_paid: '',
        payment_slip_header_processing: '',
        payment_slip_footer: ''
    })

    useEffect(() => {
        fetch('/api/admin/settings/payment-template')
            .then(res => res.json())
            .then(data => {
                setFormData({
                    payment_slip_title: data.payment_slip_title || '支払通知書',
                    payment_slip_header_paid: data.payment_slip_header_paid || '以下の内容で振込手続が完了いたしました。',
                    payment_slip_header_processing: data.payment_slip_header_processing || '以下の内容で支払手続きを進めております。',
                    payment_slip_footer: data.payment_slip_footer || 'Swim Partners Manager System'
                })
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/admin/settings/payment-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (!res.ok) throw new Error('Failed to update')
            toast.success('テンプレート設定を更新しました')
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
                <Label htmlFor="payment_slip_title">タイトル</Label>
                <Input
                    id="payment_slip_title"
                    value={formData.payment_slip_title}
                    onChange={e => setFormData({ ...formData, payment_slip_title: e.target.value })}
                    placeholder="例: 支払通知書"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="payment_slip_header_paid">ヘッダー文言 (支払完了時)</Label>
                <Input
                    id="payment_slip_header_paid"
                    value={formData.payment_slip_header_paid}
                    onChange={e => setFormData({ ...formData, payment_slip_header_paid: e.target.value })}
                    placeholder="例: 以下の内容で振込手続が完了いたしました。"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="payment_slip_header_processing">ヘッダー文言 (処理中)</Label>
                <Input
                    id="payment_slip_header_processing"
                    value={formData.payment_slip_header_processing}
                    onChange={e => setFormData({ ...formData, payment_slip_header_processing: e.target.value })}
                    placeholder="例: 以下の内容で支払手続きを進めております。"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="payment_slip_footer">フッター文言</Label>
                <Input
                    id="payment_slip_footer"
                    value={formData.payment_slip_footer}
                    onChange={e => setFormData({ ...formData, payment_slip_footer: e.target.value })}
                    placeholder="例: Swim Partners Manager System"
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
