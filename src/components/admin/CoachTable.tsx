'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { ChevronRight, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CoachDeleteButton } from '@/components/admin/CoachDeleteButton'
import { CoachResendButton } from '@/components/admin/CoachResendButton'
import { AdminResetPasswordDialog } from '@/components/admin/AdminResetPasswordDialog'
import { useState } from 'react'

interface Coach {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role: string
    coach_number?: string | null
    status?: string // Added status
}

interface CoachTableProps {
    coaches: Coach[]
    studentCounts: Record<string, number>
}

export function CoachTable({ coaches, studentCounts }: CoachTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedCoaches = [...coaches].sort((a, b) => {
        if (!sortConfig) return 0

        const { key, direction } = sortConfig

        let valueA: any
        let valueB: any

        if (key === 'student_count') {
            valueA = studentCounts[a.id] || 0
            valueB = studentCounts[b.id] || 0
        } else {
            // @ts-ignore
            valueA = a[key]
            // @ts-ignore
            valueB = b[key]
        }

        if (valueA < valueB) {
            return direction === 'asc' ? -1 : 1
        }
        if (valueA > valueB) {
            return direction === 'asc' ? 1 : -1
        }
        return 0
    })

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-slate-400" />
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4 text-primary" />
        return <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('status')}
                        >
                            <div className="flex items-center">
                                状態
                                <SortIcon column="status" />
                            </div>
                        </TableHead>
                        <TableHead
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('full_name')}
                        >
                            <div className="flex items-center">
                                コーチ
                                <SortIcon column="full_name" />
                            </div>
                        </TableHead>
                        <TableHead
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('email')}
                        >
                            <div className="flex items-center">
                                メールアドレス
                                <SortIcon column="email" />
                            </div>
                        </TableHead>
                        <TableHead
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => handleSort('student_count')}
                        >
                            <div className="flex items-center">
                                担当生徒数
                                <SortIcon column="student_count" />
                            </div>
                        </TableHead>
                        <TableHead className="text-right">詳細</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedCoaches.map((coach) => (
                        <TableRow key={coach.id}>
                            <TableCell>
                                {coach.status === 'pending' ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">招待中</Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">有効</Badge>
                                )}
                            </TableCell>
                            <TableCell className="flex items-center gap-3 font-medium">
                                <Avatar>
                                    <AvatarImage src={coach.avatar_url || undefined} />
                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                {coach.full_name}
                                {coach.coach_number && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {coach.coach_number}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell>{coach.email}</TableCell>
                            <TableCell>
                                <span className="font-bold">{studentCounts[coach.id] || 0}</span> 名
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {coach.status === 'pending' && (
                                        <CoachResendButton coachId={coach.id} coachName={coach.full_name} />
                                    )}
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/admin/coaches/${coach.id}`}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <AdminResetPasswordDialog coachId={coach.id} coachName={coach.full_name || '名称未設定'} />
                                    <CoachDeleteButton coachId={coach.id} coachName={coach.full_name || '名称未設定'} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {coaches.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                コーチ登録がありません
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
