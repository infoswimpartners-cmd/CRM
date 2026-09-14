'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { createSwimStepCheckoutSession } from '@/actions/swim_step';
import { SWIM_STEP_PLANS } from '@/types/swim_step';
import type { SwimStepSlotSelection } from '@/types/swim_step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Waves, 
  Calendar, 
  CheckCircle2, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  MapPin, 
  Sparkles, 
  User, 
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

// 開催日程・クラス定義
const SCHEDULE_OPTIONS = [
  {
    sessionNumber: 1,
    date: '2026-10-02',
    dateLabel: '第1回：10月2日（金）',
    slots: [
      {
        classType: 'water_familiarity' as const,
        timeRange: '17:00〜17:50',
        className: '水慣れ〜キック基礎',
        description: '水が苦手、顔つけや潜り・バタ足の基礎を楽しく習得',
      },
      {
        classType: 'crawl_breathing' as const,
        timeRange: '18:00〜18:50',
        className: 'クロール息継ぎ・25m挑戦',
        description: '息継ぎのコツを掴み、25m完泳を目指すステップアップ',
      },
    ],
  },
  {
    sessionNumber: 2,
    date: '2026-10-09',
    dateLabel: '第2回：10月9日（金）',
    slots: [
      {
        classType: 'water_familiarity' as const,
        timeRange: '17:00〜17:50',
        className: '水慣れ〜キック基礎',
        description: '水が苦手、顔つけや潜り・バタ足の基礎を楽しく習得',
      },
      {
        classType: 'crawl_breathing' as const,
        timeRange: '18:00〜18:50',
        className: 'クロール息継ぎ・25m挑戦',
        description: '息継ぎのコツを掴み、25m完泳を目指すステップアップ',
      },
    ],
  },
  {
    sessionNumber: 3,
    date: '2026-10-16',
    dateLabel: '第3回：10月16日（金）',
    slots: [
      {
        classType: 'water_familiarity' as const,
        timeRange: '17:00〜17:50',
        className: '水慣れ〜キック基礎',
        description: '水が苦手、顔つけや潜り・バタ足の基礎を楽しく習得',
      },
      {
        classType: 'crawl_breathing' as const,
        timeRange: '18:00〜18:50',
        className: 'クロール息継ぎ・25m挑戦',
        description: '息継ぎのコツを掴み、25m完泳を目指すステップアップ',
      },
    ],
  },
  {
    sessionNumber: 4,
    date: '2026-10-23',
    dateLabel: '第4回：10月23日（金）',
    slots: [
      {
        classType: 'water_familiarity' as const,
        timeRange: '17:00〜17:50',
        className: '水慣れ〜キック基礎',
        description: '水が苦手、顔つけや潜り・バタ足の基礎を楽しく習得',
      },
      {
        classType: 'crawl_breathing' as const,
        timeRange: '18:00〜18:50',
        className: 'クロール息継ぎ・25m挑戦',
        description: '息継ぎのコツを掴み、25m完泳を目指すステップアップ',
      },
    ],
  },
];

export default function SwimStepBookingPage() {
  // LIFF & LINE Profile
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null);

  // フォームステート
  const [parentName, setParentName] = useState('');
  const [parentKana, setParentKana] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [childName, setChildName] = useState('');
  const [childKana, setChildKana] = useState('');
  const [childAge, setChildAge] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [planType, setPlanType] = useState<'single' | 'double' | 'full'>('single');
  const [selectedSlots, setSelectedSlots] = useState<SwimStepSlotSelection[]>([]);
  const [swimmingExperience, setSwimmingExperience] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // LIFF初期化
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId =
          process.env.NEXT_PUBLIC_SWIM_STEP_LIFF_ID ||
          process.env.NEXT_PUBLIC_LIFF_ID ||
          process.env.NEXT_PUBLIC_TRIAL_LIFF_ID;

        if (liffId) {
          await liff.init({ liffId });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
            setLineDisplayName(profile.displayName);
            if (!parentName && profile.displayName) {
              // LINE表示名を初期値の参考としてセット（任意）
              setParentName(profile.displayName);
            }
          }
        }
      } catch (err) {
        console.warn('LIFF initialization notice:', err);
      } finally {
        setIsLiffReady(true);
      }
    };

    initLiff();
  }, []);

  const currentPlan = SWIM_STEP_PLANS[planType] || SWIM_STEP_PLANS.single;
  const targetSlotCount = currentPlan.slotsCount;
  const remainingCount = targetSlotCount - selectedSlots.length;

  // スロット選択トグル処理（アトミックな関数型更新で二重実行・競合を防止）
  const toggleSlot = (
    sessionNumber: number,
    date: string,
    dateLabel: string,
    classType: 'water_familiarity' | 'crawl_breathing',
    timeRange: string,
    className: string
  ) => {
    setSelectedSlots((prev) => {
      const isSelected = prev.some(
        (s) => s.sessionNumber === sessionNumber && s.classType === classType
      );

      if (isSelected) {
        // 選択解除
        return prev.filter(
          (s) => !(s.sessionNumber === sessionNumber && s.classType === classType)
        );
      } else {
        // 追加
        if (prev.length >= targetSlotCount) {
          try {
            toast.warning(
              `選択されたチケット（${currentPlan.name}）は最大${targetSlotCount}枠まで選択可能です。変更したい枠のチェックを外してから選択してください。`
            );
          } catch (e) {
            console.warn(e);
          }
          return prev;
        }

        return [
          ...prev,
          {
            sessionNumber,
            date,
            dateLabel,
            classType,
            className: `${className}（${timeRange}）`,
            timeRange,
          },
        ];
      }
    });
  };

  // プラン変更時に枠数が超過している場合は末尾から自動調整
  const handlePlanChange = (newPlan: 'single' | 'double' | 'full') => {
    setPlanType(newPlan);
    const maxCount = SWIM_STEP_PLANS[newPlan]?.slotsCount ?? 1;
    setSelectedSlots((prev) => {
      if (prev.length > maxCount) {
        return prev.slice(0, maxCount);
      }
      return prev;
    });
  };

  // フォーム送信＆Stripe決済画面へ遷移
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentName || !parentKana || !phone || !email) {
      toast.error('保護者様のお名前、フリガナ、電話番号、メールアドレスをすべて入力してください。');
      return;
    }

    if (!childName || !childKana || !childAge) {
      toast.error('お子様のお名前、フリガナ、年齢を入力してください。');
      return;
    }

    if (selectedSlots.length !== targetSlotCount) {
      toast.error(
        `希望日程・クラスを${targetSlotCount}枠選択してください。（現在${selectedSlots.length}枠選択されています）`
      );
      return;
    }

    if (!termsAgreed) {
      toast.error('キャンセルポリシーへの同意が必要です。');
      return;
    }

    setIsSubmitting(true);
    toast.loading('決済画面を準備しています...');

    try {
      const res = await createSwimStepCheckoutSession({
        parentName,
        parentKana,
        phone,
        email,
        childName,
        childKana,
        childAge,
        birthDate: birthDate || undefined,
        planType,
        selectedSlots,
        swimmingExperience,
        termsAgreed,
        lineUserId: lineUserId || undefined,
        lineDisplayName: lineDisplayName || undefined,
      });

      if (res.success && res.url) {
        toast.success('決済画面へ移動します...');
        window.location.href = res.url;
      } else {
        toast.dismiss();
        toast.error(res.error || '決済の開始に失敗しました。もう一度お試しください。');
        setIsSubmitting(false);
      }
    } catch (error: any) {
      toast.dismiss();
      console.error('Submit error:', error);
      toast.error('通信エラーが発生しました。時間をおいて再度お試しください。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-slate-50 py-6 px-4 sm:px-6 md:py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* LINE連携ステータスバー */}
        {lineDisplayName && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 flex items-center justify-between text-xs sm:text-sm text-emerald-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LINE連携中：<strong>{lineDisplayName}</strong> 様</span>
            </div>
            <Badge variant="outline" className="bg-white/80 text-emerald-700 text-[10px]">
              予約完了時にLINE通知
            </Badge>
          </div>
        )}

        {/* 教室ヘッダーバナー */}
        <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-teal-500 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-amber-400 text-slate-900 hover:bg-amber-300 font-bold text-xs px-2.5 py-0.5">
              10月限定・城東小学校プール開催
            </Badge>
            <span className="text-xs text-blue-100 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 少人数制レッスン
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-2">
            <Waves className="w-7 h-7 text-sky-200" />
            スイムステップ 申し込み
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            小学生向け水泳短期クラス。水慣れからクロールの息継ぎ・25m完泳まで、お子様一人ひとりに合わせた丁寧な少人数レッスンです。
          </p>
          <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap gap-4 text-xs text-blue-50">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-300" /> 城東小学校プール
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-200" /> 1回50分（金曜夕方）
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-300" /> クレジットカード事前決済
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: 保護者様・お子様情報 */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                <span>基本情報のご入力</span>
              </div>
              <CardTitle className="text-lg">保護者様・お子様情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* 保護者様情報 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="parentName" className="text-xs font-bold text-slate-700">
                    保護者様のお名前 <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="parentName"
                    placeholder="例：山田 太郎"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentKana" className="text-xs font-bold text-slate-700">
                    保護者様 フリガナ <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="parentKana"
                    placeholder="例：ヤマダ タロウ"
                    value={parentKana}
                    onChange={(e) => setParentKana(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                    当日連絡の取れる電話番号 <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="例：090-1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                    メールアドレス（控え送信用） <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="例：taro.yamada@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
              </div>

              {/* お子様情報 */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-3">受講されるお子様について</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="childName" className="text-xs font-bold text-slate-700">
                      お子様のお名前 <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="childName"
                      placeholder="例：山田 一郎"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="childKana" className="text-xs font-bold text-slate-700">
                      お子様 フリガナ <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="childKana"
                      placeholder="例：ヤマダ イチロウ"
                      value={childKana}
                      onChange={(e) => setChildKana(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="childAge" className="text-xs font-bold text-slate-700">
                      学年 / 年齢 <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="childAge"
                      placeholder="例：小学2年生（8歳）"
                      value={childAge}
                      onChange={(e) => setChildAge(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="birthDate" className="text-xs font-medium text-slate-600">
                      生年月日（任意）
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: 参加プラン（チケット選択） */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                <span>参加プランの選択</span>
              </div>
              <CardTitle className="text-lg">ご希望の参加プラン（チケット）</CardTitle>
              <CardDescription>受講したい回数に合わせてチケットをお選びください。</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <RadioGroup
                value={planType}
                onValueChange={(v) => handlePlanChange(v as 'single' | 'double' | 'full')}
                className="grid grid-cols-1 gap-3"
              >
                {/* 1回チケット */}
                <Label
                  htmlFor="plan-single"
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    planType === 'single'
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="single" id="plan-single" />
                    <div>
                      <div className="font-bold text-slate-800 text-base">1回チケット</div>
                      <div className="text-xs text-slate-500">まずはお試しで1回参加したい方に</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-blue-700">6,500円</div>
                    <div className="text-[10px] text-slate-400">税込 / 1枠選択</div>
                  </div>
                </Label>

                {/* 2回チケット */}
                <Label
                  htmlFor="plan-double"
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    planType === 'double'
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="double" id="plan-double" />
                    <div>
                      <div className="font-bold text-slate-800 text-base">2回チケット</div>
                      <div className="text-xs text-slate-500">基礎＋ステップアップの2回受講</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-blue-700">12,000円</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">1,000円お得 / 2枠選択</div>
                  </div>
                </Label>

                {/* 4回完走パック */}
                <Label
                  htmlFor="plan-full"
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                    planType === 'full'
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg">
                    1番人気・推奨
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="full" id="plan-full" />
                    <div>
                      <div className="font-bold text-slate-800 text-base">
                        4回チケット（10月完走パック）
                      </div>
                      <div className="text-xs text-slate-500">10月の全4回で確実に泳力をステップアップ！</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-amber-600">22,000円</div>
                    <div className="text-[10px] text-amber-700 font-bold">4,000円お得 / 4枠選択</div>
                  </div>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* STEP 3: 希望日程・クラス選択 */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
                  <span>希望日程・クラスの選択</span>
                </div>
                <div className="text-xs font-semibold">
                  選択状況：
                  <span className={remainingCount === 0 ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                    {selectedSlots.length} / {targetSlotCount} 枠
                  </span>
                </div>
              </div>
              <CardTitle className="text-lg">受講枠の選択</CardTitle>
              <CardDescription>
                選択中のプラン（<strong>{currentPlan.name}</strong>）に合わせて、
                <strong>{targetSlotCount}枠</strong> にチェックを入れてください。
                {remainingCount > 0 ? (
                  <span className="text-blue-600 font-medium ml-1">（あと {remainingCount} 枠選択してください）</span>
                ) : (
                  <span className="text-emerald-600 font-medium ml-1">（必要枠数が選択されました！）</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {SCHEDULE_OPTIONS.map((opt) => (
                <div key={opt.sessionNumber} className="border border-slate-200 rounded-xl p-3.5 sm:p-4 bg-slate-50/40">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm sm:text-base mb-2.5 pb-2 border-b border-slate-200">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{opt.dateLabel}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {opt.slots.map((slot) => {
                      const isChecked = selectedSlots.some(
                        (s) => s.sessionNumber === opt.sessionNumber && s.classType === slot.classType
                      );
                      return (
                        <div
                          key={slot.classType}
                          onClick={() =>
                            toggleSlot(
                              opt.sessionNumber,
                              opt.date,
                              opt.dateLabel,
                              slot.classType,
                              slot.timeRange,
                              slot.className
                            )
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleSlot(
                                opt.sessionNumber,
                                opt.date,
                                opt.dateLabel,
                                slot.classType,
                                slot.timeRange,
                                slot.className
                              );
                            }
                          }}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all select-none ${
                            isChecked
                              ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-600/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center mt-0.5 transition-colors ${
                                isChecked
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[11px] font-bold bg-white">
                                  {slot.timeRange}
                                </Badge>
                              </div>
                              <div className="font-bold text-xs sm:text-sm">{slot.className}</div>
                              <p className="text-[11px] text-slate-500 leading-tight">
                                {slot.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* STEP 4: お子様の泳力・お悩み相談 ＆ 同意事項 */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">4</span>
                <span>アンケート ＆ 同意事項</span>
              </div>
              <CardTitle className="text-lg">お子様の現在の泳力・同意</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="swimmingExperience" className="text-xs font-bold text-slate-700">
                  お子様の現在の泳力・お悩み（任意）
                </Label>
                <Textarea
                  id="swimmingExperience"
                  placeholder="例：顔つけが少し苦手で水に入るのを怖がります。/ バタ足はできるがクロールの息継ぎで沈んでしまいます 等"
                  value={swimmingExperience}
                  onChange={(e) => setSwimmingExperience(e.target.value)}
                  rows={3}
                  className="bg-white text-sm"
                />
                <p className="text-[11px] text-slate-500">
                  ※事前にお知らせいただくことで、当日の指導をスムーズに調整いたします。
                </p>
              </div>

              {/* 利用規約・キャンセルポリシー同意 */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="termsAgreed"
                    checked={termsAgreed}
                    onCheckedChange={(c) => setTermsAgreed(Boolean(c))}
                    className="mt-0.5"
                    required
                  />
                  <div className="space-y-1">
                    <Label htmlFor="termsAgreed" className="text-xs font-bold text-slate-800 cursor-pointer">
                      利用規約・キャンセルポリシーに同意する <span className="text-rose-500">*</span>
                    </Label>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      「前日正午以降のキャンセルは100%のキャンセル料が発生することに同意します」
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 送信＆決済ボタン */}
          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || selectedSlots.length !== targetSlotCount || !termsAgreed}
              className="w-full py-6 text-base font-bold bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-md transition-all rounded-xl"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  決済画面へ移動中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  クレジットカードで決済する（{currentPlan.price.toLocaleString()}円）
                </span>
              )}
            </Button>

            <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Stripeによる暗号化された安全な決済。カード情報は当サイトに保存されません。
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
