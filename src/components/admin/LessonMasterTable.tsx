'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from 'sonner'
import { EditLessonTypeDialog } from './EditLessonTypeDialog'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LessonMaster {
    id: string
    name: string
    unit_price: number
    active: boolean
    created_at: string
}

export function LessonMasterTable({ masters }: { masters: LessonMaster[] }) {
    const router = useRouter()
    const supabase = createClient()
    const [editingMaster, setEditingMaster] = useState<LessonMaster | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('lesson_masters')
                .update({ active: !currentStatus })
                .eq('id', id)

            if (error) throw error

            toast.success('状態を更新しました')
            router.refresh()
        } catch (err) {
            toast.error('更新に失敗しました')
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return

        try {
            const { error } = await supabase
                .from('lesson_masters')
                .delete()
                .eq('id', deletingId)

            if (error) throw error

            toast.success('レッスンタイプを削除しました')
            router.refresh()
        } catch (error: any) {
            console.error(error)
            // Show friendly error for FK constraint violations
            if (error.code === '23503') {
                toast.error('このレッスンタイプは使用中のため削除できません')
            } else {
                toast.error('削除に失敗しました')
            }
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>単価</TableHead>
                        <TableHead>状態</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {masters.map((master) => (
                        <TableRow key={master.id}>
                            <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => setEditingMaster(master)}>
                                {master.name}
                            </TableCell>
                            <TableCell>¥{master.unit_price.toLocaleString()}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={master.active}
                                        onCheckedChange={() => toggleActive(master.id, master.active)}
                                    />
                                    <span className="text-sm text-gray-500">
                                        {master.active ? '有効' : '無効'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingMaster(master)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => setDeletingId(master.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {masters.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                登録されたレッスンタイプはありません
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {editingMaster && (
                <EditLessonTypeDialog
                    master={editingMaster}
                    open={!!editingMaster}
                    onOpenChange={(open: boolean) => !open && setEditingMaster(null)}
                />
            )}

            <AlertDialog open={!!deletingId} onOpenChange={(open: boolean) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。該当のレッスンタイプデータが完全に削除されます。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            削除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
