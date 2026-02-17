import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentChart } from '@/components/customers/StudentChart'
import { StudentCounseling } from '@/components/customers/StudentCounseling'
import { StudentLessonHistory } from '@/components/customers/StudentLessonHistory'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { StudentCoachAssigner } from '@/components/admin/StudentCoachAssigner'
import { StudentStatusSelect, statusLabels, statusColors } from '@/components/admin/StudentStatusSelect'
import { TrialConfirmButton } from '@/components/admin/TrialConfirmButton'
import { StripeManager } from '@/components/admin/students/StripeManager'
import { getStripeCustomerStatus } from '@/actions/stripe'
import { Badge } from '@/components/ui/badge'
import { Landmark, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { calculateAge } from '@/lib/utils'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch Student
    const { data: student } = await supabase
        .from('students')
        .select(`
            *,
            membership_types:membership_types!students_membership_type_id_fkey (
                name
            )
        `)
        .eq('id', id)
        .single()

    if (!student) {
        notFound()
    }

    // Fetch Lesson History via RPC (Bypasses RLS)
    const { data: lessons, error: lessonsError } = await supabase
        .rpc('get_student_lesson_history_public', {
            p_student_id: student.id
        })

    if (lessonsError) {
        console.error('Error fetching student lesson history via RPC:', lessonsError.message, lessonsError)
    }

    // Fetch User Role
    const { data: { user } } = await supabase.auth.getUser()
    const isAdmin = user ? (await supabase.from('profiles').select('role').eq('id', user.id).single()).data?.role === 'admin' : false

    // Fetch Coaches for Trial Confirm
    const { data: coaches } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['coach', 'admin', 'owner'])
        .order('full_name')

    // Fetch Stripe Status
    let paymentMethodStatus = null
    if (student.stripe_customer_id) {
        paymentMethodStatus = await getStripeCustomerStatus(student.stripe_customer_id)
    }

    // Fetch All Assigned Coaches
    const { data: assignedCoaches } = await supabase
        .from('student_coaches')
        .select(`
            role,
            profiles (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq('student_id', student.id)

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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Basic Info & 2nd Student */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Header Section */}
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">ID: {student.student_number || '未設定'}</span>
                            {isAdmin ? (
                                <StudentStatusSelect
                                    studentId={student.id}
                                    currentStatus={student.status || 'trial_pending'}
                                />
                            ) : (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[student.status || 'trial_pending'] ? statusColors[student.status || 'trial_pending'] : 'bg-gray-100 text-gray-800'}`}>
                                    {statusLabels[student.status || 'trial_pending'] || '不明'}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{student.full_name}</h1>
                                <p className="text-gray-500 font-medium">{student.full_name_kana}</p>
                            </div>
                            <div className="flex gap-2 mb-1">
                                {student.gender && (
                                    <Badge variant="secondary" className="font-normal text-gray-600">
                                        {student.gender}
                                    </Badge>
                                )}
                                {student.birth_date && (
                                    <Badge variant="secondary" className="font-normal text-gray-600">
                                        {new Date(student.birth_date).toLocaleDateString('ja-JP')}生まれ ({calculateAge(new Date(student.birth_date))}歳)
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact & Basic Info Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                基本情報・連絡先
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-slate-500">メールアドレス</Label>
                                <div className="font-medium">{isAdmin ? (student.contact_email || '-') : '***'}</div>
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">電話番号</Label>
                                <div className="font-medium">{isAdmin ? (student.contact_phone || '-') : '***'}</div>
                            </div>
                            {student.notes && (
                                <div className="sm:col-span-2 mt-2 pt-2 border-t border-slate-100">
                                    <Label className="text-xs text-slate-500">備考</Label>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{student.notes}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2nd Student Card (Conditional) */}
                    {student.second_student_name && (
                        <Card className="border-blue-100 bg-blue-50/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-800">
                                    <Users className="h-4 w-4" /> 2人目の生徒情報
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">氏名</Label>
                                    <div className="font-medium text-lg">{student.second_student_name}</div>
                                    <div className="text-xs text-gray-500">{student.second_student_name_kana}</div>
                                </div>
                                <div className="space-y-1">
                                    <div>
                                        <Label className="text-xs text-slate-500">性別</Label>
                                        <div className="text-sm">{student.second_student_gender || '-'}</div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">生年月日</Label>
                                        <div className="text-sm">
                                            {student.second_student_birth_date
                                                ? new Date(student.second_student_birth_date).toLocaleDateString('ja-JP')
                                                : '-'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Contract & Assignment */}
                <div className="space-y-6">
                    {/* Coach Assignment Card */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold">担当コーチ</CardTitle>
                            {isAdmin && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                                    <Link href={`/customers/${student.id}/edit`}>変更</Link>
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {assignedCoaches && assignedCoaches.length > 0 ? (
                                    assignedCoaches.map((ac: any) => (
                                        <div key={ac.profiles.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                            {/* Avatar placeholder if needed */}
                                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {ac.profiles.full_name.slice(0, 1)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{ac.profiles.full_name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {ac.role === 'main' ? 'メイン担当' : 'サブ担当'}
                                                </div>
                                            </div>
                                            {ac.role === 'main' && (
                                                <Badge className="bg-slate-900">MAIN</Badge>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-500 py-2 text-center bg-gray-50 rounded border border-dashed border-gray-200">
                                        担当コーチ未設定
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contract & Payment Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Landmark className="h-4 w-4" /> 契約・支払い情報
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-xs text-slate-500">現在のプラン</Label>
                                <div className="font-bold text-lg text-slate-800">
                                    {/* @ts-ignore relationship */}
                                    {student.membership_types?.name || '未設定'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-slate-50">
                                    <span className="text-sm font-medium text-slate-600">支払方法</span>
                                    {student.is_bank_transfer ? (
                                        <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                                            銀行振込 (特例)
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-slate-200 text-slate-700 bg-white">
                                            クレジットカード (Stripe)
                                        </Badge>
                                    )}
                                </div>

                                {student.is_two_person_lesson && (
                                    <div className="flex items-center justify-between p-2 rounded border border-blue-100 bg-blue-50">
                                        <span className="text-sm font-medium text-blue-800">オプション</span>
                                        <Badge className="bg-blue-600 text-white border-none">
                                            2人同時レッスン適用
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <div className="pt-2 border-t border-slate-100">
                                    <StripeManager
                                        studentId={student.id}
                                        stripeCustomerId={student.stripe_customer_id}
                                        paymentMethodStatus={paymentMethodStatus}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs defaultValue="chart" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chart">カルテ・カウンセリング</TabsTrigger>
                    <TabsTrigger value="history">レッスン履歴</TabsTrigger>
                </TabsList>
                <TabsContent value="chart" className="mt-4 space-y-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                            カウンセリング内容
                        </h3>
                        <StudentCounseling studentId={student.id} />
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            カルテ・備考
                        </h3>
                        <StudentChart student={student} />
                    </div>
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                    <StudentLessonHistory lessons={lessons || []} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
