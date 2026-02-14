'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CoachTaxSettingsFormProps {
    coachId: string
}

export function CoachTaxSettingsForm({ coachId }: CoachTaxSettingsFormProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [enabled, setEnabled] = useState(true)

    useEffect(() => {
        fetch(`/api/admin/coaches/${coachId}/tax`)
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setEnabled(data.enabled !== false) // Default to true if undefined
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [coachId])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/admin/coaches/${coachId}/tax`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            })

            if (!res.ok) throw new Error('Failed to update')
            toast.success('源泉徴収設定を更新しました')
        } catch (error) {
            console.error(error)
            toast.error('更新に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /></div>

    return (
        <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
                <Label htmlFor="tax-mode">源泉徴収 (10.21%)</Label>
                <div className="text-sm text-slate-500">
                    {enabled ? '適用する' : '適用しない'}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Switch
                    id="tax-mode"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                />
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存
                </Button>
            </div>
        </div>
    )
}
