
'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function CompanySettingsForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        company_name: '',
        company_address: '',
        invoice_registration_number: '',
        contact_email: '',
        company_payment_bank_name: ''
    })

    useEffect(() => {
        fetch('/api/admin/settings/company')
            .then(res => res.json())
            .then(data => {
                setFormData({
                    company_name: data.company_name || '',
                    company_address: data.company_address || '',
                    invoice_registration_number: data.invoice_registration_number || '',
                    contact_email: data.contact_email || '',
                    company_payment_bank_name: data.company_payment_bank_name || ''
                })
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/admin/settings/company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (!res.ok) throw new Error('Failed to update')
            toast.success('基本情報を更新しました')
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
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="company_name">会社名</Label>
                    <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="例: 株式会社スイムテック"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invoice_registration_number">インボイス登録番号</Label>
                    <Input
                        id="invoice_registration_number"
                        value={formData.invoice_registration_number}
                        onChange={e => setFormData({ ...formData, invoice_registration_number: e.target.value })}
                        placeholder="例: T1234567890123"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="company_address">住所</Label>
                    <Input
                        id="company_address"
                        value={formData.company_address}
                        onChange={e => setFormData({ ...formData, company_address: e.target.value })}
                        placeholder="東京都渋谷区..."
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contact_email">連絡先メールアドレス</Label>
                    <Input
                        id="contact_email"
                        value={formData.contact_email}
                        onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="support@example.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="company_payment_bank_name">支払い元銀行名 (表示用)</Label>
                    <Input
                        id="company_payment_bank_name"
                        value={formData.company_payment_bank_name}
                        onChange={e => setFormData({ ...formData, company_payment_bank_name: e.target.value })}
                        placeholder="例: 三井住友銀行 渋谷支店"
                    />
                </div>
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
