import { createClient } from '@/lib/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export async function AllReportsTable() {
    const supabase = await createClient()

    const { data: reports } = await supabase
        .from('lessons')
        .select(`
            *,
            profiles (
                full_name,
                email,
                avatar_url,
                role
            ),
            lesson_masters (
                name,
                is_trial
            )
        `)
        .order('lesson_date', { ascending: false })
        .limit(100) // Limit for now

    if (!reports) return <div>データがありません</div>

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead>実施日</TableHead>
                        <TableHead>コーチ</TableHead>
                        <TableHead>生徒</TableHead>
                        <TableHead>メニュー内容</TableHead>
                        <TableHead>種類</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.map((report) => (
                        <TableRow key={report.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium">
                                {format(new Date(report.lesson_date), 'yyyy/MM/dd', { locale: ja })}
                                <div className="text-xs text-slate-400">
                                    {format(new Date(report.lesson_date), 'HH:mm', { locale: ja })}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        {/* @ts-ignore */}
                                        <AvatarImage src={report.profiles?.avatar_url} />
                                        <AvatarFallback className="text-[10px]">
                                            {/* @ts-ignore */}
                                            {report.profiles?.full_name?.slice(0, 1) || 'C'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">
                                        {/* @ts-ignore */}
                                        {report.profiles?.full_name}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>{report.student_name}</TableCell>
                            <TableCell className="max-w-[300px]">
                                <p className="truncate text-sm text-slate-600" title={report.menu_description || ''}>
                                    {report.menu_description || '-'}
                                </p>
                            </TableCell>
                            <TableCell>
                                {/* @ts-ignore */}
                                {report.lesson_masters?.is_trial ? (
                                    <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">体験</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-500 bg-slate-50">通常</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
