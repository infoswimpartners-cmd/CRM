'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Student {
    id: string
    notes: string | null
}

export function StudentChart({ student }: { student: Student }) {
    const [notes, setNotes] = useState(student.notes || '')
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()
        try {
            const { error } = await supabase
                .from('students')
                .update({ notes })
                .eq('id', student.id)

            if (error) throw error
            toast.success('備考を保存しました')
            setIsEditing(false)
        } catch (err) {
            toast.error('保存に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setNotes(student.notes || '')
        setIsEditing(false)
    }

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-bold text-slate-800">カルテ / 備考管理</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
                {isEditing ? (
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[100px] md:min-h-[160px] bg-white border-slate-200 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 text-slate-900 text-xs md:text-sm"
                        placeholder="生徒に関する特記事項、健康状態のメモなどを記録します。"
                    />
                ) : (
                    <div className="min-h-[100px] md:min-h-[160px] w-full p-2.5 md:p-3 rounded-lg border border-slate-200/60 bg-slate-50/50 text-slate-700 text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text">
                        {notes || <span className="text-slate-400 italic">カルテ・備考録は登録されていません。</span>}
                    </div>
                )}
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
