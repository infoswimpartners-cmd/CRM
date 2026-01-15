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
    const [sheet, setSheet] = useState<CounselingSheet>({
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
                const { error } = await supabase
                    .from('counseling_sheets')
                    .insert({
                        student_id: studentId,
                        swimming_experience: sheet.swimming_experience,
                        goals: sheet.goals,
                        health_conditions: sheet.health_conditions
                    })
                if (error) throw error
            }

            toast.success('カウンセリングシートを保存しました')
        } catch (err) {
            console.error(err)
            toast.error('保存に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <Card>
            <CardHeader>
                <CardTitle>カウンセリングシート</CardTitle>
                <CardDescription>初回ヒアリング等の情報を記録します。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>水泳経験</Label>
                    <Textarea
                        value={sheet.swimming_experience}
                        onChange={(e) => setSheet({ ...sheet, swimming_experience: e.target.value })}
                        placeholder="例: クロール25m可能、平泳ぎ練習中"
                    />
                </div>
                <div className="space-y-2">
                    <Label>目標</Label>
                    <Textarea
                        value={sheet.goals}
                        onChange={(e) => setSheet({ ...sheet, goals: e.target.value })}
                        placeholder="例: 夏までに50m泳げるようになりたい"
                    />
                </div>
                <div className="space-y-2">
                    <Label>既往歴・健康状態</Label>
                    <Textarea
                        value={sheet.health_conditions}
                        onChange={(e) => setSheet({ ...sheet, health_conditions: e.target.value })}
                        placeholder="例: 特になし、喘息気味"
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
