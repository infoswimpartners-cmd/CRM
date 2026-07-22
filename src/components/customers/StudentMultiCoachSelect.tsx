'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

interface Coach {
    id: string
    full_name: string
    avatar_url?: string | null
}

interface AssignedCoach {
    coach_id: string
    role?: string
    option_reward_fee?: number | null
    option_reward_note?: string | null
}

interface Props {
    studentId: string
    initialAssignedCoaches: AssignedCoach[]
    initialMainCoachId?: string | null
    coaches?: Coach[]
    triggerText?: string
    variant?: 'outline' | 'default' | 'ghost'
}

export function StudentMultiCoachSelect({ studentId, initialAssignedCoaches, coaches: propCoaches, triggerText, variant = 'outline' }: Props) {
    const [assignedCoaches, setAssignedCoaches] = useState<string[]>(initialAssignedCoaches.map(c => c.coach_id))
    const [optionFees, setOptionFees] = useState<{ [coachId: string]: number }>({})
    const [optionNotes, setOptionNotes] = useState<{ [coachId: string]: string }>({})
    const [localCoaches, setLocalCoaches] = useState<Coach[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        setAssignedCoaches(initialAssignedCoaches.map(c => c.coach_id))
        
        const fees: { [coachId: string]: number } = {}
        const notes: { [coachId: string]: string } = {}
        initialAssignedCoaches.forEach(c => {
            fees[c.coach_id] = c.option_reward_fee || 0
            notes[c.coach_id] = c.option_reward_note || ''
        })
        setOptionFees(fees)
        setOptionNotes(notes)
    }, [initialAssignedCoaches])

    useEffect(() => {
        if (propCoaches && propCoaches.length > 0) {
            setLocalCoaches(propCoaches)
            return
        }

        const fetchCoaches = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('role', ['coach', 'admin', 'owner'])
                .order('full_name', { ascending: true })

            if (data) {
                setLocalCoaches(data)
            }
        }
        fetchCoaches()
    }, [propCoaches])

    const handleSave = async () => {
        setLoading(true)
        try {
            const primaryCoachId = assignedCoaches.length > 0 ? assignedCoaches[0] : null

            // Update students table (primary coach for legacy compatibility)
            const { error: studentError } = await supabase
                .from('students')
                .update({ coach_id: primaryCoachId })
                .eq('id', studentId)

            if (studentError) throw studentError

            // Update student_coaches table
            await supabase.from('student_coaches').delete().eq('student_id', studentId)

            if (assignedCoaches.length > 0) {
                const records = assignedCoaches.map(cId => ({
                    student_id: studentId,
                    coach_id: cId,
                    role: 'assigned',
                    option_reward_fee: optionFees[cId] || 0,
                    option_reward_note: optionNotes[cId] || null
                }))
                
                await supabase.from('student_coaches').insert(records)
            }

            toast.success('担当コーチを更新しました')
            setOpen(false)
            router.refresh()
        } catch (error: any) {
            toast.error('更新に失敗しました')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const toggleCoach = (id: string, checked: boolean) => {
        if (checked) {
            setAssignedCoaches(prev => [...prev, id])
        } else {
            setAssignedCoaches(prev => prev.filter(cId => cId !== id))
        }
    }

    const firstAssignedCoach = localCoaches.find(c => assignedCoaches.includes(c.id))
    const extraCount = assignedCoaches.length > 1 ? assignedCoaches.length - 1 : 0

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant={variant} 
                    size="sm" 
                    className="h-7 rounded-full px-3 text-xs font-medium gap-2 border-gray-200 hover:bg-gray-50 bg-white"
                >
                    <div className="flex items-center gap-1 max-w-[140px] overflow-hidden">
                        {triggerText ? (
                            <span>{triggerText}</span>
                        ) : firstAssignedCoach ? (
                            <span className="truncate">{firstAssignedCoach.full_name}</span>
                        ) : (
                            <span className="text-gray-400">担当なし</span>
                        )}
                        {!triggerText && extraCount > 0 && (
                            <span className="text-gray-500 whitespace-nowrap text-[10px] bg-gray-100 px-1 rounded">+{extraCount}</span>
                        )}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-2" align="start">
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 px-1 pt-1 ml-1">担当コーチを選択</div>
                    <div className="max-h-[340px] overflow-y-auto space-y-2 p-1">
                        {localCoaches.map((coach) => {
                            const isAssigned = assignedCoaches.includes(coach.id)
                            return (
                                <div key={coach.id} className="p-2 rounded-md border border-gray-100 bg-gray-50/50 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id={`coach-${coach.id}`}
                                            checked={isAssigned}
                                            onCheckedChange={(checked) => toggleCoach(coach.id, checked as boolean)}
                                        />
                                        <div className="flex-1 flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={coach.avatar_url || undefined} />
                                                <AvatarFallback className="text-[10px]">{(coach.full_name || '?')[0]}</AvatarFallback>
                                            </Avatar>
                                            <Label htmlFor={`coach-${coach.id}`} className="text-xs cursor-pointer flex-1 py-0.5 font-medium">
                                                {coach.full_name}
                                            </Label>
                                        </div>
                                    </div>

                                    {/* オプション手当設定 */}
                                    {isAssigned && (
                                        <div className="pl-6 pt-1 flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-500 whitespace-nowrap">オプション手当:</span>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={optionFees[coach.id] || ''}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0
                                                    setOptionFees(prev => ({ ...prev, [coach.id]: val }))
                                                }}
                                                className="h-6 w-20 text-[11px] px-1.5 py-0 bg-white"
                                            />
                                            <span className="text-[10px] text-gray-500">円</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className="pt-2 border-t flex justify-end gap-2 p-1">
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs px-3">
                            キャンセル
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={loading} className="h-8 text-xs px-4">
                            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            保存
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
