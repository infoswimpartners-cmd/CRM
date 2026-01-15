import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentChart } from '@/components/customers/StudentChart'
import { StudentCounseling } from '@/components/customers/StudentCounseling'
import { StudentLessonHistory } from '@/components/customers/StudentLessonHistory'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { StudentCoachAssigner } from '@/components/admin/StudentCoachAssigner'

const statusLabels: Record<string, string> = {
    inquiry: 'お問い合わせ',
    trial_pending: '体験予定',
    trial_done: '体験受講済',
    active: '会員',
    resting: '休会中',
    withdrawn: '退会'
}

const statusColors: Record<string, string> = {
    inquiry: 'bg-gray-100 text-gray-800',
    trial_pending: 'bg-yellow-100 text-yellow-800',
    trial_done: 'bg-purple-100 text-purple-800',
    active: 'bg-green-100 text-green-800',
    resting: 'bg-gray-200 text-gray-600',
    withdrawn: 'bg-red-100 text-red-800'
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch Student
    const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

    if (!student) {
        notFound()
    }

    // Fetch Lesson History
    const { data: lessons } = await supabase
        .from('lessons')
        .select(`
            *,
            profiles (
                full_name
            )
        `)
        .eq('student_id', student.id)
        .order('lesson_date', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="ghost" className="pl-0 gap-2" asChild>
                    <Link href="/customers">
                        <ChevronLeft className="h-4 w-4" /> 生徒一覧に戻る
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href={`/customers/${student.id}/edit`}>
                        編集
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarFallback>{student.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="text-sm font-mono text-gray-500">ID: {student.student_number || '未設定'}</div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[student.status || 'inquiry']}`}>
                            {statusLabels[student.status || 'inquiry']}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold">{student.full_name}</h1>
                    <p className="text-gray-500">
                        {student.full_name_kana} / {student.gender}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
                <div>
                    <span className="font-semibold block">連絡先 (メール):</span>
                    {student.contact_email || '-'}
                </div>
                <div>
                    <span className="font-semibold block">連絡先 (電話):</span>
                    {student.contact_phone || '-'}
                </div>
                <div>
                    <span className="font-semibold block mb-1">担当コーチ:</span>
                    <StudentCoachAssigner
                        studentId={student.id}
                        currentCoachId={student.coach_id}
                    />
                </div>
            </div>

            <Tabs defaultValue="chart" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="chart">カルテ・備考</TabsTrigger>
                    <TabsTrigger value="counseling">カウンセリング</TabsTrigger>
                    <TabsTrigger value="history">レッスン履歴</TabsTrigger>
                </TabsList>
                <TabsContent value="chart" className="mt-4">
                    <StudentChart student={student} />
                </TabsContent>
                <TabsContent value="counseling" className="mt-4">
                    <StudentCounseling studentId={student.id} />
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                    <StudentLessonHistory lessons={lessons || []} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
