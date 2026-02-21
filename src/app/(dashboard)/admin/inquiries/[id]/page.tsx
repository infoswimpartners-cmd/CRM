import { getAdminInquiryDetails } from '@/actions/admin-inquiry' // Fix import path
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import AdminReplyForm from './AdminReplyForm' // Separate component
import CloseButton from './CloseButton' // Separate component

export default async function AdminInquiryDetailPage({ params }: { params: { id: string } }) {
    const data = await getAdminInquiryDetails(params.id)
    if (!data) notFound()

    const { inquiry, messages } = data

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge variant="secondary">未対応</Badge>
            case 'replied': return <Badge className="bg-green-600">返信済</Badge>
            case 'closed': return <Badge variant="outline">完了</Badge>
            default: return <Badge>{status}</Badge>
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Link href="/admin/inquiries" className="text-sm text-gray-500 hover:underline flex items-center">
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    一覧に戻る
                </Link>
                <div className="flex gap-2">
                    <CloseButton inquiryId={inquiry.id} isClosed={inquiry.status === 'closed'} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-xl font-bold mb-2">{inquiry.subject}</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>{inquiry.students?.full_name}</span>
                            <span>{inquiry.students?.contact_email}</span>
                            <span>{format(new Date(inquiry.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>
                        </div>
                    </div>
                    {getStatusBadge(inquiry.status)}
                </div>

                <div className="border-t pt-4 space-y-6">
                    {messages && messages.map((msg: any) => (
                        <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-4 ${msg.is_admin
                                ? 'bg-blue-50 border border-blue-100'
                                : 'bg-gray-50 border border-gray-100'
                                }`}>
                                <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
                                <div className="text-xs text-gray-400 mt-2 text-right">
                                    {msg.is_admin ? '管理者' : 'ユーザー'} • {format(new Date(msg.created_at), 'MM/dd HH:mm', { locale: ja })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="font-bold mb-4">返信</h2>
                <AdminReplyForm inquiryId={inquiry.id} />
            </div>
        </div>
    )
}
