'use client'

import { useState } from 'react'
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
import { EditStudentStatusDialog } from './EditStudentStatusDialog'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil, GripVertical } from 'lucide-react'
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
import { updateStudentStatusOrder, deleteStudentStatus } from '@/actions/statuses'
import { cn } from '@/lib/utils'

interface StudentStatus {
    id: string
    name: string
    color_class: string
    display_order: number
    is_system: boolean
}

// Sortable Row Component
function SortableRow({ status, setEditingStatus, setDeletingId }: {
    status: StudentStatus,
    setEditingStatus: (s: StudentStatus) => void,
    setDeletingId: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: status.id })

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
            <TableCell>
                <div className={cn(
                    "inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors",
                    status.color_class
                )} onClick={() => setEditingStatus(status)}>
                    {status.name}
                </div>
            </TableCell>
            <TableCell className="text-gray-500 font-mono text-sm">{status.id}</TableCell>
            <TableCell>
                {status.is_system ? (
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">システム必須</span>
                ) : (
                    <span className="text-xs text-gray-500">カスタム</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingStatus(status)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    {!status.is_system && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeletingId(status.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </TableCell>
        </TableRow>
    )
}

export function StudentStatusTable({ statuses }: { statuses: StudentStatus[] }) {
    const router = useRouter()
    const [editingStatus, setEditingStatus] = useState<StudentStatus | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [optimisticStatuses, setOptimisticStatuses] = useState(statuses)

    // Ensure state tracks prop changes from server
    // Normally useEffect tracks "statuses" prop but we've simplified here
    if (statuses.length > 0 && optimisticStatuses.length === 0) setOptimisticStatuses(statuses)
    // Actually, simple sync is fine:
    const displayStatuses = statuses.length !== optimisticStatuses.length ? statuses : optimisticStatuses

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
            const oldIndex = displayStatuses.findIndex((item) => item.id === active.id)
            const newIndex = displayStatuses.findIndex((item) => item.id === over.id)
            const newItems = arrayMove(displayStatuses, oldIndex, newIndex)

            const updatedItems = newItems.map((item, index) => ({
                ...item,
                display_order: index * 10
            }))

            setOptimisticStatuses(updatedItems)

            const updates = updatedItems.map((item) => ({
                id: item.id,
                display_order: item.display_order
            }))

            updateStudentStatusOrder(updates)
                .then(res => {
                    if (!res.success) {
                        toast.error(res.error || '並び順の保存に失敗しました')
                        router.refresh()
                    }
                })
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return

        try {
            const result = await deleteStudentStatus(deletingId)

            if (result.success) {
                toast.success('ステータスを削除しました')
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            console.error(error)
            toast.error('削除に失敗しました')
        } finally {
            setDeletingId(null)
            router.refresh()
        }
    }

    return (
        <div className="border rounded-md bg-white">
            <DndContext
                id="status-master-dnd-context"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>表示名（バッジ）</TableHead>
                            <TableHead>キー (ID)</TableHead>
                            <TableHead>種類</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <SortableContext
                            items={displayStatuses.map(m => m.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {displayStatuses.map((status) => (
                                <SortableRow
                                    key={status.id}
                                    status={status}
                                    setEditingStatus={setEditingStatus}
                                    setDeletingId={setDeletingId}
                                />
                            ))}
                        </SortableContext>
                        {displayStatuses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    登録された顧客ステータスはありません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </DndContext>

            {editingStatus && (
                <EditStudentStatusDialog
                    status={editingStatus}
                    open={!!editingStatus}
                    onOpenChange={(open: boolean) => !open && setEditingStatus(null)}
                />
            )}

            <AlertDialog open={!!deletingId} onOpenChange={(open: boolean) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ステータスを削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            該当データを削除します。現在このステータスを利用している生徒がいる場合、削除はブロックされます。
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
