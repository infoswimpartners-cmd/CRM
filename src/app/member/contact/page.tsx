import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getInquiries } from '@/actions/inquiry'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowLeft, MessageCircle, Plus } from 'lucide-react'

export default async function ContactPage() {
    const inquiries = await getInquiries()

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge variant="secondary">受付中</Badge>
            case 'pending':
                return <Badge className="bg-orange-500">対応中</Badge>
            case 'replied':
                return <Badge className="bg-green-600">返信あり</Badge>
            case 'closed':
                return <Badge variant="outline">解決済み</Badge>
            default:
                return <Badge>{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">お問い合わせ</h1>
                    <p className="text-gray-500 text-sm">運営へのお問い合わせ履歴</p>
                </div>
                <Button asChild>
                    <Link href="/member/contact/new">
                        <Plus className="mr-2 h-4 w-4" />
                        新規作成
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4">
                {inquiries.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-gray-500">
                            お問い合わせ履歴はありません。
                        </CardContent>
                    </Card>
                ) : (
                    inquiries.map((inquiry: any) => (
                        <Card key={inquiry.id} className="hover:shadow-md transition-shadow">
                            <Link href={`/member/contact/${inquiry.id}`}>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(inquiry.status)}
                                                <span className="text-xs text-gray-400">
                                                    {format(new Date(inquiry.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                                </span>
                                            </div>
                                            <CardTitle className="text-base line-clamp-1">
                                                {inquiry.subject}
                                            </CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Link>
                        </Card>
                    ))
                )}
            </div>

            <div className="mt-8">
                <Link href="/member/dashboard" className="text-sm text-gray-500 hover:underline flex items-center">
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    ダッシュボードに戻る
                </Link>
            </div>
        </div>
    )
}
