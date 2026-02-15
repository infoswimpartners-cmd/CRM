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
import { Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateMembershipTypeOrder } from '@/actions/masters'
import { GripVertical } from 'lucide-react'

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
    display_order: number
}

// Sortable Row Component
function SortableRow({ type, toggleActive, setEditingType, setDeletingId }: {
    type: MembershipType,
    toggleActive: (id: string, currentStatus: boolean) => void,
    setEditingType: (type: MembershipType) => void,
    setDeletingId: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: type.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        position: isDragging ? 'relative' as const : undefined,
    }

    return (
        <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-slate-50 opacity-80 shadow-lg' : ''}>
            <TableCell className="w-10">
                <div {...attributes} {...listeners} className="cursor-grab hover:text-slate-600 text-slate-400">
                    <GripVertical className="h-4 w-4" />
                </div>
            </TableCell>
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
            <TableCell>
                <div className="flex flex-col gap-0.5 max-w-[120px]">
                    <span className="text-[10px] text-gray-400 truncate" title={(type as any).stripe_product_id}>
                        {(type as any).stripe_product_id || '-'}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate" title={(type as any).stripe_price_id}>
                        {(type as any).stripe_price_id || '-'}
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
    )
}

export function MembershipTypeTable({ types }: { types: MembershipType[] }) {
    const router = useRouter()
    const supabase = createClient()
    const [editingType, setEditingType] = useState<MembershipType | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const [sortConfig, setSortConfig] = useState<{ key: keyof MembershipType; direction: 'asc' | 'desc' } | null>(null)
    const [optimisticTypes, setOptimisticTypes] = useState(types)

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = optimisticTypes.findIndex((item) => item.id === active.id)
            const newIndex = optimisticTypes.findIndex((item) => item.id === over.id)
            const newItems = arrayMove(optimisticTypes, oldIndex, newIndex)

            // Update display_order for optimistic UI correct sorting
            const updatedItems = newItems.map((item, index) => ({
                ...item,
                display_order: index
            }))

            setOptimisticTypes(updatedItems)

            // Update server asynchronously
            const updates = updatedItems.map((item) => ({
                id: item.id,
                display_order: item.display_order
            }))

            updateMembershipTypeOrder(updates)
                .then(res => {
                    if (!res.success) toast.error('並び順の保存に失敗しました')
                })
        }
    }

    const handleSort = (key: keyof MembershipType) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedTypes = [...optimisticTypes].sort((a, b) => {
        if (!sortConfig) {
            return (a.display_order || 0) - (b.display_order || 0)
        }

        const { key, direction } = sortConfig
        // @ts-ignore
        const valueA = a[key] ?? ''
        // @ts-ignore
        const valueB = b[key] ?? ''

        if (valueA < valueB) {
            return direction === 'asc' ? -1 : 1
        }
        if (valueA > valueB) {
            return direction === 'asc' ? 1 : -1
        }
        return 0
    })

    const SortIcon = ({ column }: { column: keyof MembershipType }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-slate-400" />
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4 text-primary" />
        return <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    }

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
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center">
                                    名称
                                    <SortIcon column="name" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => handleSort('fee')}
                            >
                                <div className="flex items-center">
                                    会費
                                    <SortIcon column="fee" />
                                </div>
                            </TableHead>
                            <TableHead>標準レッスン</TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => handleSort('active')}
                            >
                                <div className="flex items-center">
                                    状態
                                    <SortIcon column="active" />
                                </div>
                            </TableHead>
                            <TableHead className="text-xs text-gray-500 font-normal">Stripe ID</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <SortableContext
                            items={sortedTypes.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sortedTypes.map((type) => (
                                <SortableRow
                                    key={type.id}
                                    type={type}
                                    toggleActive={toggleActive}
                                    setEditingType={setEditingType}
                                    setDeletingId={setDeletingId}
                                />
                            ))}
                        </SortableContext>
                        {types.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    登録された会員区分はありません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </DndContext>

            {
                editingType && (
                    <EditMembershipTypeDialog
                        type={editingType}
                        open={!!editingType}
                        onOpenChange={(open: boolean) => !open && setEditingType(null)}
                    />
                )
            }

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
        </div >
    )
}
