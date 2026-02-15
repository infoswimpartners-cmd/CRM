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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'

import { calculateAge, calculateSchoolGrade } from '@/lib/utils'
import { createStudent } from '@/actions/student'
import React from 'react'

export default function NewStudentPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // ... existing code ...

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
        membership_type_id: '',
        coach_id: '', // primary coach
        coach_ids: [] as string[], // multiple coaches
        is_bank_transfer: false
    })

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

    const [membershipTypes, setMembershipTypes] = useState<{ id: string, name: string }[]>([])
    const [coaches, setCoaches] = useState<{ id: string, full_name: string }[]>([])

    useEffect(() => {
        const fetchData = async () => {
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

            // Fetch Membership Types
            const { data: memData } = await supabase
                .from('membership_types')
                .select('id, name')
                .eq('active', true)
                .order('fee')
            if (memData) setMembershipTypes(memData)

            // Fetch Coaches
            const { data: coachData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('role', ['coach', 'admin'])
                .order('full_name') // or created_at
            if (coachData) setCoaches(coachData)
        }
        fetchData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            const result = await createStudent(formData)

            if (!result.success) {
                console.error('Registration Failed:', result)
                const errorDetail = result.details ? ` (${result.details})` : ''
                const errorCode = result.code ? ` [Code: ${result.code}]` : ''
                throw new Error(result.error + errorDetail + errorCode)
            }

            toast.success('生徒を登録しました')
            router.push('/customers')
            router.refresh()
        } catch (error: any) {
            console.error('Registration Error Details:', error)
            toast.error(`登録エラー: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">新規生徒登録</h1>

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
                                <Label htmlFor="full_name_kana">フリガナ (任意)</Label>
                                <Input id="full_name_kana" value={formData.full_name_kana} onChange={handleChange} placeholder="ヤマダ タロウ" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label>性別 (任意)</Label>
                                <Select onValueChange={(val) => setFormData({ ...formData, gender: val })}>
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
                                <Label htmlFor="birth_date">生年月日 (任意)</Label>
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
                                <Label htmlFor="contact_email">メールアドレス (任意)</Label>
                                <Input id="contact_email" type="email" value={formData.contact_email} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact_phone">電話番号 (任意)</Label>
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
                                <Label htmlFor="second_student_name">名前 (任意)</Label>
                                <Input id="second_student_name" value={formData.second_student_name} onChange={handleChange} placeholder="同伴する生徒名" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="second_student_name_kana">フリガナ (任意)</Label>
                                <Input id="second_student_name_kana" value={formData.second_student_name_kana} onChange={handleChange} placeholder="フリガナ (2人目)" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label>性別 (2人目) (任意)</Label>
                                <Select onValueChange={(val) => setFormData({ ...formData, second_student_gender: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="性別 (2人目)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="男性">男性</SelectItem>
                                        <SelectItem value="女性">女性</SelectItem>
                                        <SelectItem value="その他">その他</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2 items-center">
                                    <Input
                                        id="second_student_birth_date"
                                        type="date"
                                        value={formData.second_student_birth_date}
                                        onChange={handleChange}
                                        placeholder="生年月日 (2人目)"
                                    />
                                    {ageInfo2 && (
                                        <span className="text-sm text-green-600 font-medium whitespace-nowrap">
                                            {ageInfo2.age}歳 ({ageInfo2.grade})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Membership & Coach */}
                <Card>
                    <CardHeader>
                        <CardTitle>契約・担当</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>会員区分 (任意)</Label>
                                <Select onValueChange={(val) => setFormData({ ...formData, membership_type_id: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {membershipTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                        ))}
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
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        登録
                    </Button>
                </div>
            </form>
        </div >
    )
}
