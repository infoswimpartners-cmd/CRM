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
import { StudentStatusSelect, statusLabels, statusColors } from '@/components/admin/StudentStatusSelect'
import { TrialConfirmButton } from '@/components/admin/TrialConfirmButton'

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

    // Fetch User Role
    const { data: { user } } = await supabase.auth.getUser()
    const isAdmin = user ? (await supabase.from('profiles').select('role').eq('id', user.id).single()).data?.role === 'admin' : false

    // Fetch Coaches for Trial Confirm
    const { data: coaches } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['coach', 'admin', 'owner'])
        .order('full_name')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="ghost" className="pl-0 gap-2" asChild>
                    <Link href="/customers">
                        <ChevronLeft className="h-4 w-4" /> 生徒一覧に戻る
                    </Link>
                </Button>
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <TrialConfirmButton
                            studentId={student.id}
                            studentName={student.full_name}
                            coaches={coaches || []}
                            assignedCoachId={student.coach_id}
                        />
                        <Button variant="outline" asChild>
                            <Link href={`/customers/${student.id}/edit`}>
                                編集
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarFallback>{student.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="text-sm font-mono text-gray-500">ID: {student.student_number || '未設定'}</div>
                        {isAdmin ? (
                            <StudentStatusSelect
                                studentId={student.id}
                                currentStatus={student.status || 'trial_pending'}
                            />
                        ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[student.status || 'trial_pending']}`}>
                                {statusLabels[student.status || 'trial_pending']}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold">{student.full_name}</h1>
                    {student.second_student_name && (
                        <div className="flex flex-col mt-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">2人目</span>
                                <span className="text-xl font-bold text-gray-700">{student.second_student_name}</span>
                            </div>
                            {student.second_student_name_kana && (
                                <p className="text-gray-500 text-sm ml-14">
                                    {student.second_student_name_kana}
                                </p>
                            )}
                        </div>
                    )}
                    <p className="text-gray-500 mt-1">
                        {student.full_name_kana} / {student.gender}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
                <div>
                    <span className="font-semibold block">連絡先 (メール):</span>
                    {isAdmin ? (student.contact_email || '-') : '***'}
                </div>
                <div>
                    <span className="font-semibold block">連絡先 (電話):</span>
                    {isAdmin ? (student.contact_phone || '-') : '***'}
                </div>
                <div>
                    <span className="font-semibold block mb-1">担当コーチ:</span>
                    {isAdmin ? (
                        <StudentCoachAssigner
                            studentId={student.id}
                            currentCoachId={student.coach_id}
                        />
                    ) : (
                        <span className="text-gray-900 font-medium">
                            {student.profiles?.full_name || '担当なし'}
                        </span>
                    )}
                </div>
                {isAdmin && (
                    <div>
                        <span className="font-semibold block mb-1">Stripe連携:</span>
                        {student.stripe_customer_id ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-2 py-1 rounded w-fit">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                                    <span className="text-sm font-bold">連携済み</span>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    ID: {student.stripe_customer_id}
                                </div>
                                <a
                                    href={`https://dashboard.stripe.com/customers/${student.stripe_customer_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                >
                                    Stripe管理画面を開く
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                </a>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                <span className="text-sm">未連携</span>
                            </div>
                        )}
                    </div>
                )}
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
