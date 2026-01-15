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
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil } from 'lucide-react'
import { EditMembershipTypeDialog } from './EditMembershipTypeDialog'
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

interface MembershipType {
    id: string
    name: string
    fee: number
    active: boolean
    created_at: string
    default_lesson_master_id: string | null
    reward_master_id: string | null
    default_lesson?: {
        name: string
    }
}

export function MembershipTypeTable({ types }: { types: MembershipType[] }) {
    const router = useRouter()
    const supabase = createClient()
    const [editingType, setEditingType] = useState<MembershipType | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('membership_types')
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
                .from('membership_types')
                .delete()
                .eq('id', deletingId)

            if (error) throw error

            toast.success('会員区分を削除しました')
            router.refresh()
        } catch (error: any) {
            console.error(error)
            // Show friendly error for FK constraint violations
            if (error.code === '23503') {
                toast.error('この会員区分は使用中のため削除できません')
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
                        <TableHead>会費</TableHead>
                        <TableHead>標準レッスン</TableHead>
                        <TableHead>状態</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {types.map((type) => (
                        <TableRow key={type.id}>
                            <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => setEditingType(type)}>
                                {type.name}
                            </TableCell>
                            <TableCell>¥{type.fee.toLocaleString()}</TableCell>
                            <TableCell>
                                {type.default_lesson?.name || <span className="text-gray-400 text-xs">未設定</span>}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={type.active}
                                        onCheckedChange={() => toggleActive(type.id, type.active)}
                                    />
                                    <span className="text-sm text-gray-500">
                                        {type.active ? '有効' : '無効'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingType(type)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => setDeletingId(type.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {types.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                登録された会員区分はありません
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {editingType && (
                <EditMembershipTypeDialog
                    type={editingType}
                    open={!!editingType}
                    onOpenChange={(open: boolean) => !open && setEditingType(null)}
                />
            )}

            <AlertDialog open={!!deletingId} onOpenChange={(open: boolean) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。該当の会員区分データが完全に削除されます。
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
