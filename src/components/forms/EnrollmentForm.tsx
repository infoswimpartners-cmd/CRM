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
  is_package?: boolean;
  ticket_count?: number;
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
    initialLessons: false,
  });

  // 本人確認用の入力ステート
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // プラン・時間変更時に同意チェックをリセット
  useEffect(() => {
    setAgreedTerms(prev => ({ ...prev, initialLessons: false }));
  }, [selectedParentPlan, selectedDuration]);

  // LIFF関連のステート
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // LIFF初期化とLINE ユーザーID取得
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_ENROLL_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error("NEXT_PUBLIC_ENROLL_LIFF_ID または NEXT_PUBLIC_LIFF_ID が設定されていません。");
        }

        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserId(profile.userId);
          setIsLiffReady(true);
        } else {
          const redirectUri = window.location.origin + window.location.pathname;
          setLiffError("LINEログインが必要です。ログイン画面へ遷移します...");
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

  // DBから取得したパッケージプランの一覧
  const packagePlans = dbPlans.filter(p => p.is_package);

  // 固定プラン + DBパッケージプランを合わせたPARENT_PLANSリスト
  const PARENT_PLANS = [
    { id: 'monthly-4', name: '月4回継続プラン' },
    { id: 'monthly-2', name: '月2回継続プラン' },
    { id: 'single', name: '単発プラン' },
    // DBから取得したパッケージプランを動的に追加
    ...packagePlans.map(p => ({ id: p.id, name: p.name }))
  ];

  // 選択された親プランと時間に基づいて、具体的なDBプランを取得する
  const activePlan = (() => {
    if (!selectedParentPlan) return null;

    // DBパッケージプランの確認
    const pkgPlan = packagePlans.find(p => p.id === selectedParentPlan);
    if (pkgPlan) {
      return {
        id: pkgPlan.id,
        stripePriceId: pkgPlan.stripe_price_id,
        name: pkgPlan.name,
        price: pkgPlan.fee,
        period: '一括',
        isPackage: true,
        description: '一括払いのパッケージプランです。決済完了後、チケットが自動的に付与されます。',
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
        isPackage: false,
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
      isPackage: false,
      description,
      rules,
    };
  })();

  // すべての規約に同意し、プランが正しく選ばれているかチェック（ボタンの活性化条件）
  const isInitialLessonsAgreementRequired = selectedParentPlan === 'monthly-4' || selectedParentPlan === 'monthly-2';
  const isSubmitDisabled =
    !selectedParentPlan ||
    (activePlan && !activePlan.id) ||
    !agreedTerms.billing ||
    !agreedTerms.cancel ||
    (isInitialLessonsAgreementRequired && !agreedTerms.initialLessons) ||
    !userId ||
    !email.trim() ||
    !phone.trim() ||
    isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled || !activePlan) return;

    setIsSubmitting(true);
    try {
      const res = await createEnrollmentCheckoutSession(activePlan.id, userId, email, phone);
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
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">!</div>
          <p className="text-sm font-medium text-slate-700">{liffError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-8 bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-100 transition-all hover:shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            オンライン入会お手続き
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            ご希望のプランを選択し、利用規約に同意の上、カード登録（安全なStripe決済）へ進んでください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: プラン選択 */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">
              ① ご希望のプランを選択
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {PARENT_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedParentPlan(plan.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 ${
                    selectedParentPlan === plan.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-md font-bold text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <span className="font-bold text-slate-800 text-sm sm:text-base">{plan.name}</span>
                  {selectedParentPlan === plan.id && (
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 月2回 / 月4回プラン用のレッスン時間選択 */}
          {(selectedParentPlan === 'monthly-4' || selectedParentPlan === 'monthly-2') && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-fadeIn">
              <span className="text-xs font-bold text-slate-500 block">
                【選択】1回あたりのレッスン時間を選択してください
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['60', '90', '120'] as const).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSelectedDuration(dur)}
                    className={`h-11 rounded-xl text-xs font-bold transition-all duration-300 ${
                      selectedDuration === dur
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {dur}分コース
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: ご本人確認 */}
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <label className="block text-sm font-bold text-slate-700 mb-1">
              ② ご本人確認（体験お申し込み時の情報）
            </label>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              ※システムでお客様の体験お申し込みデータと安全に照合し、同時にLINEとのシステム連携（紐付け）を完了させるために必須となります。
            </p>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="email" className="text-[11px] font-bold text-slate-500 ml-1">登録メールアドレス</label>
                <input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 h-11 px-4 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="phone" className="text-[11px] font-bold text-slate-500 ml-1">登録電話番号（ハイフンなし）</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="09012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 h-11 px-4 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: 動的な料金・ルール表示（プラン選択時のみ出現） */}
          {activePlan && (
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4 animate-fadeIn">
              <div>
                <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">ご請求明細</span>

                {activePlan.id ? (
                  <div className="mt-3 space-y-3">
                    {/* 本日お支払い額 */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-sm">
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                        <span>① 本日の即時決済額</span>
                      </div>
                      <div className="mt-1 flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-700">
                          {activePlan.isPackage ? '本日お支払い額 (税込)' : 'クレジットカード登録 (本日決済なし)'}
                        </span>
                        <span className="text-2xl font-black text-blue-600">
                          ¥{(activePlan.isPackage ? activePlan.price : 0).toLocaleString()}
                        </span>
                      </div>
                      {!activePlan.isPackage && (
                        <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                          ※本日は決済用クレジットカード情報の登録（安全なStripeシステム経由）のみを行います。本日時点で決済は発生いたしません。
                        </p>
                      )}
                    </div>

                    {/* 翌月1日以降のお支払い (継続月会費 ＆ 先行受講分合算) */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-sm">
                      <span className="text-xs text-slate-500 font-bold block mb-1">
                        ② お支払い形式（基本料金）
                      </span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-700">{activePlan.isPackage ? '一括請求額 (税込)' : '基本月額料金 (税込)'}</span>
                        <span className="text-xl font-bold text-slate-800">
                          {activePlan.isPackage ? (
                            <>
                              ¥{activePlan.price.toLocaleString()}
                              <span className="text-xs font-bold text-slate-500 ml-1">（追加自動継続課金なし）</span>
                            </>
                          ) : (
                            <>
                              ¥{activePlan.price.toLocaleString()}
                              <span className="text-xs font-bold text-slate-500 ml-1">/ 月</span>
                            </>
                          )}
                        </span>
                      </div>
                      {!activePlan.isPackage && selectedParentPlan !== 'single' && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-500 leading-relaxed">
                          <p className="font-bold text-amber-600">📅 体験レッスン後〜翌月1日までに先行受講された場合：</p>
                          <p>
                            実際の受講実績に基づき、<strong>受講日（日付）が明記された状態で、翌月1日の初回月謝引き落とし時に自動合算（追加請求）</strong>されます。
                          </p>
                          <p className="mt-1 text-slate-400">
                            ※月会費の自動引き落としは翌月1日から開始されます（毎月25日引落）。
                          </p>
                        </div>
                      )}
                    </div>

                    {/* プランの説明文 */}
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{activePlan.description}</p>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-red-500 mt-2">
                    ※選択された時間コースは現在調整中です。別のコースを選択するか、管理者までご連絡ください。
                  </p>
                )}
              </div>

              {activePlan.id && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500 block mb-2">
                    【重要】このプランの受講ルール
                  </span>
                  <div className="space-y-1.5">
                    {activePlan.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start text-[11px] text-slate-600 font-medium">
                        <span className="text-cyan-500 mr-1.5 font-bold">✓</span>
                        <span className="leading-normal">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: 同意事項チェック */}
          <div className="space-y-3.5 border-t border-slate-100 pt-5">
            <label className="block text-sm font-bold text-slate-700">
              ③ 同意事項の確認
            </label>

            <div className="space-y-2.5">
              {/* 同意 1: 決済について */}
              {activePlan && (
                <label className="flex items-start p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 border border-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={agreedTerms.billing}
                    onChange={(e) => setAgreedTerms({ ...agreedTerms, billing: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-xs text-slate-600 leading-relaxed font-semibold">
                    {activePlan.isPackage
                      ? "利用規約およびプライバシーポリシーに同意し、パッケージプランの一括決済（クレジットカード決済）を行うことに同意します。"
                      : "利用規約およびプライバシーポリシーに同意し、クレジットカード決済による毎月の月謝の自動引き落とし（継続課金）を承諾します。"}
                  </span>
                </label>
              )}

              {/* 同意 2: キャンセル規定 */}
              <label className="flex items-start p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 border border-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms.cancel}
                  onChange={(e) => setAgreedTerms({ ...agreedTerms, cancel: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-xs text-slate-600 leading-relaxed font-semibold">
                  前日18:00以降のレッスンキャンセルについては、理由を問わず「受講1回分の消化（またはキャンセル料100%）」の取り扱いとなることを承諾します。
                </span>
              </label>

              {/* 同意 3: 初回レッスン（月謝プランのみ） */}
              {isInitialLessonsAgreementRequired && (
                <label className="flex items-start p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 border border-slate-100 transition-colors animate-fadeIn">
                  <input
                    type="checkbox"
                    checked={agreedTerms.initialLessons}
                    onChange={(e) => setAgreedTerms({ ...agreedTerms, initialLessons: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-blue-500 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-xs text-slate-600 leading-relaxed font-semibold">
                    体験レッスン後、初回月謝プランによる正式な第1回目・第2回目のレッスン枠については、コーチの手配を迅速に行うために事務局による自動割り当て（または指定手配）となることを承諾します。
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`w-full h-13 rounded-2xl text-sm font-black shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              isSubmitDisabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>処理中...</span>
              </>
            ) : (
              <span>決済・クレジットカード登録に進む</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
