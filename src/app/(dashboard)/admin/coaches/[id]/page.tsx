import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { ChevronLeft, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { AssignedStudentsTable } from '@/components/admin/AssignedStudentsTable'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CoachDetailPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch coach profile
    const { data: coach } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

    if (!coach) {
        notFound()
    }

    // Fetch assigned students
    const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('coach_id', id)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/coaches">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">コーチ詳細</h1>
                    </div>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/admin/coaches/${id}/edit`}>
                        編集
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-6 p-6 border rounded-lg bg-white shadow-sm">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={coach.avatar_url} />
                    <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold">{coach.full_name}</h2>
                    <div className="flex items-center text-gray-500 gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{coach.email}</span>
                    </div>
                    {coach.role === 'admin' && (
                        <div className="mt-2">
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                                管理者 (Master)
                            </Badge>
                        </div>
                    )}
                    {coach.username && (
                        <div className="text-sm text-gray-400">@{coach.username}</div>
                    )}
                </div>
            </div>

            <AssignedStudentsTable
                coachId={coach.id}
                students={students || []}
            />
        </div>
    )
}
