import { getCachedMemberData } from '@/lib/member-data';
import { createAdminClient } from '@/lib/supabase/admin';
import WithdrawalForm from '@/components/forms/WithdrawalForm';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: '退会お手続き | Swim Partners',
  description: 'Swim Partners のオンライン退会お手続きフォームです。規約をご確認の上、お手続きをお進めください。',
};

interface SearchParams {
  line_user_id?: string;
  userId?: string;
}

// サーバー側で検索クエリやセッションから受講生情報を解決するコンポーネント
async function WithdrawContent({ resolvedSearchParams }: { resolvedSearchParams: SearchParams }) {
  // 1. まずログインセッションがあるかチェック
  const { user, student: sessionStudent } = await getCachedMemberData();
  
  let lineUserId = sessionStudent?.line_user_id || '';
  let studentName = sessionStudent?.full_name || '';

  // 2. クエリパラメータからLINEユーザーIDを取得
  const queryLineUserId = resolvedSearchParams.line_user_id || resolvedSearchParams.userId || '';
  
  // ログインしていない場合でも、クエリパラメータにLINE IDがあれば優先して読み込み
  if (queryLineUserId) {
    lineUserId = queryLineUserId;
    
    // クエリパラメータの line_user_id に紐づく生徒名をDBから自動解決（おもてなし向上）
    try {
      const supabaseAdmin = createAdminClient();
      const { data: dbStudent } = await supabaseAdmin
        .from('students')
        .select('full_name')
        .eq('line_user_id', queryLineUserId)
        .single();
      
      if (dbStudent) {
        studentName = dbStudent.full_name;
      }
    } catch (e) {
      console.error('Failed to fetch student name by line_user_id:', e);
    }
  }

  // 【ユーザー要望に基づく変更】
  // ログインセッションがなく、かつパラメータもないプレーンな本番URL（/withdraw）アクセスであっても、
  // ログイン画面へ強制リダイレクトさせず、手動入力フォームとして直接表示します。

  return (
    <div className="py-8">
      <WithdrawalForm
        initialLineUserId={lineUserId}
        studentName={studentName}
      />
    </div>
  );
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function WithdrawPage({ searchParams }: PageProps) {
  // Next.js 15/16 仕様: サーバーコンポーネントの searchParams は Promise のため await で解決する
  const resolvedSearchParams = await searchParams;

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
        <WithdrawContent resolvedSearchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
