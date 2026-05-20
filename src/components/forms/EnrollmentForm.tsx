"use client";

import React, { useState, useEffect } from 'react';
import liff from '@line/liff';
import { createEnrollmentCheckoutSession } from '@/actions/stripe_enrollment';

interface DBPlan {
  id: string;
  name: string;
  fee: number;
  stripe_price_id: string;
  active: boolean;
  display_order: number;
}

interface EnrollmentFormProps {
  dbPlans: DBPlan[];
}

export default function EnrollmentForm({ dbPlans }: EnrollmentFormProps) {
  const [selectedParentPlan, setSelectedParentPlan] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<'60' | '90' | '120'>('60');
  const [agreedTerms, setAgreedTerms] = useState({
    billing: false,
    cancel: false,
  });

  // LIFF関連のステート
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // LIFF初期化とLINE ユーザーID取得
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error("NEXT_PUBLIC_LIFF_ID が設定されていません。");
        }

        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserId(profile.userId);
          setIsLiffReady(true);
        } else {
          const redirectUri = window.location.origin + window.location.pathname;
          setLiffError("LINEログインが必要です。ログイン画面へ移動します...");
          setIsLiffReady(true);
          liff.login({ redirectUri });
        }
      } catch (error: any) {
        console.error("LIFF初期化エラー:", error);
        setLiffError(error.message || "LIFFの初期化に失敗しました。");
        setIsLiffReady(true);
      }
    };

    initLiff();
  }, []);

  const PARENT_PLANS = [
    { id: 'monthly-4', name: '月4回継続プラン' },
    { id: 'monthly-2', name: '月2回継続プラン' },
    { id: 'single', name: '単発プラン' },
    { id: 'package-25m', name: '25m完泳パッケージ（全12回）' }
  ];

  // 選択された親プランと時間に基づいて、具体的なDBプランを取得する
  const activePlan = (() => {
    if (!selectedParentPlan) return null;

    if (selectedParentPlan === 'package-25m') {
      return {
        id: 'package-25m',
        stripePriceId: 'price_1SwKVfP0UQGtpYXm9cgy3v1g',
        name: '25m完泳パッケージ（全12回）',
        price: 102000,
        period: '一括',
        description: '夏までに絶対に泳ぎたい方向け！圧倒的安心の「完泳保証」が付いたパッケージです。',
        rules: [
          'プロの完泳保証付き（万が一12回で泳げなかった場合、最大4回分の補講レッスンを無償提供）。',
          '1回あたり8,500円（月4回コースと同等の特別価格）で受講可能です。',
          'コーチの交通費・施設利用料がすべて含まれています。'
        ],
      };
    }

    if (selectedParentPlan === 'single') {
      const dbPlan = dbPlans.find(p => p.name === '単発');
      return {
        id: dbPlan?.id || 'single',
        stripePriceId: dbPlan?.stripe_price_id || 'price_1SwKVdP0UQGtpYXmjXxiPSK6',
        name: '単発プラン',
        price: dbPlan?.fee ?? 0,
        period: '月',
        description: '定期的に通うのが難しい方へ。月会費0円で、受講した分だけその都度決済されるプランです。',
        rules: [
          '入会金・年会費・月会費は一切かかりません（0円/月）。',
          'レッスンを受講する都度、レッスン料金が発生いたします。',
          '初回手続き時にクレジットカード情報を登録いただきます（登録時の決済額は0円です）。',
          '2回目以降のレッスン受講時は、登録カードから受講料が自動決済されます。'
        ],
      };
    }

    // 月2回 / 月4回
    const isMonthly4 = selectedParentPlan === 'monthly-4';
    const planName = isMonthly4 ? `月4回（${selectedDuration}分）` : `月2回（${selectedDuration}分）`;
    // DB内の表記ゆれ対応（120分プランは ' (120分)' と半角スペースになっているため）
    const altPlanName = isMonthly4 ? `月4回 (${selectedDuration}分)` : `月2回 (${selectedDuration}分)`;

    const dbPlan = dbPlans.find(p => p.name === planName || p.name === altPlanName);

    // デフォルトルール・説明の設定
    let description = isMonthly4
      ? `着実にステップアップしたい方へ。定期的にお得に通えるおすすめの月4回（${selectedDuration}分）プランです。`
      : `ご自身のペースで無理なく、コツコツと継続していきたい方向けの月2回（${selectedDuration}分）プランです。`;
    let rules = [
      'コーチの交通費・施設利用料がすべて含まれています。',
      isMonthly4
        ? `レッスンの追加・先行利用は「8,500円/回」で可能です。`
        : `レッスンの追加・先行利用は「8,700円/回」で可能です。`,
      '振替の有効期間は【2ヶ月間】となります。',
      '入会金・年会費は一切かかりません。'
    ];

    return {
      id: dbPlan?.id || '',
      stripePriceId: dbPlan?.stripe_price_id || '',
      name: isMonthly4 ? `月4回継続プラン（${selectedDuration}分）` : `月2回継続プラン（${selectedDuration}分）`,
      price: dbPlan?.fee ?? 0,
      period: '月',
      description,
      rules,
    };
  })();

  // すべての規約に同意し、プランが正しく選ばれているかチェック（ボタンの活性化条件）
  const isSubmitDisabled = !selectedParentPlan || (activePlan && !activePlan.id) || !agreedTerms.billing || !agreedTerms.cancel || !userId || isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled || !activePlan) return;

    setIsSubmitting(true);
    try {
      const res = await createEnrollmentCheckoutSession(activePlan.id, userId);
      if (res.success && res.url) {
        // Stripe Checkout画面へリダイレクト
        window.location.href = res.url;
      } else {
        alert(res.error || "決済画面の生成に失敗しました。時間をおいて再度お試しください。");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      alert("通信エラーが発生しました。接続状況を確認の上、再度お試しください。");
      setIsSubmitting(false);
    }
  };

  // 読み込み中の美しくリッチな表示
  if (!isLiffReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-600">LINE情報を確認中...</p>
        </div>
      </div>
    );
  }

  // エラー発生時の美しくリッチな表示
  if (liffError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">⚠️</div>
          <h2 className="text-base font-bold text-slate-800">エラーが発生しました</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{liffError}</p>
          <p className="text-xs text-slate-400">LINEアプリから開き直すか、管理者に問い合わせてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* ヘッダー */}
        <div className="bg-gradient-to-r top-0 from-blue-700 to-cyan-500 p-6 text-center text-white">
          <h1 className="text-xl font-bold tracking-wider">Swim Partners</h1>
          <p className="text-xs opacity-90 mt-1">オンライン入会お手続き</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* STEP 1: プラン選択 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              ① ご希望の入会プランを選択してください
            </label>
            
            {/* 料金詳細ページへの美しいテキストリンク */}
            <div className="mb-4">
              <a
                href="https://swim-partners.com/price"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                <span className="mr-1">💡</span> 詳しい料金プランについてはこちら（料金表ページ） ➔
              </a>
            </div>

            <div className="space-y-3">
              {PARENT_PLANS.map((plan) => (
                <div key={plan.id} className="space-y-2">
                  <label
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedParentPlan === plan.id
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="parentPlan"
                          value={plan.id}
                          checked={selectedParentPlan === plan.id}
                          onChange={() => {
                            setSelectedParentPlan(plan.id);
                          }}
                          className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <span className="font-bold text-slate-800 text-sm sm:text-base">{plan.name}</span>
                      </div>
                    </div>
                  </label>

                  {/* 時間選択サブオプション（月4回・月2回が選択された場合に出現） */}
                  {selectedParentPlan === plan.id && (plan.id === 'monthly-4' || plan.id === 'monthly-2') && (
                    <div className="ml-7 p-3 bg-slate-100/80 rounded-xl border border-slate-200/60 animate-fadeIn space-y-2">
                      <span className="text-xs font-bold text-slate-500 block">⏱️ 1回のレッスン時間を選択してください</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(['60', '90', '120'] as const).map((duration) => (
                          <button
                            key={duration}
                            type="button"
                            onClick={() => setSelectedDuration(duration)}
                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                              selectedDuration === duration
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-transparent shadow-sm'
                                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {duration}分
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 2: 動的な料金・ルール表示（プラン選択時のみ出現） */}
          {activePlan && (
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4 animate-fadeIn">
              <div>
                <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">選択中のプラン料金</span>
                <div className="mt-1 flex items-baseline text-slate-900">
                  {activePlan.id ? (
                    <>
                      <span className="text-3xl font-black">¥{activePlan.price.toLocaleString()}</span>
                      <span className="text-sm font-bold text-slate-500 ml-1">（税込 / {activePlan.period}）</span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-red-500">料金情報を取得できませんでした。</span>
                  )}
                </div>
                {activePlan.id ? (
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{activePlan.description}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">このプラン・時間は現在データベースに登録されていないか、準備中です。</p>
                )}
              </div>

              {activePlan.id && (
                <div className="border-t border-slate-200 pt-3">
                  <span className="text-xs font-bold text-slate-500 block mb-2">📋 このプランの受講ルール</span>
                  <ul className="space-y-1.5">
                    {activePlan.rules.map((rule, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start">
                        <span className="text-cyan-500 mr-1.5 font-bold">✓</span>
                        <span className="leading-normal">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: 利用規約・同意事項 */}
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              ② 利用規約および重要事項への同意
            </label>
            
            <div className="space-y-3">
              <label className="flex items-start p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms.billing}
                  onChange={(e) => setAgreedTerms({ ...agreedTerms, billing: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-xs text-slate-600 leading-relaxed">
                  <strong>月謝・決済に関する同意：</strong><br />
                  継続プランの場合、毎月25日に翌月分の月謝が登録クレジットカードより自動決済されることに同意します。（Stripeシステムを利用）
                </span>
              </label>

              <label className="flex items-start p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms.cancel}
                  onChange={(e) => setAgreedTerms({ ...agreedTerms, cancel: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-xs text-slate-600 leading-relaxed">
                  <strong>変更・解約・受講ルールに関する同意：</strong><br />
                  選択したプランに記載 of 受講ルール（振替期間等）を遵守し、休会または解約を希望する場合は【前月10日まで】に申請を行うことに同意します。
                </span>
              </label>
            </div>
          </div>

          {/* 送信（決済）ボタン */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`w-full py-4 px-4 rounded-xl font-bold text-center tracking-wider transition-all shadow-md ${
              isSubmitDisabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-95 active:scale-[0.98]'
            }`}
          >
            {isSubmitting
              ? '決済画面へ移動中...'
              : selectedParentPlan
              ? 'クレジットカード決済登録へ進む'
              : 'プランを選択してください'}
          </button>

        </form>
      </div>
    </div>
  );
}
