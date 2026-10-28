import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TopLandingPage } from '@/components/landing/TopLandingPage'

export default async function Home() {
  const supabase = await createClient()

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session
  let user = null

  if (session) {
    const { data: userData } = await supabase.auth.getUser()
    user = userData?.user
  }

  // 1. ログイン済みユーザーのリダイレクト判定（既存動作を100%保持）
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'owner') {
      redirect('/admin')
    } else if (profile?.role === 'coach') {
      redirect('/coach')
    }

    // 生徒（会員）の判定
    const student = await getStudentProfile(supabase, user.id)
    if (student) {
      redirect('/member/dashboard')
    }

    // 役割未設定時のフォールバック
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">アカウント設定が必要です</h1>
        <p className="mb-8 text-slate-600">あなたのユーザーには役割（Role）が割り当てられていません。管理者に連絡してください。</p>
        <Button onClick={async () => {
          'use server'
          try {
            const supabase = await createClient()
            await supabase.auth.signOut()
          } catch (e) {
            console.error('SignOut error:', e)
          }
          redirect('/')
        }}>
          ログアウト
        </Button>
      </div>
    )
  }

  // 2. 未ログイン一般ユーザー向け公開トップページLP（高CVR最適化）
  return <TopLandingPage isPreview={false} />
}

// 生徒プロフィール確認ヘルパー（既存保護）
async function getStudentProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('auth_user_id', userId)
    .single()
  return data
}
