'use client'

import { useState, useMemo } from 'react'
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
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { ReportActions } from '@/components/admin/reports/ReportActions'

interface AllReportsTableClientProps {
    initialReports: any[]
    lessonMasters: any[]
}

export function AllReportsTableClient({ initialReports, lessonMasters }: AllReportsTableClientProps) {
    const [dateFilter, setDateFilter] = useState('')
    const [coachFilter, setCoachFilter] = useState('')
    const [studentFilter, setStudentFilter] = useState('')
    const [menuFilter, setMenuFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')

    const filteredReports = useMemo(() => {
        return initialReports.filter(report => {
            // 日付フィルタ
            const formattedDate = format(new Date(report.lesson_date), 'yyyy/MM/dd', { locale: ja })
            if (dateFilter && !formattedDate.includes(dateFilter)) return false

            // コーチフィルタ
            const coachName = report.profiles?.full_name || ''
            if (coachFilter && !coachName.toLowerCase().includes(coachFilter.toLowerCase())) return false

            // 生徒フィルタ
            const studentName = report.student_name || ''
            if (studentFilter && !studentName.toLowerCase().includes(studentFilter.toLowerCase())) return false

            // メニューフィルタ
            const menuDesc = report.menu_description || ''
            if (menuFilter && !menuDesc.toLowerCase().includes(menuFilter.toLowerCase())) return false

            // 種類フィルタ
            if (typeFilter !== 'all') {
                const isTrial = report.lesson_masters?.is_trial
                if (typeFilter === 'trial' && !isTrial) return false
                if (typeFilter === 'normal' && isTrial) return false
            }

            return true
        })
    }, [initialReports, dateFilter, coachFilter, studentFilter, menuFilter, typeFilter])

    const resetFilters = () => {
        setDateFilter('')
        setCoachFilter('')
        setStudentFilter('')
        setMenuFilter('')
        setTypeFilter('all')
    }

    const hasFilters = dateFilter || coachFilter || studentFilter || menuFilter || typeFilter !== 'all'

    return (
        <div className="space-y-4">
            {hasFilters && (
                <div className="flex justify-end">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetFilters}
                        className="text-slate-500 hover:text-slate-900 h-8 px-2 text-xs"
                    >
                        <X className="h-3 w-3 mr-1" />
                        フィルタをクリア
                    </Button>
                </div>
            )}
            
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                <Table>
                    <TableHeader className="bg-slate-50/80 backdrop-blur-sm">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-900">実施日</TableHead>
                            <TableHead className="font-semibold text-slate-900">コーチ</TableHead>
                            <TableHead className="font-semibold text-slate-900">生徒</TableHead>
                            <TableHead className="font-semibold text-slate-900">メニュー内容</TableHead>
                            <TableHead className="font-semibold text-slate-900">種類</TableHead>
                            <TableHead className="w-[100px] font-semibold text-slate-900 text-center">操作</TableHead>
                        </TableRow>
                        <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                            <TableHead className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                    <Input
                                        placeholder="日付..."
                                        className="h-8 pl-7 text-xs bg-white border-slate-200 focus-visible:ring-blue-400"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                    <Input
                                        placeholder="コーチ名..."
                                        className="h-8 pl-7 text-xs bg-white border-slate-200 focus-visible:ring-blue-400"
                                        value={coachFilter}
                                        onChange={(e) => setCoachFilter(e.target.value)}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                    <Input
                                        placeholder="生徒名..."
                                        className="h-8 pl-7 text-xs bg-white border-slate-200 focus-visible:ring-blue-400"
                                        value={studentFilter}
                                        onChange={(e) => setStudentFilter(e.target.value)}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                    <Input
                                        placeholder="検索..."
                                        className="h-8 pl-7 text-xs bg-white border-slate-200 focus-visible:ring-blue-400"
                                        value={menuFilter}
                                        onChange={(e) => setMenuFilter(e.target.value)}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-2 px-2">
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200 focus:ring-blue-400">
                                        <SelectValue placeholder="全て" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">全て</SelectItem>
                                        <SelectItem value="trial">体験</SelectItem>
                                        <SelectItem value="normal">通常</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableHead>
                            <TableHead className="py-2 px-2"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                    該当するデータがありません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReports.map((report) => (
                                <TableRow key={report.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <TableCell className="font-medium text-slate-700">
                                        {format(new Date(report.lesson_date), 'yyyy/MM/dd', { locale: ja })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                                                <AvatarImage src={report.profiles?.avatar_url} />
                                                <AvatarFallback className="text-[10px] bg-blue-50 text-blue-600">
                                                    {report.profiles?.full_name?.slice(0, 1) || 'C'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-slate-600">
                                                {report.profiles?.full_name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600 font-medium">{report.student_name}</TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <p className="truncate text-sm text-slate-500 group-hover:text-slate-900 transition-colors" title={report.menu_description || ''}>
                                            {report.menu_description || '-'}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 items-center flex-wrap">
                                            {report.lesson_masters?.is_trial ? (
                                                <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50/50 hover:bg-cyan-100/50 transition-colors px-2 py-0.5">体験</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500 bg-slate-50/50 border-slate-200 px-2 py-0.5">通常</Badge>
                                            )}
                                            {(report.price && report.lesson_masters && report.price > report.lesson_masters.unit_price) && (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/50 px-2 py-0.5">施設利用料</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <ReportActions report={report} lessonMasters={lessonMasters || []} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-slate-400 text-right pr-2">
                表示中: {filteredReports.length} 件 / 合計: {initialReports.length} 件
            </div>
        </div>
    )
}
