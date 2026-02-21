import { getAdminInquiries } from '@/actions/admin-inquiry'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function AdminInquiryListPage() {
    const inquiries = await getAdminInquiries()

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge variant="secondary">未対応</Badge>
            case 'replied': return <Badge className="bg-green-600">返信済</Badge>
            case 'closed': return <Badge variant="outline">完了</Badge>
            default: return <Badge>{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">お問い合わせ管理</h1>

            <div className="grid gap-4">
                {inquiries.map((inquiry: any) => (
                    <Card key={inquiry.id}>
                        <Link href={`/admin/inquiries/${inquiry.id}`} className="block">
                            <CardHeader className="p-4 flex flex-row items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(inquiry.status)}
                                        <span className="text-sm font-medium">{inquiry.students?.full_name || '不明なユーザー'}</span>
                                        <span className="text-xs text-gray-500">
                                            {format(new Date(inquiry.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base">{inquiry.subject}</CardTitle>
                                </div>
                            </CardHeader>
                        </Link>
                    </Card>
                ))}
            </div>
        </div >
    )
}
