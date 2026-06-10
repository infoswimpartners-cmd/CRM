import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/forms/ProfileForm'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CoachAvailabilitySettings } from '@/components/admin/CoachAvailabilitySettings'

export default async function CoachProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return <div>プロファイルが見つかりません</div>
    }

    const { data: availabilities } = await supabase
        .from('coach_availabilities')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: true })

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/coach">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">プロフィール設定</h1>
            </div>

            <ProfileForm
                profileId={profile.id}
                initialData={{
                    full_name: profile.full_name,
                    full_name_kana: profile.full_name_kana,
                    avatar_url: profile.avatar_url,
                    line_friend_url: profile.line_friend_url,
                    base_area: profile.base_area
                }}
                redirectPath="/coach"
                description="あなたのアカウント情報を編集します"
            />

            <CoachAvailabilitySettings
                coachId={profile.id}
                initialAvailabilities={availabilities || []}
                baseArea={profile.base_area || null}
            />
        </div>
    )
}
