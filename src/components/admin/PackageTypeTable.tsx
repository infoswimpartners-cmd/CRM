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
import { Trash2, Pencil, Ticket, Eye } from 'lucide-react'
import { EditPackageTypeDialog } from './EditPackageTypeDialog'
import { Badge } from '@/components/ui/badge'
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

interface PackageType {
    id: string
    name: string
    fee: number
    ticket_count: number
    active: boolean
    created_at: string
    stripe_product_id?: string | null
    stripe_price_id?: string | null
    is_package: boolean
    default_lesson_master_id: string | null
}

export function PackageTypeTable({ types }: { types: PackageType[] }) {
    const router = useRouter()
    const supabase = createClient()
    const [editingType, setEditingType] = useState<PackageType | null>(null)
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

            toast.success('パッケージプランを削除しました')
            router.refresh()
        } catch (error: any) {
            console.error(error)
            if (error.code === '23503') {
                toast.error('このプランは使用中のため削除できません')
            } else {
                toast.error('削除に失敗しました')
            }
        } finally {
            setDeletingId(null)
        }
    }

    if (types.length === 0) {
        return (
            <div className="border rounded-md p-12 text-center text-slate-400">
                <Ticket className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">登録されたパッケージプランはありません</p>
                <p className="text-xs mt-1">「パッケージ追加」ボタンから新しいプランを登録してください</p>
            </div>
        )
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>プラン名</TableHead>
                        <TableHead>一括料金</TableHead>
                        <TableHead>付与チケット数</TableHead>
                        <TableHead>状態</TableHead>
                        <TableHead className="text-xs text-gray-500 font-normal">Stripe ID</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {types.map((type) => (
                        <TableRow key={type.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{type.name}</span>
                                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                                        一括払い
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="font-bold text-slate-800">
                                ¥{type.fee.toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5">
                                    <Ticket className="h-4 w-4 text-emerald-600" />
                                    <span className="font-bold text-emerald-700">{type.ticket_count ?? 0}枚</span>
                                </div>
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
                            <TableCell>
                                <div className="flex flex-col gap-0.5 max-w-[130px]">
                                    <span className="text-[10px] text-gray-400 truncate font-mono" title={type.stripe_product_id || ''}>
                                        商品: {type.stripe_product_id || '-'}
                                    </span>
                                    <span className="text-[10px] text-blue-400 truncate font-mono" title={type.stripe_price_id || ''}>
                                        価格: {type.stripe_price_id || '-'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        title="入会フォームでプレビュー"
                                    >
                                        <a href={`/enroll?plan=${type.id}&preview=true`} target="_blank" rel="noopener noreferrer">
                                            <Eye className="h-4 w-4 text-slate-500 hover:text-slate-700" />
                                        </a>
                                    </Button>
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
                </TableBody>
            </Table>

            {editingType && (
                <EditPackageTypeDialog
                    type={editingType}
                    open={!!editingType}
                    onOpenChange={(open) => !open && setEditingType(null)}
                />
            )}

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。パッケージプランのデータが完全に削除されます。
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
