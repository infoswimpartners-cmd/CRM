import { createClient } from '@/lib/supabase/server'
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
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function CoachListPage() {
    const supabase = await createClient()

    const { data: coaches, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'coach')
        .order('full_name')

    if (error) {
        console.error(error)
        return <div>Error loading coaches</div>
    }

    const { data: students } = await supabase
        .from('students')
        .select('coach_id')

    const studentCounts = (students || []).reduce((acc, s) => {
        if (s.coach_id) {
            acc[s.coach_id] = (acc[s.coach_id] || 0) + 1
        }
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">コーチ管理</h1>
                    <p className="text-gray-500">コーチ一覧と担当生徒の確認・引き継ぎ</p>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>コーチ</TableHead>
                            <TableHead>メールアドレス</TableHead>
                            <TableHead>担当生徒数</TableHead>
                            <TableHead className="text-right">詳細</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {coaches.map((coach) => (
                            <TableRow key={coach.id}>
                                <TableCell className="flex items-center gap-3 font-medium">
                                    <Avatar>
                                        <AvatarImage src={coach.avatar_url} />
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
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/admin/coaches/${coach.id}`}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {coaches.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    コーチ登録がありません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
