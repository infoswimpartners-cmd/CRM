'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Search, User, ChevronLeft } from 'lucide-react'
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
}

export default function StudentListPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        checkUserRole()
        fetchStudents()
    }, [])

    const checkUserRole = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (profile?.role === 'admin') {
                setIsAdmin(true)
            }
        }
    }

    const fetchStudents = async () => {
        setLoading(true)
        const supabase = createClient()
        let query = supabase
            .from('students')
            .select(`
                *,
                membership_types:membership_type_id (
                    name
                )
            `)
            .neq('status', 'withdrawn')
            .order('created_at', { ascending: false })

        const { data, error } = await query
        if (error) {
            console.error('Error fetching students:', error)
        }
        if (data) setStudents(data)
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
                    <Link href="/admin">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">顧客管理</h1>
                    <p className="text-gray-500">生徒情報の検索・管理</p>
                </div>
                {isAdmin && (
                    <div className="ml-auto flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/customers/withdrawn">
                                退会者リスト
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/customers/new">
                                <Plus className="mr-2 h-4 w-4" /> 新規生徒登録
                            </Link>
                        </Button>
                    </div>
                )}
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
                            <TableHead>会員区分</TableHead>
                            <TableHead>カナ</TableHead>
                            <TableHead>性別</TableHead>
                            <TableHead className="text-right">アクション</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">読み込み中...</TableCell>
                            </TableRow>
                        ) : filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">生徒が見つかりません</TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <div className="text-xs text-gray-500 mb-1">{student.student_number}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
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
                                                initialStatus={student.status}
                                            />
                                        </div>
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
