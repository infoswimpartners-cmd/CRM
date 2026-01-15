import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
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
