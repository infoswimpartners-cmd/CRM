'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Check } from 'lucide-react'

interface AssignedCoach {
    coach_id: string
    role?: string
    option_reward_fee?: number | null
    option_reward_note?: string | null
    profiles?: any
}

interface Props {
    studentId: string
    assignedCoaches: AssignedCoach[]
    isAdmin?: boolean
}

export function StudentCoachOptionEditor({ studentId, assignedCoaches, isAdmin }: Props) {
    const [fees, setFees] = useState<{ [coachId: string]: number }>(() => {
        const initial: { [coachId: string]: number } = {}
        assignedCoaches.forEach(ac => {
            initial[ac.coach_id] = ac.option_reward_fee || 0
        })
        return initial
    })
    const [loadingCoachId, setLoadingCoachId] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleSaveFee = async (coachId: string) => {
        setLoadingCoachId(coachId)
        try {
            const fee = fees[coachId] || 0
            const { error } = await supabase
                .from('student_coaches')
                .update({ option_reward_fee: fee })
                .eq('student_id', studentId)
                .eq('coach_id', coachId)

            if (error) throw error

            toast.success('オプション手当額を更新しました')
            router.refresh()
        } catch (error: any) {
            console.error('Failed to update option fee:', error)
            toast.error('手当額の更新に失敗しました')
        } finally {
            setLoadingCoachId(null)
        }
    }

    if (!assignedCoaches || assignedCoaches.length === 0) {
        return (
            <div className="text-sm text-gray-500 py-3 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                担当コーチ未設定
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {assignedCoaches.map((ac) => {
                const coach = Array.isArray(ac.profiles) ? ac.profiles[0] : ac.profiles
                if (!coach) return null
                const currentFee = fees[ac.coach_id] ?? (ac.option_reward_fee || 0)
                const isModified = currentFee !== (ac.option_reward_fee || 0)

                return (
                    <div key={ac.coach_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src={coach.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs bg-slate-200 text-slate-600 font-bold">
                                        {(coach.full_name || '?')[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-sm text-slate-800">{coach.full_name}</div>
                                </div>
                            </div>
                        </div>

                        {/* オプション手当の入力・表示 */}
                        <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-500 font-medium">個別オプション手当:</span>
                            {isAdmin ? (
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={currentFee || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0
                                            setFees(prev => ({ ...prev, [ac.coach_id]: val }))
                                        }}
                                        className="h-7 w-24 text-xs px-2 bg-white border-slate-200 focus-visible:ring-indigo-500 font-mono font-bold"
                                    />
                                    <span className="text-slate-500">円</span>
                                    <Button
                                        size="sm"
                                        variant={isModified ? "default" : "outline"}
                                        onClick={() => handleSaveFee(ac.coach_id)}
                                        disabled={loadingCoachId === ac.coach_id}
                                        className="h-7 px-2.5 text-xs gap-1"
                                    >
                                        {loadingCoachId === ac.coach_id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Check className="h-3 w-3" />
                                        )}
                                        保存
                                    </Button>
                                </div>
                            ) : (
                                <span className="font-bold font-mono text-slate-700">
                                    +{currentFee.toLocaleString()}円
                                </span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
