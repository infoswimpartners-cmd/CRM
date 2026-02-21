import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)
  console.log('[DEBUG] Root Page Session:', session ? 'Found' : 'Not Found')

  if (session) {
    redirect('/member/dashboard')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="mb-4 text-4xl font-bold">Swim Partners Manager</h1>
        <p className="mb-8 text-xl text-gray-600">コーチング業務管理システム</p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/login">ログイン</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Fetch user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  } else if (profile?.role === 'coach') {
    redirect('/coach')
  }

  // Check if user is a student (member)
  const student = await getStudentProfile(supabase, user.id)
  if (student) {
    redirect('/member/dashboard')
  }

  // Fallback if no role found (should ideally not happen if trigger works)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-2xl font-bold">アカウント設定が必要です</h1>
      <p className="mb-8">あなたのユーザーには役割（Role）が割り当てられていません。管理者に連絡してください。</p>
      <Button onClick={async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/')
      }}>
        ログアウト
      </Button>
    </div>
  )
}

// Helper to check for student profile
async function getStudentProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('auth_user_id', userId)
    .single()
  return data
}
