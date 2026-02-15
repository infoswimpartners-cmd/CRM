import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Filter, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { statusLabels, statusColors } from '@/components/admin/StudentStatusSelect'
import { cn, calculateSchoolGrade } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isCoach = profile?.role === 'coach'

    // Use wildcard selection to avoid missing/renamed column errors
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
        console.log(`[StudentsPage] Filtering for coach: ${user.id}`)
        query = query.eq('coach_id', user.id)
    }

    const { data: students, error } = await query.order('created_at', { ascending: false })

    if (error) {
        console.error('[StudentsPage] Fetch Error details:', JSON.stringify(error, null, 2))
    }

    console.log(`[StudentsPage] Students fetched: ${students?.length || 0}`)

    const filteredStudents = students?.filter(student => student.status !== 'withdrawn') || []

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
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">生徒名</th>
                                <th className="px-6 py-4">ステータス</th>
                                <th className="px-6 py-4">学年 / 性別</th>
                                <th className="px-6 py-4">前回のレッスン</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((student: any) => (
                                <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-slate-100">
                                                <AvatarImage src="" />
                                                <AvatarFallback className="bg-cyan-100 text-cyan-700 font-bold">
                                                    {student.full_name?.slice(0, 1)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {student.full_name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    ***
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
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        生徒が見つかりませんでした。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        {filteredStudents.length} 名を表示中
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
        </div>
    )
}
