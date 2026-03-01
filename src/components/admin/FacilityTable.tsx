'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
import { Trash2 } from 'lucide-react'
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
import { deleteFacilityAction } from '@/actions/facilities'
import { format } from 'date-fns'

interface Facility {
    id: string
    name: string
    is_facility_fee_applied: boolean
    created_at: string
}

export function FacilityTable({ facilities }: { facilities: Facility[] }) {
    const router = useRouter()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async () => {
        if (!deletingId) return

        try {
            const result = await deleteFacilityAction(deletingId)

            if (!result.success) throw new Error(result.error)

            toast.success('施設を削除しました')
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            toast.error('削除に失敗しました。すでにレッスンで使用されている可能性があります。')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>施設名</TableHead>
                        <TableHead>施設利用料</TableHead>
                        <TableHead>登録日</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {facilities.map((facility) => (
                        <TableRow key={facility.id}>
                            <TableCell className="font-medium">
                                {facility.name}
                            </TableCell>
                            <TableCell>
                                {facility.is_facility_fee_applied ? (
                                    <span className="text-blue-600 font-medium">+1,500円 適用</span>
                                ) : (
                                    <span className="text-gray-500">なし</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {format(new Date(facility.created_at), 'yyyy/MM/dd HH:mm')}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => setDeletingId(facility.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {facilities.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                登録された施設はありません
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <AlertDialog open={!!deletingId} onOpenChange={(open: boolean) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。該当の施設データが完全に削除されます。<br />
                            ※すでにレッスン記録に紐付けられている場合は削除できません。
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
        </div >
    )
}
