'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Filter, Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { statusLabels, statusColors } from '@/components/admin/StudentStatusSelect'
import { cn, calculateSchoolGrade } from '@/lib/utils'
import { StudentDetailModal } from '@/components/students/StudentDetailModal'

export default function StudentsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [students, setStudents] = useState<any[]>([])
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [isCoach, setIsCoach] = useState(false)

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

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-wide">
                        生徒一覧
                    </h1>
                    <p className="text-slate-500 text-sm">
                        生徒情報の確認・編集
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
                        <Filter className="w-4 h-4 mr-2" />
                        絞り込み
                    </Button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <Search className="w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="名前で検索..."
                        className="bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
                    />
                </div>

                <div className="overflow-x-auto">
                    {/* PC Table Layout */}
                    <table className="w-full text-left text-sm text-slate-600 hidden md:table">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">生徒名</th>
                                <th className="px-6 py-4">ステータス</th>
                                <th className="px-6 py-4">会員種別</th>
                                <th className="px-6 py-4">学年 / 性別</th>
                                <th className="px-6 py-4">最終更新</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                            <p className="text-slate-400">読み込み中...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : students.length > 0 ? (
                                students.map((student: any) => (
                                    <tr
                                        key={student.id}
                                        className="group hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => handleRowClick(student)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">

                                                <div>
                                                    <div className="font-medium text-slate-900">
                                                        {student.full_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {student.full_name_kana || '***'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className={cn("border-0", statusColors[student.status] || 'bg-gray-100 text-gray-800')}>
                                                {statusLabels[student.status] || student.status || '不明'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="bg-white text-slate-600 font-normal">
                                                {/* @ts-ignore */}
                                                {student.membership_types?.name || student.membership_types?.[0]?.name || '-'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600 border border-slate-200">
                                                    {student.birth_date ? calculateSchoolGrade(new Date(student.birth_date)) : '-'}
                                                </span>
                                                <span className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-600 border border-slate-200 capitalize">
                                                    {student.gender || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {student.updated_at ? new Date(student.updated_at).toLocaleDateString('ja-JP') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        生徒が見つかりませんでした。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-8 flex flex-col items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                <p className="text-slate-400">読み込み中...</p>
                            </div>
                        ) : students.length > 0 ? (
                            students.map((student: any) => (
                                <div
                                    key={student.id}
                                    className="p-4 active:bg-slate-50 transition-colors"
                                    onClick={() => handleRowClick(student)}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">

                                            <div>
                                                <div className="font-bold text-slate-900">
                                                    {student.full_name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                    {student.full_name_kana || '***'}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className={cn("border-0 text-[10px] h-5", statusColors[student.status] || 'bg-gray-100 text-gray-800')}>
                                            {statusLabels[student.status] || student.status || '不明'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 border border-slate-200">
                                                {student.birth_date ? calculateSchoolGrade(new Date(student.birth_date)) : '-'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 border border-slate-200 capitalize">
                                                {student.gender || '-'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                            更新: {student.updated_at ? new Date(student.updated_at).toLocaleDateString('ja-JP') : '-'}
                                            <MoreHorizontal className="h-3 w-3" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                生徒が見つかりませんでした。
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        {students.length} 名を表示中
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50" disabled>
                            前へ
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50" disabled>
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
