import { getCachedMemberData } from '@/lib/member-data';
import { redirect } from 'next/navigation';
import WithdrawalForm from '@/components/forms/WithdrawalForm';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: '退会お手続き | Swim Partners',
  description: 'Swim Partners のオンライン退会お手続きフォームです。規約をご確認の上、お手続きをお進めください。',
};

async function WithdrawContent() {
  const { user, student } = await getCachedMemberData();

  // ログインしていない場合はログイン画面へリダイレクト
  if (!user) {
    redirect('/member/login');
  }

  return (
    <div className="py-8">
      <WithdrawalForm
        initialLineUserId={student?.line_user_id || ''}
        studentName={student?.full_name || ''}
      />
    </div>
  );
}

export default function WithdrawPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-slate-800 mx-auto" />
            <p className="text-sm font-bold text-slate-500">データを読み込み中...</p>
          </div>
        </div>
      }>
        <WithdrawContent />
      </Suspense>
    </div>
  );
}
