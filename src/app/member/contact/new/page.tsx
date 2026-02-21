'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInquiry } from '@/actions/inquiry'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NewInquiryPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        try {
            const result = await createInquiry(formData)
            if (result.success) {
                toast.success('お問い合わせを送信しました')
                router.push(`/member/contact/${result.inquiryId}`)
            } else {
                if (typeof result.error === 'object') {
                    // Show validation errors
                    const messages = Object.values(result.error).flat().join('\n')
                    toast.error(messages)
                } else {
                    toast.error(result.error as string)
                }
            }
        } catch (error) {
            toast.error('送信エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Link href="/member/contact" className="text-sm text-gray-500 hover:underline flex items-center">
                <ArrowLeft className="mr-1 h-3 w-3" />
                一覧に戻る
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>新規お問い合わせ</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">件名</Label>
                            <Input
                                id="subject"
                                name="subject"
                                placeholder="例：レッスンの振替について"
                                required
                                maxLength={100}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="body">お問い合わせ内容</Label>
                            <Textarea
                                id="body"
                                name="body"
                                placeholder="詳細をご記入ください"
                                required
                                className="min-h-[150px]"
                                maxLength={2000}
                            />
                            <p className="text-xs text-gray-400 text-right">2000文字以内</p>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '送信する'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
