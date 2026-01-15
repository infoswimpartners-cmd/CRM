import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfileForm } from '@/components/forms/ProfileForm'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditCoachPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: coach } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

    if (!coach) {
        notFound()
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/coaches/${id}`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">コーチ情報編集</h1>
            </div>

            <ProfileForm
                profileId={coach.id}
                initialData={{
                    full_name: coach.full_name,
                    full_name_kana: coach.full_name_kana,
                    avatar_url: coach.avatar_url,
                    role: coach.role
                }}
                enableRoleEdit={true}
                redirectPath={`/admin/coaches/${id}`}
                description="コーチの登録情報を変更します"
            />
        </div>
    )
}
