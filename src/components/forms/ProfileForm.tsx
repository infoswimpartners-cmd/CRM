'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Camera } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ProfileFormProps {
    profileId: string
    initialData: {
        full_name: string
        full_name_kana: string | null
        avatar_url: string | null
        role?: string
        override_coach_rank?: number | null
    }
    redirectPath: string
    title?: string
    description?: string
    enableRoleEdit?: boolean
}

export function ProfileForm({ profileId, initialData, redirectPath, title = "プロフィール編集", description, enableRoleEdit = false }: ProfileFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [formData, setFormData] = useState({
        full_name: initialData.full_name || '',
        full_name_kana: initialData.full_name_kana || '',
        avatar_url: initialData.avatar_url || '',
        role: initialData.role || 'coach',
        override_coach_rank: initialData.override_coach_rank ?? 'auto', // use string 'auto' for null in select
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const handleRoleChange = (value: string) => {
        setFormData({ ...formData, role: value })
    }

    const handleRankChange = (value: string) => {
        setFormData({ ...formData, override_coach_rank: value })
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) {
                return
            }

            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${profileId}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const supabase = createClient()
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                // If bucket doesn't exist, this will fail.
                // We'll catch and show specific error.
                throw uploadError
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setFormData({ ...formData, avatar_url: publicUrl })
            toast.success('画像をアップロードしました')
        } catch (error: any) {
            console.error('Upload Error:', error)
            if (error.message?.includes('Bucket not found')) {
                toast.error('保存先（バケット）が見つかりません。管理者に連絡してください。')
            } else {
                toast.error('画像のアップロードに失敗しました')
            }
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            const updates: any = {
                full_name: formData.full_name,
                full_name_kana: formData.full_name_kana || null,
                avatar_url: formData.avatar_url || null,
            }

            if (enableRoleEdit) {
                updates.role = formData.role
                updates.override_coach_rank = formData.override_coach_rank === 'auto' ? null : parseFloat(formData.override_coach_rank as string)
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profileId)

            if (error) throw error

            toast.success('プロフィールを更新しました')
            router.push(redirectPath)
        } catch (error: any) {
            console.error('Profile update error:', error)
            toast.error(`更新に失敗しました: ${error?.message || '不明なエラー'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Selection */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={formData.avatar_url || ''} />
                                <AvatarFallback className="text-2xl">
                                    {formData.full_name?.slice(0, 1) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <Label
                                htmlFor="avatar-upload"
                                className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                <Input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                    disabled={uploading}
                                />
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">プロフィール写真</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="full_name">氏名 *</Label>
                        <Input id="full_name" required value={formData.full_name} onChange={handleChange} placeholder="山田 太郎" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="full_name_kana">フリガナ</Label>
                        <Input id="full_name_kana" value={formData.full_name_kana} onChange={handleChange} placeholder="ヤマダ タロウ" />
                    </div>

                    {enableRoleEdit && (
                        <div className="space-y-2">
                            <Label htmlFor="role">権限</Label>
                            <Select value={formData.role} onValueChange={handleRoleChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="権限を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="coach">コーチ</SelectItem>
                                    <SelectItem value="admin">管理者 (Master)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">管理者は報酬ランクがMasterとなり、源泉徴収が免除されます。</p>
                        </div>
                    )}

                    {enableRoleEdit && (
                        <div className="space-y-2">
                            <Label htmlFor="rank">コーチランク設定 (報酬率)</Label>
                            <Select
                                value={formData.override_coach_rank?.toString() || 'auto'}
                                onValueChange={handleRankChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="自動判定" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">自動判定 (実績ベース)</SelectItem>
                                    <SelectItem value="1.0">管理者 (100%)</SelectItem>
                                    <SelectItem value="0.7000001">特例 (70% + 体験¥5,000)</SelectItem>
                                    <SelectItem value="0.7">Special (70%)</SelectItem>
                                    <SelectItem value="0.65">S (65%)</SelectItem>
                                    <SelectItem value="0.6">A (60%)</SelectItem>
                                    <SelectItem value="0.55">B (55%)</SelectItem>
                                    <SelectItem value="0.5">Regular (50%)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                ※「自動判定」を選択すると、直近3ヶ月のレッスン数に基づいて自動的に計算されます。<br />
                                ※固定値を設定すると、自動判定を無視して常にそのランクが適用されます。
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" type="button" onClick={() => router.back()}>キャンセル</Button>
                        <Button type="submit" disabled={loading || uploading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            更新
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card >
    )
}
