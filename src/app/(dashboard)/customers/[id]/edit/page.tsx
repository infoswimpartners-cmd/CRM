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
        contact_email: '',
        contact_phone: '',
        student_notes: '', // notes on students table
        status: 'inquiry',
        membership_type_id: ''
    })

    const [membershipTypes, setMembershipTypes] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        const fetchMembershipTypes = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('membership_types')
                .select('id, name')
                .eq('active', true)
                .order('fee')
            if (data) setMembershipTypes(data)
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
                gender: data.gender || '',
                birth_date: data.birth_date || '',
                contact_email: data.contact_email || '',
                contact_phone: data.contact_phone || '',
                student_notes: data.notes || '',
                status: data.status || 'inquiry',
                membership_type_id: data.membership_type_id || ''
            })
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const supabase = createClient()

        try {
            const { error } = await supabase.from('students').update({
                full_name: formData.full_name,
                full_name_kana: formData.full_name_kana,
                gender: formData.gender,
                birth_date: formData.birth_date || null,
                contact_email: formData.contact_email,
                contact_phone: formData.contact_phone,
                notes: formData.student_notes,
                status: formData.status,
                membership_type_id: formData.membership_type_id || null
            }).eq('id', id)

            if (error) throw error

            toast.success('生徒情報を更新しました')
            router.push(`/customers/${id}`)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('更新に失敗しました')
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

            <Card>
                <CardHeader>
                    <CardTitle>基本情報</CardTitle>
                    <CardDescription>生徒の情報を修正してください。</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        <div className="grid grid-cols-2 gap-4">
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



                        <div className="space-y-2">
                            <Label htmlFor="student_notes">備考</Label>
                            <Textarea id="student_notes" value={formData.student_notes} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="status">ステータス</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inquiry">お問い合わせ</SelectItem>
                                        <SelectItem value="trial_pending">体験予定</SelectItem>
                                        <SelectItem value="trial_done">体験受講済</SelectItem>
                                        <SelectItem value="active">会員</SelectItem>
                                        <SelectItem value="resting">休会中</SelectItem>
                                        <SelectItem value="withdrawn">退会</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" type="button" onClick={() => router.back()}>キャンセル</Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                更新
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div >
    )
}
