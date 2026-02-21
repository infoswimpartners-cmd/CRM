import { getInquiryDetails } from '@/actions/inquiry'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import ReplyForm from './ReplyForm' // Separate client component for reply

export default async function InquiryDetailPage({ params }: { params: { id: string } }) {
    const data = await getInquiryDetails(params.id)
    if (!data) notFound()

    const { inquiry, messages } = data

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
        <div className="max-w-3xl mx-auto space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex-none">
                <Link href="/member/contact" className="text-sm text-gray-500 hover:underline flex items-center mb-4">
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    お問い合わせ一覧に戻る
                </Link>

                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-xl font-bold line-clamp-1">{inquiry.subject}</h1>
                    {getStatusBadge(inquiry.status)}
                </div>
                <div className="text-xs text-gray-400 mb-4">
                    開始日時: {format(new Date(inquiry.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                </div>
                <div className="h-px bg-gray-200 w-full mb-4"></div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 p-2">
                {messages && messages.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.is_admin
                                ? 'bg-white border border-gray-200 text-gray-800'
                                : 'bg-blue-600 text-white'
                            }`}>
                            <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                            <div className={`text-[10px] mt-1 ${msg.is_admin ? 'text-gray-400' : 'text-blue-100'
                                }`}>
                                {msg.is_admin ? '運営より' : 'あなた'} • {format(new Date(msg.created_at), 'MM/dd HH:mm', { locale: ja })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reply Input */}
            <div className="flex-none pt-4 bg-gray-50 sticky bottom-0">
                {inquiry.status === 'closed' ? (
                    <div className="p-4 text-center bg-gray-100 text-gray-500 rounded-md">
                        解決済みのため、このお問い合わせには返信できません。
                    </div>
                ) : (
                    <ReplyForm inquiryId={inquiry.id} />
                )}
            </div>
        </div>
    )
}
