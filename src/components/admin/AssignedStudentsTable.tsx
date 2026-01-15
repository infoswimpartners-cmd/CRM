'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from '@/components/ui/button'
import { ArrowRightLeft, Plus } from 'lucide-react'
import { TransferStudentsDialog } from './TransferStudentsDialog'
import { AssignStudentsDialog } from './AssignStudentsDialog'
import { differenceInYears } from 'date-fns'

interface Student {
    id: string
    full_name: string
    birth_date: string | null
    created_at: string
}

interface AssignedStudentsTableProps {
    coachId: string
    students: Student[]
}

export function AssignedStudentsTable({ coachId, students }: AssignedStudentsTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)

    const toggleSelectAll = () => {
        if (selectedIds.length === students.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(students.map(s => s.id))
        }
    }

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(s => s !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">担当生徒一覧 ({students.length}名)</h2>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAssignDialogOpen(true)} variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        生徒を追加
                    </Button>
                    {selectedIds.length > 0 && (
                        <Button onClick={() => setIsTransferDialogOpen(true)} variant="secondary">
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            {selectedIds.length}名を引継ぎ
                        </Button>
                    )}
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={students.length > 0 && selectedIds.length === students.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>氏名</TableHead>
                            <TableHead>年齢</TableHead>
                            <TableHead>登録日</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.includes(student.id)}
                                        onCheckedChange={() => toggleSelect(student.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{student.full_name}</TableCell>
                                <TableCell>
                                    {student.birth_date
                                        ? `${differenceInYears(new Date(), new Date(student.birth_date))}歳`
                                        : '-'}
                                </TableCell>
                                <TableCell>{new Date(student.created_at).toLocaleDateString('ja-JP')}</TableCell>
                            </TableRow>
                        ))}
                        {students.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    担当している生徒はいません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <TransferStudentsDialog
                studentIds={selectedIds}
                currentCoachId={coachId}
                open={isTransferDialogOpen}
                onOpenChange={setIsTransferDialogOpen}
                onSuccess={() => setSelectedIds([])}
            />

            <AssignStudentsDialog
                targetCoachId={coachId}
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                onSuccess={() => { }}
            />
        </div>
    )
}
