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
import { Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
import { updateLessonMasterOrder } from '@/actions/masters'
import { GripVertical } from 'lucide-react'

interface LessonMaster {
    id: string
    name: string
    unit_price: number
    active: boolean
    is_single_ticket?: boolean
    created_at: string
    display_order: number
}

// Sortable Row Component
function SortableRow({ master, toggleActive, setEditingMaster, setDeletingId }: {
    master: LessonMaster,
    toggleActive: (id: string, currentStatus: boolean) => void,
    setEditingMaster: (master: LessonMaster) => void,
    setDeletingId: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: master.id })

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
            <TableCell>
                <div className="flex flex-col gap-0.5 max-w-[120px]">
                    <span className="text-[10px] text-gray-400 truncate" title={(master as any).stripe_product_id}>
                        {(master as any).stripe_product_id || '-'}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate" title={(master as any).stripe_price_id}>
                        {(master as any).stripe_price_id || '-'}
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
        </TableRow >
    )
}

export function LessonMasterTable({ masters }: { masters: LessonMaster[] }) {
    const router = useRouter()
    const supabase = createClient()
    const [editingMaster, setEditingMaster] = useState<LessonMaster | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof LessonMaster; direction: 'asc' | 'desc' } | null>(null)
    const [optimisticMasters, setOptimisticMasters] = useState(masters)

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
            const oldIndex = optimisticMasters.findIndex((item) => item.id === active.id)
            const newIndex = optimisticMasters.findIndex((item) => item.id === over.id)
            const newItems = arrayMove(optimisticMasters, oldIndex, newIndex)

            // Update display_order for optimistic UI correct sorting
            const updatedItems = newItems.map((item, index) => ({
                ...item,
                display_order: index
            }))

            setOptimisticMasters(updatedItems)

            // Update server asynchronously
            const updates = updatedItems.map((item) => ({
                id: item.id,
                display_order: item.display_order
            }))

            updateLessonMasterOrder(updates)
                .then(res => {
                    if (!res.success) toast.error('並び順の保存に失敗しました')
                })
        }
    }

    const handleSort = (key: keyof LessonMaster) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedMasters = [...optimisticMasters].sort((a, b) => {
        if (!sortConfig) {
            // Default sort by display_order if no explicit sort
            return (a.display_order || 0) - (b.display_order || 0)
        }

        const { key, direction } = sortConfig
        const valueA = a[key]
        const valueB = b[key]

        if (valueA === undefined && valueB === undefined) return 0
        if (valueA === undefined) return 1
        if (valueB === undefined) return -1

        if (valueA < valueB) {
            return direction === 'asc' ? -1 : 1
        }
        if (valueA > valueB) {
            return direction === 'asc' ? 1 : -1
        }
        return 0
    })

    const SortIcon = ({ column }: { column: keyof LessonMaster }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-slate-400" />
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4 text-primary" />
        return <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    }

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
            <DndContext
                id="lesson-master-dnd-context"
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
                                onClick={() => handleSort('unit_price')}
                            >
                                <div className="flex items-center">
                                    単価
                                    <SortIcon column="unit_price" />
                                </div>
                            </TableHead>
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
                            items={sortedMasters.map(m => m.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sortedMasters.map((master) => (
                                <SortableRow
                                    key={master.id}
                                    master={master}
                                    toggleActive={toggleActive}
                                    setEditingMaster={setEditingMaster}
                                    setDeletingId={setDeletingId}
                                />
                            ))}
                        </SortableContext>
                        {masters.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    登録されたレッスンタイプはありません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </DndContext>

            {
                editingMaster && (
                    <EditLessonTypeDialog
                        master={editingMaster}
                        open={!!editingMaster}
                        onOpenChange={(open: boolean) => !open && setEditingMaster(null)}
                    />
                )
            }

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
        </div >
    )
}
