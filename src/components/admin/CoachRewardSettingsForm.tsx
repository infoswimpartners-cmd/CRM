'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateCoachRewardAction } from "@/actions/coaches"

interface CoachRewardSettingsFormProps {
    coachId: string
    initialDistantRewardFee: number
}

export function CoachRewardSettingsForm({ coachId, initialDistantRewardFee }: CoachRewardSettingsFormProps) {
    const [saving, setSaving] = useState(false)
    const [fee, setFee] = useState(initialDistantRewardFee?.toString() || '0')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const parsedFee = parseInt(fee, 10)
            if (isNaN(parsedFee)) throw new Error('数値を入力してください')

            const result = await updateCoachRewardAction(coachId, parsedFee)
            if (!result.success) throw new Error(result.error)

            toast.success('報酬設定を更新しました')
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
                <Label htmlFor="distant_reward_fee">遠方対応時の追加報酬（円）</Label>
                <Input
                    id="distant_reward_fee"
                    type="number"
                    value={fee}
                    onChange={e => setFee(e.target.value)}
                    placeholder="例: 4000"
                    required
                />
                <p className="text-xs text-muted-foreground mt-1">
                    顧客が「遠方オプション」を選択した際に、コーチに加算される報酬額です。
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
