'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitWithdrawal } from '@/actions/withdrawal';
import { Loader2, CheckCircle2, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// 退会理由の定義
const REASONS = [
  { id: 'time-finance', label: 'スケジュール・金銭的に継続が難しい' },
  { id: 'coach-match', label: 'コーチとの相性・レッスン内容が合わない' },
  { id: 'goal-achieved', label: '目標を達成した（25m完泳など）' },
  { id: 'other', label: 'その他（引っ越し・体調不良など）' },
];

interface WithdrawalFormProps {
  initialLineUserId?: string;
  studentName?: string;
}

export default function WithdrawalForm({ initialLineUserId = '', studentName = '' }: WithdrawalFormProps) {
  const searchParams = useSearchParams();
  
  // URLクエリパラメータまたは初期プロップスからLINEユーザーIDを決定
  const paramLineUserId = searchParams.get('line_user_id') || searchParams.get('userId') || '';
  const [lineUserId, setLineUserId] = useState(paramLineUserId || initialLineUserId);
  
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState({
    deadline: false,
    noRefund: false,
    expiry: false,
  });
  
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // クエリパラメータやPropsが変化した際の自動同期
  useEffect(() => {
    const activeId = paramLineUserId || initialLineUserId;
    if (activeId) {
      setLineUserId(activeId);
    }
  }, [paramLineUserId, initialLineUserId]);

  // ボタンの活性化条件（理由選択 ＋ LINEユーザーIDの入力 ＋ 3つのチェックすべて必須）
  const isSubmitDisabled = 
    !reason || 
    !lineUserId.trim() || 
    !agreed.deadline || 
    !agreed.noRefund || 
    !agreed.expiry || 
    isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsPending(true);
    setErrorMsg('');

    try {
      const res = await submitWithdrawal({
        line_user_id: lineUserId.trim(),
        withdrawal_reason: reason,
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        setErrorMsg(res.error || '送信に失敗しました。');
      }
    } catch (err: any) {
      setErrorMsg('通信エラーが発生しました。ネットワーク接続を確認してください。');
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl text-center border border-slate-100/80 transform scale-100 transition-transform duration-500">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">退会手続きを受付ました</h2>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            ご入力いただいた内容で退会（Stripeサブスクリプションの自動停止予約）の処理を進めます。<br />
            手続き完了の通知メール、またはLINEメッセージをご確認ください。
          </p>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">これまでの受講、誠にありがとうございました。</p>
            {studentName && (
              <p className="text-xs font-semibold text-slate-500 mt-2">受講生: {studentName} 様</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100/60 overflow-hidden transition-all duration-300">
      
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-center text-white relative">
        <Link 
          href="/member/dashboard" 
          className="absolute left-6 top-8 text-white/70 hover:text-white transition-colors"
          title="ダッシュボードへ戻る"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black tracking-wider">Swim Partners</h1>
        <p className="text-xs opacity-75 mt-1.5 font-medium tracking-widest uppercase">退会・各種変更手続き</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        
        {/* エラーメッセージ表示 */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 text-xs sm:text-sm text-rose-800 animate-pulse">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">申請エラー</p>
              <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* 生徒情報サマリー */}
        {studentName && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Student</p>
              <p className="text-sm font-black text-slate-700">{studentName} 様</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
              認証済み
            </span>
          </div>
        )}

        {/* LINEユーザーID管理（自動解決または手動入力） */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            LINEユーザーID
          </label>
          {paramLineUserId || initialLineUserId ? (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 truncate max-w-[280px]">
                {lineUserId}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                自動検出済
              </span>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={lineUserId}
                onChange={(e) => setLineUserId(e.target.value)}
                placeholder="U1234567890abcdef..."
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 leading-normal flex items-start gap-1">
                <Info size={12} className="shrink-0 mt-0.5" />
                LINE IDが検出されなかったため、手動で入力してください。LINE連携時と同じIDが必要です。
              </p>
            </div>
          )}
        </div>

        {/* STEP 1: 理由の選択 */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 tracking-tight">
            ① 退会をご希望される理由を教えてください
          </label>
          <div className="space-y-2.5">
            {REASONS.map((r) => {
              const isSelected = reason === r.id;
              return (
                <label
                  key={r.id}
                  className={`block p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-slate-800 bg-slate-50/50 shadow-sm'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="reason"
                        value={r.id}
                        checked={isSelected}
                        onChange={() => setReason(r.id)}
                        className="sr-only" // 標準のラジオボタンを隠し、美しいカスタムラジオを作る
                      />
                      <div className={`h-5 w-5 rounded-full border-2 transition-all ${
                        isSelected 
                          ? 'border-slate-800 bg-slate-800' 
                          : 'border-slate-300 bg-white'
                      } flex items-center justify-center`}>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className={`text-sm font-bold transition-colors ${
                      isSelected ? 'text-slate-800' : 'text-slate-600'
                    }`}>
                      {r.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* STEP 2: 動的な引き止め（解約抑止）アラート - 美しいアコーディオントランジション */}
        <div className="overflow-hidden transition-all duration-300">
          {reason === 'time-finance' && (
            <div className="bg-blue-50/70 border border-blue-200/50 rounded-2xl p-5 space-y-2 text-xs sm:text-sm text-blue-900 animate-[fadeIn_0.4s_ease-out]">
              <div className="flex items-center space-x-1 text-blue-800 font-black">
                <span>💡</span>
                <p>プラン変更のご提案</p>
              </div>
              <p className="leading-relaxed text-blue-700">
                毎週通うのが難しくなった方には、マイペースに続けられる<strong>「月2回継続プラン（17,400円）」</strong>への変更も承っております。これまで積み上げてきた泳力を維持するためにも、回数を減らして継続してみませんか？
              </p>
              <p className="text-blue-600 font-bold pt-2 border-t border-blue-100/50 mt-2 text-xs leading-normal">
                ※プラン変更をご希望の場合は、このまま退会フォームは送信せず、LINEチャットにて「プラン変更希望」と直接メッセージをお送りください。
              </p>
            </div>
          )}

          {reason === 'coach-match' && (
            <div className="bg-cyan-50/70 border border-cyan-200/50 rounded-2xl p-5 space-y-2 text-xs sm:text-sm text-cyan-900 animate-[fadeIn_0.4s_ease-out]">
              <div className="flex items-center space-x-1 text-cyan-800 font-black">
                <span>💡</span>
                <p>コーチ変更・無料お試しのご提案</p>
              </div>
              <p className="leading-relaxed text-cyan-700">
                ご期待に沿えず申し訳ございません。当スクールには他にも多様な指導実績を持つコーチが多数在籍しております。もしよろしければ、<strong>無料で別のコーチへの変更・お試しレッスン</strong>を手配させていただきます。
              </p>
              <p className="text-cyan-600 font-bold pt-2 border-t border-cyan-100/50 mt-2 text-xs leading-normal">
                ※コーチの変更をご希望の場合は、フォームは送信せずにLINEチャットにてお気軽にご相談ください。
              </p>
            </div>
          )}

          {reason === 'goal-achieved' && (
            <div className="bg-emerald-50/70 border border-emerald-200/50 rounded-2xl p-5 space-y-2 text-xs sm:text-sm text-emerald-900 animate-[fadeIn_0.4s_ease-out]">
              <div className="flex items-center space-x-1 text-emerald-800 font-black">
                <span>🎉</span>
                <p>25m完泳おめでとうございます！</p>
              </div>
              <p className="leading-relaxed text-emerald-700">
                目標達成、素晴らしいです！もしよろしければ、さらに綺麗なフォームで、長い距離を楽に泳げるようになる「中級・上級向けステップアッププログラム」もご用意しております。もう一歩先の美しい泳ぎを目指してみませんか？
              </p>
            </div>
          )}
        </div>

        {/* STEP 3: 鉄壁のルール同意（共通必須項目） */}
        <div className="space-y-3.5 border-t border-slate-100 pt-6">
          <label className="block text-sm font-black text-slate-700 tracking-tight">
            ② 退会規約への同意
          </label>
          <p className="text-xs text-slate-400 leading-normal">手続きを完了するには、すべての項目への同意が必要です。</p>
          
          <div className="space-y-3">
            <label className="flex items-start p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border border-slate-100/50">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed.deadline}
                  onChange={(e) => setAgreed({ ...agreed, deadline: e.target.checked })}
                  className="h-4.5 w-4.5 rounded-md border-slate-300 text-slate-800 focus:ring-slate-800/20"
                />
              </div>
              <span className="ml-3 text-xs text-slate-600 leading-relaxed">
                退会希望月（最後に受講する月）の<strong>【10日まで】</strong>の申請に該当していることを確認しました。（11日以降の申請の場合、翌々月末での退会となることに同意します）
              </span>
            </label>

            <label className="flex items-start p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border border-slate-100/50">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed.noRefund}
                  onChange={(e) => setAgreed({ ...agreed, noRefund: e.target.checked })}
                  className="h-4.5 w-4.5 rounded-md border-slate-300 text-slate-800 focus:ring-slate-800/20"
                />
              </div>
              <span className="ml-3 text-xs text-slate-600 leading-relaxed">
                毎月1日に自動決済される当月分の月謝について、月の途中で受講を停止された場合でも、<strong>日割り返金は一切行われない</strong>ことに同意します。
              </span>
            </label>

            <label className="flex items-start p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border border-slate-100/50">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed.expiry}
                  onChange={(e) => setAgreed({ ...agreed, expiry: e.target.checked })}
                  className="h-4.5 w-4.5 rounded-md border-slate-300 text-slate-800 focus:ring-slate-800/20"
                />
              </div>
              <span className="ml-3 text-xs text-slate-600 leading-relaxed">
                退会月の末日をもって、現在保有しているすべての<strong>未消化レッスンおよび振替の権利が自動的に完全失効する</strong>ことに同意します。
              </span>
            </label>
          </div>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`w-full py-4 px-6 rounded-2xl font-black text-center text-sm tracking-wider transition-all shadow-md flex items-center justify-center ${
            isSubmitDisabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50 shadow-none'
              : 'bg-slate-900 text-white hover:bg-slate-850 active:scale-[0.98] hover:shadow-lg'
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              退会申請を送信中...
            </>
          ) : (
            '確定して退会申請を送信する'
          )}
        </button>

      </form>
    </div>
  );
}
