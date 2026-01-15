'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner'
import { Search } from 'lucide-react'

interface AssignStudentsDialogProps {
    targetCoachId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

interface Student {
    id: string
    full_name: string
    coach_id: string | null
    profiles?: {
        full_name: string
    } | null
}

export function AssignStudentsDialog({ targetCoachId, open, onOpenChange, onSuccess }: AssignStudentsDialogProps) {
    const [students, setStudents] = useState<Student[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (open) {
            fetchStudents()
            setSelectedIds([])
            setSearchTerm('')
        }
    }, [open])

    const fetchStudents = async () => {
        setFetching(true)
        // Fetch all students and their current coach name
        const { data, error } = await supabase
            .from('students')
            .select('id, full_name, coach_id, profiles(full_name)')
            .order('full_name') // Assuming we might want Kana order later but using name for now

        if (data) {
            // @ts-ignore: profiles join type
            setStudents(data)
        }
        setFetching(false)
    }

    const handleAssign = async () => {
        if (selectedIds.length === 0) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('students')
                .update({ coach_id: targetCoachId })
                .in('id', selectedIds)

            if (error) throw error

            toast.success(`${selectedIds.length}名の生徒を追加しました`)
            onSuccess()
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('追加に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.full_name.includes(searchTerm)
        const isNotAlreadyAssigned = s.coach_id !== targetCoachId
        return matchesSearch && isNotAlreadyAssigned
    })

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(s => s !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>担当生徒の追加</DialogTitle>
                    <DialogDescription>
                        このコーチに担当させる生徒を選択してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="生徒名で検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2 min-h-[300px]">
                    {fetching ? (
                        <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">対象の生徒が見つかりません</div>
                    ) : (
                        filteredStudents.map(student => (
                            <div key={student.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-md">
                                <Checkbox
                                    id={`student-${student.id}`}
                                    checked={selectedIds.includes(student.id)}
                                    // @ts-ignore
                                    onCheckedChange={() => toggleSelect(student.id)}
                                />
                                <div className="grid gap-1.5 leading-none w-full">
                                    <label
                                        htmlFor={`student-${student.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {student.full_name}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        現在の担当:
                                        {student.coach_id
                                            // @ts-ignore
                                            ? (student.profiles?.full_name || '不明')
                                            : ' なし'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        {selectedIds.length} 名選択中
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
                    <Button onClick={handleAssign} disabled={selectedIds.length === 0 || loading}>
                        {loading ? '処理中...' : '追加する'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
