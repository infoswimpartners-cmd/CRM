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
        } catch (err) {
            toast.error('保存に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>カルテ / 備考管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[200px]"
                    placeholder="生徒に関する特記事項、健康状態のメモなどを記録します。"
                />
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
