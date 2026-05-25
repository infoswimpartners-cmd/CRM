'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CounselingSheet {
    id?: string
    swimming_experience: string
    goals: string
    health_conditions: string
}

export function StudentCounseling({ studentId }: { studentId: string }) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [sheet, setSheet] = useState<CounselingSheet>({
        swimming_experience: '',
        goals: '',
        health_conditions: ''
    })
    const [originalSheet, setOriginalSheet] = useState<CounselingSheet>({
        swimming_experience: '',
        goals: '',
        health_conditions: ''
    })

    useEffect(() => {
        const fetchSheet = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('counseling_sheets')
                .select('*')
                .eq('student_id', studentId)
                .single()

            if (data) {
                setSheet(data)
                setOriginalSheet(data)
            }
            setLoading(false)
        }
        fetchSheet()
    }, [studentId])

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()

        try {
            if (sheet.id) {
                // Update
                const { error } = await supabase
                    .from('counseling_sheets')
                    .update({
                        swimming_experience: sheet.swimming_experience,
                        goals: sheet.goals,
                        health_conditions: sheet.health_conditions
                    })
                    .eq('id', sheet.id)
                if (error) throw error
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('counseling_sheets')
                    .insert({
                        student_id: studentId,
                        swimming_experience: sheet.swimming_experience,
                        goals: sheet.goals,
                        health_conditions: sheet.health_conditions
                    })
                    .select()
                    .single()
                if (error) throw error
                if (data) {
                    setSheet(data)
                    setOriginalSheet(data)
                }
            }

            setOriginalSheet(sheet)
            toast.success('カウンセリングシートを保存しました')
            setIsEditing(false)
        } catch (err) {
            console.error(err)
            toast.error('保存に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setSheet(originalSheet)
        setIsEditing(false)
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-bold text-slate-800">カウンセリングシート</CardTitle>
                <CardDescription className="text-xs text-slate-500">初回ヒアリング等の情報を記録します。</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5 md:space-y-4">
                <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs font-bold text-slate-500">水泳経験</Label>
                    {isEditing ? (
                        <Textarea
                            value={sheet.swimming_experience}
                            onChange={(e) => setSheet({ ...sheet, swimming_experience: e.target.value })}
                            className="min-h-[60px] md:min-h-[80px] bg-white border-slate-200 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 text-slate-900 text-xs md:text-sm py-1.5"
                            placeholder="例: クロール25m可能、平泳ぎ練習中"
                        />
                    ) : (
                        <div className="p-2 md:p-3 rounded-lg border border-slate-200/60 bg-slate-50/50 text-slate-700 text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text">
                            {sheet.swimming_experience || <span className="text-slate-400 italic">未入力</span>}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs font-bold text-slate-500">目標</Label>
                    {isEditing ? (
                        <Textarea
                            value={sheet.goals}
                            onChange={(e) => setSheet({ ...sheet, goals: e.target.value })}
                            className="min-h-[60px] md:min-h-[80px] bg-white border-slate-200 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 text-slate-900 text-xs md:text-sm py-1.5"
                            placeholder="例: 夏までに50m泳げるようになりたい"
                        />
                    ) : (
                        <div className="p-2 md:p-3 rounded-lg border border-slate-200/60 bg-slate-50/50 text-slate-700 text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text">
                            {sheet.goals || <span className="text-slate-400 italic">未入力</span>}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] md:text-xs font-bold text-slate-500">既往歴・健康状態</Label>
                    {isEditing ? (
                        <Textarea
                            value={sheet.health_conditions}
                            onChange={(e) => setSheet({ ...sheet, health_conditions: e.target.value })}
                            className="min-h-[60px] md:min-h-[80px] bg-white border-slate-200 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 text-slate-900 text-xs md:text-sm py-1.5"
                            placeholder="例: 特になし、喘息気味"
                        />
                    ) : (
                        <div className="p-2 md:p-3 rounded-lg border border-slate-200/60 bg-slate-50/50 text-slate-700 text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text">
                            {sheet.health_conditions || <span className="text-slate-400 italic">未入力</span>}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    {isEditing ? (
                        <>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleCancel}
                                className="border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                キャンセル
                            </Button>
                            <Button 
                                size="sm"
                                onClick={handleSave} 
                                disabled={saving}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
                            >
                                {saving ? '保存中...' : '保存'}
                            </Button>
                        </>
                    ) : (
                        <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800"
                        >
                            変更
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
