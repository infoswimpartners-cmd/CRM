'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { calculateAge, calculateSchoolGrade } from '@/lib/utils'
import React from 'react'
import { updateStudent } from '@/actions/student'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [id, setId] = useState<string>('')

    const [formData, setFormData] = useState({
        full_name: '',
        full_name_kana: '',
        gender: '',
        birth_date: '',
        second_student_name: '',
        second_student_name_kana: '',
        second_student_gender: '',
        second_student_birth_date: '',
        contact_email: '',
        contact_phone: '',
        student_notes: '', // notes on students table
        status: 'trial_pending',
        membership_type_id: '',
        coach_id: '', // primary coach
        coach_ids: [] as string[], // all assigned coaches
        is_bank_transfer: false,
        is_two_person_lesson: false,
        start_timing: 'current' // 'current' | 'next'
    })

    const [membershipTypes, setMembershipTypes] = useState<{ id: string, name: string }[]>([])
    const [coaches, setCoaches] = useState<{ id: string, full_name: string }[]>([])

    useEffect(() => {
        const fetchMembershipTypes = async () => {
            const supabase = createClient()

            // Check Role
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
                if (profile?.role !== 'admin') {
                    router.push('/customers')
                    return
                }
            }

            const { data } = await supabase
                .from('membership_types')
                .select('id, name')
                .eq('active', true)
                .order('fee')
            if (data) setMembershipTypes(data)

            // コーチ一覧を取得
            const { data: coachData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('role', ['coach', 'admin', 'owner'])
                .order('full_name')
            if (coachData) setCoaches(coachData)
        }
        fetchMembershipTypes()
    }, [])

    useEffect(() => {
        const fetchStudent = async () => {
            const resolvedParams = await params
            setId(resolvedParams.id)
            const supabase = createClient()
            const { data, error } = await supabase.from('students').select('*').eq('id', resolvedParams.id).single()

            if (error || !data) {
                toast.error('生徒情報の取得に失敗しました')
                router.push('/customers')
                return
            }

            setFormData({
                full_name: data.full_name,
                full_name_kana: data.full_name_kana || '',
                second_student_name: data.second_student_name || '',
                second_student_name_kana: data.second_student_name_kana || '',
                second_student_gender: data.second_student_gender || '',
                second_student_birth_date: data.second_student_birth_date || '',
                gender: data.gender || '',
                birth_date: data.birth_date || '',
                contact_email: data.contact_email || '',
                contact_phone: data.contact_phone || '',
                student_notes: data.notes || '',
                status: data.status || 'trial_pending',
                membership_type_id: data.membership_type_id || '',
                coach_id: data.coach_id || '',
                coach_ids: [], // will fetch below
                is_bank_transfer: data.is_bank_transfer || false,
                is_two_person_lesson: data.is_two_person_lesson || false,
                start_timing: 'current'
            })

            // Fetch assigned coaches
            const { data: assignedCoaches } = await supabase
                .from('student_coaches')
                .select('coach_id')
                .eq('student_id', resolvedParams.id)

            if (assignedCoaches) {
                const ids = assignedCoaches.map(c => c.coach_id)
                setFormData(prev => ({ ...prev, coach_ids: ids }))
            }

            setLoading(false)
        }
        fetchStudent()
    }, [params, router])


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const ageInfo = formData.birth_date ? (() => {
        const date = new Date(formData.birth_date)
        return !isNaN(date.getTime()) ? {
            age: calculateAge(date),
            grade: calculateSchoolGrade(date)
        } : null
    })() : null

    const ageInfo2 = formData.second_student_birth_date ? (() => {
        const date = new Date(formData.second_student_birth_date)
        return !isNaN(date.getTime()) ? {
            age: calculateAge(date),
            grade: calculateSchoolGrade(date)
        } : null
    })() : null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Import the server action dynamically or ensure it's imported at top
            // Since we are in client component, we import it from the actions file
            // Note: We need to add the import statement at the top of the file as well.
            // For now, let's assume valid import. If not, I will add it in next step.
            // Actually, I should use replace_file_content to add import too.
            // But this tool call is for valid TSX replacement.

            // Wait, I cannot add import in the same chunk if they are far apart.
            // I will assume I can update the whole file or use multi_replace.
            // Let's use multi_replace in next step if needed, or just replace the handle submit and let me add import separately.
            // I will use `updateStudent` here.

            const result = await updateStudent(id, formData)

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('生徒情報を更新しました')
            if (result.emailSent) {
                toast.success('本入会完了メールを送信しました')
            }
            router.push(`/customers/${id}`)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || '更新に失敗しました')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">生徒情報編集</h1>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>基本情報</CardTitle>
                        <CardDescription>生徒の基本情報を入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">氏名 *</Label>
                                <Input id="full_name" required value={formData.full_name} onChange={handleChange} placeholder="山田 太郎" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="full_name_kana">フリガナ</Label>
                                <Input id="full_name_kana" value={formData.full_name_kana} onChange={handleChange} placeholder="ヤマダ タロウ" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label>性別</Label>
                                <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="男性">男性</SelectItem>
                                        <SelectItem value="女性">女性</SelectItem>
                                        <SelectItem value="その他">その他</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birth_date">生年月日</Label>
                                <Input
                                    id="birth_date"
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                />
                                {ageInfo && (
                                    <p className="text-sm text-green-600 font-medium">
                                        {ageInfo.age}歳 ({ageInfo.grade})
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>連絡先情報</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_email">メールアドレス</Label>
                                <Input id="contact_email" type="email" value={formData.contact_email} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact_phone">電話番号</Label>
                                <Input id="contact_phone" type="tel" value={formData.contact_phone} onChange={handleChange} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Second Student Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>2人目の生徒情報</CardTitle>
                        <CardDescription>同時受講する場合のみ入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="second_student_name">名前</Label>
                                <Input id="second_student_name" value={formData.second_student_name} onChange={handleChange} placeholder="同伴する生徒名" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="second_student_name_kana">フリガナ</Label>
                                <Input id="second_student_name_kana" value={formData.second_student_name_kana} onChange={handleChange} placeholder="フリガナ (2人目)" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label>性別 (2人目)</Label>
                                <Select value={formData.second_student_gender} onValueChange={(val) => setFormData({ ...formData, second_student_gender: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="男性">男性</SelectItem>
                                        <SelectItem value="女性">女性</SelectItem>
                                        <SelectItem value="その他">その他</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="second_student_birth_date">生年月日 (2人目)</Label>
                                <div className="space-y-1">
                                    <Input
                                        id="second_student_birth_date"
                                        type="date"
                                        value={formData.second_student_birth_date}
                                        onChange={handleChange}
                                    />
                                    {ageInfo2 && (
                                        <p className="text-sm text-green-600 font-medium whitespace-nowrap">
                                            {ageInfo2.age}歳 ({ageInfo2.grade})
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Details & Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>契約・ステータス</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="membership_type">会員種別</Label>
                                <Select value={formData.membership_type_id} onValueChange={(val) => setFormData({ ...formData, membership_type_id: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">未設定</SelectItem>
                                        {membershipTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">ステータス</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="trial_pending">体験予定</SelectItem>
                                        <SelectItem value="trial_confirmed">体験確定</SelectItem>
                                        <SelectItem value="trial_done">体験受講済</SelectItem>
                                        <SelectItem value="active">会員</SelectItem>
                                        <SelectItem value="resting">休会中</SelectItem>
                                        <SelectItem value="withdrawn">退会</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>



                        {/* 銀行振込対応フラグ */}
                        <div className="mt-6 flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold text-orange-900">銀行振込対応 (特例)</Label>
                                <p className="text-xs text-orange-700">原則のStripe決済以外で対応する場合に有効にします。</p>
                            </div>
                            <Switch
                                checked={formData.is_bank_transfer}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_bank_transfer: checked })}
                            />
                        </div>

                        {/* 2人同時レッスンフラグ */}
                        <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold text-blue-900">2人同時レッスン (報酬+1000円)</Label>
                                <p className="text-xs text-blue-700">有効にすると、この生徒のレッスン報酬が自動的に+1000円されます。</p>
                            </div>
                            <Switch
                                checked={formData.is_two_person_lesson}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_two_person_lesson: checked })}
                            />
                        </div>

                        {/* 担当コーチ選択 (複数対応) */}
                        <div className="mt-6 space-y-3">
                            <Label className="text-sm font-bold text-slate-700">担当コーチアサイン (複数選択可)</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {coaches.map((coach) => (
                                    <div key={coach.id} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-md border border-slate-100">
                                        <Checkbox
                                            id={`coach-${coach.id}`}
                                            checked={formData.coach_ids.includes(coach.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setFormData({
                                                        ...formData,
                                                        coach_ids: [...formData.coach_ids, coach.id],
                                                        // もしメインコーチが未設定なら設定
                                                        coach_id: formData.coach_id === '' || formData.coach_id === 'unassigned' ? coach.id : formData.coach_id
                                                    })
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        coach_ids: formData.coach_ids.filter(id => id !== coach.id),
                                                        // メインコーチが解除されたらリセット
                                                        coach_id: formData.coach_id === coach.id ? '' : formData.coach_id
                                                    })
                                                }
                                            }}
                                        />
                                        <Label
                                            htmlFor={`coach-${coach.id}`}
                                            className="text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                                        >
                                            {coach.full_name}
                                        </Label>
                                    </div>
                                ))}
                            </div>

                            {formData.coach_ids.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <Label className="text-xs text-slate-500 mb-2 block">メイン担当コーチを選択</Label>
                                    <Select
                                        value={formData.coach_id}
                                        onValueChange={(val) => setFormData({ ...formData, coach_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="メインコーチを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {coaches.filter(c => formData.coach_ids.includes(c.id)).map((coach) => (
                                                <SelectItem key={coach.id} value={coach.id}>
                                                    {coach.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Membership Start Timing */}
                        {formData.membership_type_id && formData.membership_type_id !== 'unassigned' && (
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mt-4">
                                <Label className="block mb-3">課金・サブスクリプション(会費ペイ)開始時期</Label>
                                <div className="flex flex-col gap-3">
                                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-white/50 transition-colors">
                                        <input
                                            type="radio"
                                            name="start_timing"
                                            value="current"
                                            checked={formData.start_timing === 'current'}
                                            onChange={() => setFormData({ ...formData, start_timing: 'current' })}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-bold block text-sm">今月から開始</span>
                                            <span className="text-xs text-gray-500">
                                                直ちに会費ペイ請求が有効化されます。
                                            </span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-white/50 transition-colors">
                                        <input
                                            type="radio"
                                            name="start_timing"
                                            value="next"
                                            checked={formData.start_timing === 'next'}
                                            onChange={() => setFormData({ ...formData, start_timing: 'next' })}
                                            className="mt-1"
                                        />
                                        <div>
                                            <span className="font-bold block text-sm">来月から開始</span>
                                            <span className="text-xs text-gray-500">
                                                今月末までは「都度払い」扱い、来月1日から自動課金を開始します。
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 5. Notes */}
                <Card>
                    <CardHeader>
                        <CardTitle>備考</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Textarea
                                id="student_notes"
                                value={formData.student_notes}
                                onChange={handleChange}
                                placeholder="特記事項など"
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 pb-12">
                    <Button variant="outline" type="button" onClick={() => router.back()}>キャンセル</Button>
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        更新
                    </Button>
                </div>
            </form>
        </div >
    )
}
