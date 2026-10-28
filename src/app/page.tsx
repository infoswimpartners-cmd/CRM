import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session
  let user = null

  if (session) {
    const { data: userData } = await supabase.auth.getUser()
    user = userData?.user
  }

  // 1. 未ログインユーザーはログイン案内画面を表示
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Swim Partners Manager</h1>
            <p className="text-sm text-slate-500">コーチング・会員業務管理システム</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            関係者（管理者・コーチ・会員）専用のポータルです。<br />ログインしてご利用ください。
          </p>
          <div className="pt-2">
            <Button asChild className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold h-11 rounded-xl">
              <Link href="/login">ログイン画面へ進む</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 2. ログイン済みユーザーのリダイレクト判定（既存保護）
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

// 生徒プロフィール確認ヘルパー（既存保護）
async function getStudentProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('auth_user_id', userId)
    .single()
  return data
}
