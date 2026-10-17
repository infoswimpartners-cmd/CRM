'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, User, ChevronLeft, ArrowUpDown } from 'lucide-react'
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
import { StudentMultiCoachSelect } from '@/components/customers/StudentMultiCoachSelect'
import { ReceptionEmailButton } from '@/components/customers/ReceptionEmailButton'
import { calculateAge, cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// SchoolHubデザインシステムに基づくパステル調アバタートークン
const AVATAR_PASTEL_COLORS = [
    'bg-sky-100 text-sky-700 border-sky-200/80',
    'bg-emerald-100 text-emerald-700 border-emerald-200/80',
    'bg-amber-100 text-amber-700 border-amber-200/80',
    'bg-indigo-100 text-indigo-700 border-indigo-200/80',
    'bg-rose-100 text-rose-700 border-rose-200/80',
    'bg-teal-100 text-teal-700 border-teal-200/80',
]

function getAvatarColorClass(name: string = ''): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % AVATAR_PASTEL_COLORS.length
    return AVATAR_PASTEL_COLORS[index]
}

function getInitialLetter(name: string = ''): string {
    const trimmed = name.trim()
    return trimmed ? trimmed.charAt(0) : '生'
}

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
    coach_id: string | null
    profiles?: {
        full_name: string
    }
    student_coaches?: {
        coach_id: string
        role: 'main' | 'sub'
    }[]
    contact_email?: string | null
    birth_date?: string | null
}

type SortConfig = {
    key: keyof Student | 'age' | 'membership_name' | 'coach_name'
    direction: 'asc' | 'desc'
}

export default function StudentListPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' })
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [statuses, setStatuses] = useState<any[]>([])
    const [coaches, setCoaches] = useState<any[]>([])
    const [statusLabels, setStatusLabels] = useState<Record<string, string>>({})

    useEffect(() => {
        checkUserRole()
        fetchStatuses()
        fetchCoaches()
        fetchStudents()
    }, [])

    const fetchStatuses = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('student_statuses').select('id, name, color_class').order('display_order', { ascending: true })
        if (data) {
            setStatuses(data)
            const labels = data.reduce((acc, s) => {
                acc[s.id] = s.name
                return acc
            }, {} as Record<string, string>)
            setStatusLabels(labels)
        }
    }

    const fetchCoaches = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('role', ['coach', 'admin', 'owner'])
            .order('full_name', { ascending: true })
        if (data) {
            setCoaches(data)
        }
    }

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
                ),
                profiles:coach_id (
                    full_name
                ),
                student_coaches (
                    coach_id,
                    role
                ),
                contact_email
            `)
            .neq('status', 'withdrawn')

        const { data, error } = await query
        if (error) {
            console.error('Error fetching students:', error)
        }
        if (data) setStudents(data)
        setLoading(false)
    }

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const filteredStudents = students
        .filter(s => {
            const matchesSearch = s.full_name.includes(search) ||
                (s.full_name_kana && s.full_name_kana.includes(search))

            if (statusFilter === 'all') return matchesSearch
            return matchesSearch && s.status === statusFilter
        })
        .sort((a, b) => {
            const { key, direction } = sortConfig
            let aValue: any = a[key as keyof Student]
            let bValue: any = b[key as keyof Student]

            // Custom sorting logic
            if (key === 'membership_name') {
                aValue = (Array.isArray(a.membership_types) ? a.membership_types[0]?.name : a.membership_types?.name) || ''
                bValue = (Array.isArray(b.membership_types) ? b.membership_types[0]?.name : b.membership_types?.name) || ''
            } else if (key === 'coach_name') {
                aValue = a.profiles?.full_name || ''
                bValue = b.profiles?.full_name || ''
            } else if (key === 'age') {
                aValue = a.birth_date ? calculateAge(new Date(a.birth_date)) : -1
                bValue = b.birth_date ? calculateAge(new Date(b.birth_date)) : -1
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
        })

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

            <div className="flex items-center gap-4 py-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="名前で検索..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全て表示</SelectItem>
                        {Object.entries(statusLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* PC向けテーブルビュー (md以上で表示) */}
            <div className="hidden md:block border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/75 border-b border-slate-200/70">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="cursor-pointer hover:text-slate-900 transition-colors py-3.5 pl-6 font-bold text-xs text-slate-500 uppercase tracking-wider" onClick={() => handleSort('full_name')}>
                                <div className="flex items-center gap-1.5">
                                    氏名・生徒情報 <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:text-slate-900 transition-colors py-3.5 font-bold text-xs text-slate-500 uppercase tracking-wider" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-1.5">
                                    ステータス <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:text-slate-900 transition-colors py-3.5 font-bold text-xs text-slate-500 uppercase tracking-wider" onClick={() => handleSort('membership_name')}>
                                <div className="flex items-center gap-1.5">
                                    会員区分・プラン <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:text-slate-900 transition-colors py-3.5 font-bold text-xs text-slate-500 uppercase tracking-wider" onClick={() => handleSort('coach_name')}>
                                <div className="flex items-center gap-1.5">
                                    担当コーチ <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:text-slate-900 transition-colors py-3.5 font-bold text-xs text-slate-500 uppercase tracking-wider" onClick={() => handleSort('age')}>
                                <div className="flex items-center gap-1.5">
                                    年齢 / 性別 <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                            </TableHead>
                            <TableHead className="py-3.5 pr-6 text-right font-bold text-xs text-slate-500 uppercase tracking-wider">アクション</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-28 text-center text-slate-400 text-xs">読み込み中...</TableCell>
                            </TableRow>
                        ) : filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-28 text-center text-slate-400 text-xs">生徒が見つかりません</TableCell>
                            </TableRow>
                        ) : (
                            filteredStudents.map((student) => (
                                <TableRow key={student.id} className="hover:bg-slate-50/60 transition-colors">
                                    <TableCell className="font-medium py-3.5 pl-6">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className={cn("h-9 w-9 shrink-0 border shadow-2xs font-bold text-xs flex items-center justify-center rounded-full", getAvatarColorClass(student.full_name))}>
                                                <AvatarFallback className="bg-transparent text-inherit font-bold text-sm">
                                                    {getInitialLetter(student.full_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Link href={`/customers/${student.id}`} className="font-bold text-slate-900 text-sm hover:text-sky-600 transition-colors truncate">
                                                        {student.full_name}
                                                    </Link>
                                                    {student.student_number ? (
                                                        <Badge variant="outline" className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80 inline-flex items-center shadow-2xs">
                                                            #{student.student_number}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-normal bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                                                            未設定
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate break-words">
                                                    {student.full_name_kana || 'カナ未登録'}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3.5">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <StudentStatusSelect
                                                key={`status-${student.id}`}
                                                studentId={student.id}
                                                initialStatus={student.status}
                                                statuses={statuses}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3.5">
                                        <div className="inline-flex items-center gap-1.5">
                                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border border-slate-200/80 font-medium text-xs px-2.5 py-1 rounded-lg shadow-2xs truncate max-w-[200px]">
                                                {(Array.isArray(student.membership_types)
                                                    ? student.membership_types[0]?.name
                                                    : student.membership_types?.name) || 'コース未定'}
                                            </Badge>
                                            {(student as any).is_two_person_lesson && (
                                                <span className="bg-violet-50 text-violet-700 border border-violet-200/80 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                                    ペア
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3.5">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <StudentMultiCoachSelect
                                                key={`coach-${student.id}`}
                                                studentId={student.id}
                                                initialAssignedCoaches={student.student_coaches || []}
                                                initialMainCoachId={student.coach_id}
                                                coaches={coaches}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3.5 text-xs text-slate-600">
                                        <div className="flex items-center gap-2">
                                            {student.birth_date ? (
                                                <span className="font-semibold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md text-xs border border-slate-200/60">
                                                    {calculateAge(new Date(student.birth_date))}歳
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                            <span className="text-slate-300">/</span>
                                            <span className="text-slate-600 font-medium">{student.gender || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3.5 pr-6 text-right">
                                        <div className="flex justify-end gap-2 items-center">
                                            <ReceptionEmailButton
                                                studentId={student.id}
                                                studentName={student.full_name}
                                                status={student.status}
                                                email={student.contact_email}
                                            />
                                            <Button variant="ghost" size="sm" asChild className="hover:bg-sky-50 hover:text-sky-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200/70 shadow-2xs">
                                                <Link href={`/customers/${student.id}`}>詳細</Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* モバイル向けカードビュー (375pxスマホ幅対応, md未満で表示) */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-xs">
                        読み込み中...
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-xs">
                        生徒が見つかりません
                    </div>
                ) : (
                    filteredStudents.map((student) => (
                        <div
                            key={`mobile-${student.id}`}
                            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3 min-w-0"
                        >
                            {/* 上段: アバター、氏名、カナ、会員番号、ステータス */}
                            <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Avatar className={cn("h-10 w-10 shrink-0 border shadow-2xs font-bold text-xs flex items-center justify-center rounded-full", getAvatarColorClass(student.full_name))}>
                                        <AvatarFallback className="bg-transparent text-inherit font-bold text-sm">
                                            {getInitialLetter(student.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Link
                                                href={`/customers/${student.id}`}
                                                className="font-bold text-slate-900 text-sm hover:text-sky-600 transition-colors truncate break-words"
                                            >
                                                {student.full_name}
                                            </Link>
                                            {student.student_number ? (
                                                <Badge variant="outline" className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/80 shadow-2xs">
                                                    #{student.student_number}
                                                </Badge>
                                            ) : (
                                                <span className="text-[9px] text-slate-400 bg-slate-50 px-1 py-0.2 rounded border border-slate-200/60">
                                                    未設定
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate break-words mt-0.5">
                                            {student.full_name_kana || 'カナ未登録'}
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <StudentStatusSelect
                                        key={`mobile-status-${student.id}`}
                                        studentId={student.id}
                                        initialStatus={student.status}
                                        statuses={statuses}
                                        compact
                                    />
                                </div>
                            </div>

                            {/* 中段: コースバッジ、年齢/性別、コーチ */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border border-slate-200/80 font-medium text-[11px] px-2 py-0.5 rounded-md shadow-2xs truncate max-w-[140px]">
                                        {(Array.isArray(student.membership_types)
                                            ? student.membership_types[0]?.name
                                            : student.membership_types?.name) || 'コース未定'}
                                    </Badge>
                                    {(student as any).is_two_person_lesson && (
                                        <span className="bg-violet-50 text-violet-700 border border-violet-200/80 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                            ペア
                                        </span>
                                    )}
                                    {student.birth_date && (
                                        <span className="text-slate-600 font-medium bg-slate-100/80 px-1.5 py-0.5 rounded text-[11px] border border-slate-200/60">
                                            {calculateAge(new Date(student.birth_date))}歳
                                        </span>
                                    )}
                                    {student.gender && (
                                        <span className="text-slate-400 text-[11px] font-normal">
                                            ({student.gender})
                                        </span>
                                    )}
                                </div>

                                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                    <StudentMultiCoachSelect
                                        key={`mobile-coach-${student.id}`}
                                        studentId={student.id}
                                        initialAssignedCoaches={student.student_coaches || []}
                                        initialMainCoachId={student.coach_id}
                                        coaches={coaches}
                                    />
                                </div>
                            </div>

                            {/* 下段: アクションボタン */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <ReceptionEmailButton
                                    studentId={student.id}
                                    studentName={student.full_name}
                                    status={student.status}
                                    email={student.contact_email}
                                />
                                <Button variant="ghost" size="sm" asChild className="w-full hover:bg-sky-50 hover:text-sky-700 font-semibold text-xs rounded-xl transition-colors border border-slate-200/80 shadow-2xs h-8">
                                    <Link href={`/customers/${student.id}`}>
                                        カルテ詳細を見る
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    )
}
