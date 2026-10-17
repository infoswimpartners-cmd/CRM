'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MoreHorizontal, Filter, Search, Loader2, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

import { cn, calculateSchoolGrade } from '@/lib/utils'
import { StudentDetailModal } from '@/components/students/StudentDetailModal'

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

function getSchoolHubStatusColor(statusId: string | null, fallbackColor?: string): string {
    switch (statusId) {
        case 'active':
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
        case 'trial_pending':
        case 'trial_billed':
        case 'trial_confirmed':
        case 'trial_done':
            return 'bg-amber-50 text-amber-700 border border-amber-200/80'
        case 'resting':
            return 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
        case 'withdrawn':
            return 'bg-slate-100 text-slate-600 border border-slate-200'
        case 'inquiry':
            return 'bg-sky-50 text-sky-700 border border-sky-200/80'
        default:
            return fallbackColor || 'bg-slate-50 text-slate-600 border border-slate-200'
    }
}

export default function StudentsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [students, setStudents] = useState<any[]>([])
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [isCoach, setIsCoach] = useState(false)
    const [statusLabels, setStatusLabels] = useState<Record<string, string>>({})
    const [statusColors, setStatusColors] = useState<Record<string, string>>({})

    // 検索と絞り込み用ステート
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState('all')

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            const coachRole = profile?.role === 'coach'
            setIsCoach(coachRole)

            // ステータスマスタ取得
            const { data: statusData } = await supabase.from('student_statuses').select('id, name, color_class').order('display_order', { ascending: true })
            if (statusData) {
                const labels: Record<string, string> = {}
                const colors: Record<string, string> = {}
                statusData.forEach(s => {
                    labels[s.id] = s.name
                    colors[s.id] = s.color_class
                })
                setStatusLabels(labels)
                setStatusColors(colors)
            }

            await fetchStudents(user.id, coachRole)
        }
        init()
    }, [])

    const fetchStudents = async (userId: string, isCoach: boolean) => {
        setLoading(true)
        try {
            let studentIds: string[] = []

            if (isCoach) {
                // Fetch student IDs assigned via student_coaches table
                const { data: assigned } = await supabase
                    .from('student_coaches')
                    .select('student_id')
                    .eq('coach_id', userId)

                if (assigned) {
                    studentIds = assigned.map(a => a.student_id)
                }
            }

            let query = supabase
                .from('students')
                .select(`
                    *,
                    membership_types:membership_type_id (
                        name
                    )
                `)
                .neq('status', 'withdrawn')

            if (isCoach) {
                // Filter by either direct coach_id or IDs from student_coaches
                // Supabase doesn't support easy OR between columns and related tables in a single query filter across joins easily without RPC or raw SQL
                // So we combine filters: (coach_id = userId OR id IN studentIds)
                if (studentIds.length > 0) {
                    query = query.or(`coach_id.eq.${userId},id.in.(${studentIds.join(',')})`)
                } else {
                    query = query.eq('coach_id', userId)
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false })
            if (error) throw error
            setStudents(data || [])
        } catch (error) {
            console.error('[StudentsPage] Fetch Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRowClick = (student: any) => {
        setSelectedStudent(student)
        setIsModalOpen(true)
    }

    // クライアントサイドでのリアルタイム検索・絞り込みフィルタ
    const filteredStudents = students.filter((student) => {
        const matchesSearch =
            !searchQuery ||
            student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.full_name_kana?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus =
            selectedStatus === 'all' || student.status === selectedStatus

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-3 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-wide">
                        生徒一覧
                    </h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        生徒情報の確認・編集
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className={cn(
                                    "h-7 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm text-xs py-1 cursor-pointer",
                                    selectedStatus !== 'all' && "bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100/70"
                                )}
                            >
                                <Filter className="w-3.5 h-3.5 mr-1" />
                                {selectedStatus === 'all' ? '絞り込み' : `絞り込み: ${statusLabels[selectedStatus] || selectedStatus}`}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-lg rounded-lg p-1">
                            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 px-2.5 py-1">ステータスで絞り込み</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100 my-1" />
                            <DropdownMenuItem
                                onClick={() => setSelectedStatus('all')}
                                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded cursor-pointer"
                            >
                                <span>すべて</span>
                                {selectedStatus === 'all' && <Check className="w-3.5 h-3.5 text-sky-600" />}
                            </DropdownMenuItem>
                            {Object.entries(statusLabels).map(([id, label]) => (
                                <DropdownMenuItem
                                    key={id}
                                    onClick={() => setSelectedStatus(id)}
                                    className="flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded cursor-pointer"
                                >
                                    <span>{label}</span>
                                    {selectedStatus === id && <Check className="w-3.5 h-3.5 text-sky-600" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>

                    </DropdownMenu>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="p-2 px-3 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="名前で検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 h-7 p-0 text-xs"
                    />
                </div>

                <div className="overflow-x-auto">
                    {/* PC Table Layout */}
                    <table className="w-full text-left text-xs md:text-sm text-slate-600 hidden md:table">
                        <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-2 font-semibold">生徒名</th>
                                <th className="px-4 py-2 font-semibold">ステータス</th>
                                <th className="px-4 py-2 font-semibold">会員種別</th>
                                <th className="px-4 py-2 font-semibold">学年 / 性別</th>
                                <th className="px-4 py-2 font-semibold">最終更新</th>
                                <th className="px-4 py-2 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                            <p className="text-slate-400 text-xs">読み込み中...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map((student: any) => (
                                    <tr
                                        key={student.id}
                                        className="group hover:bg-slate-50/70 transition-colors cursor-pointer"
                                        onClick={() => handleRowClick(student)}
                                    >
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar className={cn("h-8 w-8 shrink-0 border shadow-2xs font-bold text-xs flex items-center justify-center rounded-full", getAvatarColorClass(student.full_name))}>
                                                    <AvatarFallback className="bg-transparent text-inherit font-bold text-xs">
                                                        {getInitialLetter(student.full_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                        <span>{student.full_name}</span>
                                                        {student.student_number && (
                                                            <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/80">
                                                                #{student.student_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {student.full_name_kana || '***'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <Badge variant="secondary" className={cn("text-[10px] px-2 py-0.5 leading-none h-5 font-medium rounded-md shadow-2xs", getSchoolHubStatusColor(student.status, statusColors[student.status]))}>
                                                {statusLabels[student.status] || student.status || '不明'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2">
                                            <Badge variant="outline" className="bg-white text-slate-500 border-slate-200/80 font-normal text-[10px] px-1.5 py-0 leading-none h-4.5">
                                                {/* @ts-ignore */}
                                                {student.membership_types?.name || student.membership_types?.[0]?.name || '-'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-1">
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 border border-slate-200/60 leading-none">
                                                    {student.birth_date ? calculateSchoolGrade(new Date(student.birth_date)) : '-'}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 border border-slate-200/60 capitalize leading-none">
                                                    {student.gender || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-slate-400 text-xs">
                                            {student.updated_at ? new Date(student.updated_at).toLocaleDateString('ja-JP') : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-xs">
                                        生徒が見つかりませんでした。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-6 flex flex-col items-center gap-1.5">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                <p className="text-slate-400 text-xs">読み込み中...</p>
                            </div>
                        ) : filteredStudents.length > 0 ? (
                            filteredStudents.map((student: any) => (
                                <div
                                    key={student.id}
                                    className="p-2 py-2 px-2.5 active:bg-slate-50 transition-colors"
                                    onClick={() => handleRowClick(student)}
                                >
                                    <div className="flex items-center justify-between mb-1.5 gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar className={cn("h-7 w-7 shrink-0 border shadow-2xs font-bold text-[10px] flex items-center justify-center rounded-full", getAvatarColorClass(student.full_name))}>
                                                <AvatarFallback className="bg-transparent text-inherit font-bold text-[10px]">
                                                    {getInitialLetter(student.full_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                                                    <span className="truncate">{student.full_name}</span>
                                                    {student.student_number && (
                                                        <span className="text-[9px] font-mono font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200/80 shrink-0">
                                                            #{student.student_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[9px] text-slate-400 leading-none mt-0.5 truncate">
                                                    {student.full_name_kana || '***'}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0.5 h-4.5 leading-none font-medium rounded shadow-2xs shrink-0", getSchoolHubStatusColor(student.status, statusColors[student.status]))}>
                                            {statusLabels[student.status] || student.status || '不明'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-500 border border-slate-200/50 leading-none">
                                                {student.birth_date ? calculateSchoolGrade(new Date(student.birth_date)) : '-'}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-500 border border-slate-200/50 capitalize leading-none">
                                                {student.gender || '-'}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-white text-[9px] text-slate-400 border border-slate-200/40 leading-none truncate max-w-[100px]">
                                                {/* @ts-ignore */}
                                                {student.membership_types?.name || student.membership_types?.[0]?.name || '-'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-0.5 leading-none">
                                            更新: {student.updated_at ? new Date(student.updated_at).toLocaleDateString('ja-JP') : '-'}
                                            <MoreHorizontal className="h-3 w-3" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-slate-400 text-xs">
                                生徒が見つかりませんでした。
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-2 px-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-[10px] md:text-xs text-slate-400">
                        {filteredStudents.length} 名を表示中
                    </span>
                    <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="h-6.5 bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 text-xs px-2.5 py-0.5" disabled>
                            前へ
                        </Button>
                        <Button variant="outline" size="sm" className="h-6.5 bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 text-xs px-2.5 py-0.5" disabled>
                            次へ
                        </Button>
                    </div>
                </div>
            </div>

            <StudentDetailModal
                student={selectedStudent}
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </div>
    )
}
