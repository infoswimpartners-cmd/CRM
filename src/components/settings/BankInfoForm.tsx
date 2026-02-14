'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function BankInfoForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        bank_name: '',
        branch_name: '',
        account_type: '普通',
        account_number: '',
        account_holder_name: ''
    })

    useEffect(() => {
        fetch('/api/settings/bank')
            .then(res => {
                if (res.ok) return res.json()
                throw new Error('Failed to fetch')
            })
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
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, account_type: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const res = await fetch('/api/settings/bank', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                throw new Error('Failed to update')
            }

            toast.success('口座情報を更新しました')
        } catch (error) {
            console.error(error)
            toast.error('更新に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="text-center py-4 text-slate-500">読み込み中...</div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>振込先口座情報</CardTitle>
                <CardDescription>
                    報酬の振込先口座情報を入力してください。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bank_name">金融機関名</Label>
                            <Input
                                id="bank_name"
                                name="bank_name"
                                placeholder="例: みずほ銀行"
                                value={formData.bank_name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="branch_name">支店名</Label>
                            <Input
                                id="branch_name"
                                name="branch_name"
                                placeholder="例: 渋谷支店"
                                value={formData.branch_name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="account_type">口座種別</Label>
                            <Select value={formData.account_type} onValueChange={handleSelectChange}>
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
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="account_number">口座番号</Label>
                            <Input
                                id="account_number"
                                name="account_number"
                                placeholder="例: 1234567"
                                value={formData.account_number}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="account_holder_name">口座名義 (カタカナ)</Label>
                        <Input
                            id="account_holder_name"
                            name="account_holder_name"
                            placeholder="例: ヤマダ タロウ"
                            value={formData.account_holder_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存する
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
