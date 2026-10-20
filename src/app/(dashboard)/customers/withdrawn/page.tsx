'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, User, ChevronLeft, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { StudentStatusSelect } from '@/components/customers/StudentStatusSelect'
import { StudentMembershipSelect } from '@/components/customers/StudentMembershipSelect'

interface Student {
    id: string
    full_name: string
    full_name_kana: string | null
    gender: string | null
    created_at: string
    student_number: string | null
    status: string | null
    membership_type_id: string | null
    membership_types?: {
        name: string
    }
    withdrawal_setting?: {
        withdrawal_date?: string
        resume_target_month?: string
        resume_reminder_sent_at?: string | null
    } | null
}

export default function WithdrawnCustomersPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStudents()
    }, [])

    const fetchStudents = async () => {
        setLoading(true)
        const supabase = createClient()
        const [studentsRes, configsRes] = await Promise.all([
            supabase
                .from('students')
                .select(`
                    *,
                    membership_types:membership_type_id (
                        name
                    )
                `)
                .eq('status', 'withdrawn')
                .order('created_at', { ascending: false }),
            supabase
                .from('app_configs')
                .select('key, value')
                .ilike('key', 'student_withdrawal:%')
        ])

        if (studentsRes.error) {
            console.error('Error fetching students:', studentsRes.error)
        }

        const withdrawalMap: Record<string, any> = {}
        if (configsRes.data) {
            configsRes.data.forEach((c) => {
                try {
                    const studentId = c.key.replace('student_withdrawal:', '')
                    withdrawalMap[studentId] = JSON.parse(c.value)
                } catch {}
            })
        }

        if (studentsRes.data) {
            const mapped = studentsRes.data.map((s) => ({
                ...s,
                withdrawal_setting: withdrawalMap[s.id] || null,
            }))
            setStudents(mapped)
        }
        setLoading(false)
    }

    const filteredStudents = students.filter(s =>
        s.full_name.includes(search) ||
        (s.full_name_kana && s.full_name_kana.includes(search))
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/customers">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-red-700">退会者リスト</h1>
                    <p className="text-gray-500">退会済みの生徒一覧</p>
                </div>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="名前で検索..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>氏名</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead>再開案内予定</TableHead>
                            <TableHead>会員区分</TableHead>
                            <TableHead>カナ</TableHead>
                            <TableHead>性別</TableHead>
                            <TableHead className="text-right">アクション</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">読み込み中...</TableCell>
                            </TableRow>
                        ) : filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">退会者は見つかりません</TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <div className="text-xs text-gray-500 mb-1">{student.student_number}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                {student.full_name}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <StudentStatusSelect
                                                studentId={student.id}
                                                initialStatus={student.status || 'withdrawn'}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {student.withdrawal_setting?.resume_target_month ? (
                                            <div className="flex flex-col gap-0.5">
                                                <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[11px] font-bold w-fit whitespace-nowrap">
                                                    <Bell className="h-3 w-3 mr-1 text-amber-600 inline" />
                                                    {student.withdrawal_setting.resume_target_month.replace('-', '年')}月頃
                                                </Badge>
                                                <span className="text-[10px] text-slate-400 pl-0.5">
                                                    {student.withdrawal_setting.resume_reminder_sent_at ? '案内送信済' : '未送信'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <StudentMembershipSelect
                                                studentId={student.id}
                                                initialMembershipTypeId={student.membership_type_id}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>{student.full_name_kana || '-'}</TableCell>
                                    <TableCell>{student.gender || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/customers/${student.id}`}>詳細</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
