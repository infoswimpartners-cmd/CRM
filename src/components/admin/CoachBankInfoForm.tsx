
'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CoachBankInfoFormProps {
    coachId: string
}

export function CoachBankInfoForm({ coachId }: CoachBankInfoFormProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        bank_name: '',
        branch_name: '',
        account_type: '普通', // Default
        account_number: '',
        account_holder_name: '' // Kana
    })

    useEffect(() => {
        fetch(`/api/admin/coaches/${coachId}/bank`)
            .then(res => res.json())
            .then(data => {
                if (data && Object.keys(data).length > 0) {
                    setFormData({
                        bank_name: data.bank_name || '',
                        branch_name: data.branch_name || '',
                        account_type: data.account_type || '普通',
                        account_number: data.account_number || '',
                        account_holder_name: data.account_holder_name || ''
                    })
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [coachId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/coaches/${coachId}/bank`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (!res.ok) throw new Error('Failed to update')
            toast.success('口座情報を更新しました')
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
                    <Label htmlFor="bank_name">銀行名</Label>
                    <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="例: 三菱UFJ銀行"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="branch_name">支店名</Label>
                    <Input
                        id="branch_name"
                        value={formData.branch_name}
                        onChange={e => setFormData({ ...formData, branch_name: e.target.value })}
                        placeholder="例: 渋谷支店"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="account_type">口座種別</Label>
                    <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v })}>
                        <SelectTrigger>
                            <SelectValue placeholder="種別" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="普通">普通</SelectItem>
                            <SelectItem value="当座">当座</SelectItem>
                            <SelectItem value="貯蓄">貯蓄</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="account_number">口座番号</Label>
                    <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="1234567"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="account_holder_name">口座名義 (カタカナ)</Label>
                    <Input
                        id="account_holder_name"
                        value={formData.account_holder_name}
                        onChange={e => setFormData({ ...formData, account_holder_name: e.target.value })}
                        placeholder="ヤマダ タロウ"
                    />
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存する
                </Button>
            </div>
        </form>
    )
}
