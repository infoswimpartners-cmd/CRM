"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import Link from "next/link";
import { 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Waves, 
  HelpCircle, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Check,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { sanitizeErrorMessage } from "@/lib/error-formatter";

// クイック選択チップのプリセット（お悩み・目標）
const QUICK_SKILL_CHIPS = [
  "水慣れ・顔つけ",
  "バタ足・もぐる練習",
  "クロールの息継ぎ",
  "25mを完泳したい",
  "フォーム改善・楽に泳ぐ",
  "平泳ぎのキック",
  "背泳ぎ",
  "バタフライ挑戦",
  "学校の水泳授業対策",
  "大人・健康維持・マスターズ",
];

// 大まかな時間帯プリセット
const TIME_SLOT_PRESETS = [
  { label: "平日夕方 (15:00〜18:00)", value: "平日夕方（15:00〜18:00）" },
  { label: "土日午前 (9:00〜12:00)", value: "土日午前（9:00〜12:00）" },
  { label: "土日午後 (13:00〜18:00)", value: "土日午後（13:00〜18:00）" },
  { label: "終日いつでも調整可", value: "終日いつでも調整可" },
];

// 全体で調整可能な大まかな時間枠一覧
const GENERAL_TIME_SLOT_OPTIONS = [
  "平日夕方（15:00〜18:00）",
  "土日午前（9:00〜12:00）",
  "土日午後（13:00〜18:00）",
  "終日いつでも調整可",
  "平日午前（9:00〜12:00）",
  "平日夜間（18:00〜21:00）",
];

// 年代・学年のクイック入力プリセット（スマホでのドラムロールスクロール離脱を防止）
const AGE_GROUP_PRESETS = [
  { label: "幼児 (4〜6歳)", defaultDob: "2021-04-01" },
  { label: "小学生", defaultDob: "2016-04-01" },
  { label: "中高生", defaultDob: "2010-04-01" },
  { label: "20代", defaultDob: "2001-01-01" },
  { label: "30代", defaultDob: "1991-01-01" },
  { label: "40代", defaultDob: "1981-01-01" },
  { label: "50代", defaultDob: "1971-01-01" },
  { label: "60代〜", defaultDob: "1961-01-01" },
];

export default function BookingForm() {
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isLiffEnvironment, setIsLiffEnvironment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [termsText, setTermsText] = useState<string | null>(null);

  // 2人目入力欄の展開トグル（初期値: 折りたたみ）
  const [showSecondStudent, setShowSecondStudent] = useState(false);

  // 送信成功フラグ（サンクス画面の表示制御）
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  // フォーム入力値の状態管理
  const [formData, setFormData] = useState({
    name: "",
    kana: "",
    dob: "",
    gender: "",
    name2: "",
    kana2: "",
    dob2: "",
    gender2: "",
    email: "",
    phone: "",
    station: "",
    date1: "",
    time1Start: "",
    time1End: "",
    time1Slot: "",
    date2: "",
    time2Start: "",
    time2End: "",
    time2Slot: "",
    date3: "",
    time3Start: "",
    time3End: "",
    time3Slot: "",
    availableTimes: "",
    skillLevel: "",
    frequency: "",
    notes: "",
    referrerName: "",
    agreed: false
  });

  // 大まかな時間帯プリセットのチェックボックス選択状態
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  // 詳細な時間指定モードの表示切り替えフラグ
  const [customTimeMode1, setCustomTimeMode1] = useState(false);
  const [customTimeMode2, setCustomTimeMode2] = useState(false);
  const [customTimeMode3, setCustomTimeMode3] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // LIFF初期化 & Webハイブリッド対応
  useEffect(() => {
    let isMounted = true;

    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_TRIAL_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID;
        
        // LIFF IDが未設定の場合はWebモードとして安全にフォールバック
        if (!liffId) {
          if (isMounted) {
            setIsLiffReady(true);
            setIsLiffEnvironment(false);
          }
          return;
        }

        await liff.init({ liffId });

        if (!isMounted) return;

        if (liff.isLoggedIn()) {
          setIsLiffEnvironment(true);
          try {
            const profile = await liff.getProfile();
            setUserId(profile.userId);

            // LIFFアクセスログの記録と閲覧タグの自動付与（非同期・ノンブロッキング）
            const urlParams = new URLSearchParams(window.location.search);
            const refFromUrl = urlParams.get("ref") || urlParams.get("referrer") || "";
            if (refFromUrl) {
              setFormData(prev => prev.referrerName ? prev : { ...prev, referrerName: refFromUrl });
            }

            fetch("/api/liff-tracking", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: profile.userId,
                displayName: profile.displayName || undefined,
                formType: "trial",
                pageUrl: window.location.href,
                utmSource: urlParams.get("utm_source") || undefined,
                utmMedium: urlParams.get("utm_medium") || undefined,
                utmCampaign: urlParams.get("utm_campaign") || undefined,
                referrerName: refFromUrl || undefined,
              }),
            }).catch(() => {});
          } catch (profileErr) {
            console.warn("LIFF profile fetch error:", profileErr);
          }
        } else {
          // LIFF環境下かつ未ログインの場合、LINE内ブラウザであればログイン遷移可能だが、
          // 通常のWebブラウザからのアクセスを遮断しないため、Webモードとして続行
          // URLパラメータからのuserId取得フォールバック
          const urlParams = new URLSearchParams(window.location.search);
          const fallbackUid = urlParams.get("userId") || urlParams.get("line_user_id") || urlParams.get("uid");
          if (fallbackUid) {
            setUserId(fallbackUid);
          }

          if (liff.isInClient()) {
            const redirectUri = window.location.origin + window.location.pathname;
            liff.login({ redirectUri });
            return;
          }
          setIsLiffEnvironment(false);
        }
      } catch (error: any) {
        console.warn("LIFF初期化スキップ（Web直接予約モードで動作します）:", error);
        // LIFFの初期化失敗時もURLパラメータからuserIdを取得
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const fallbackUid = urlParams.get("userId") || urlParams.get("line_user_id") || urlParams.get("uid");
          if (fallbackUid) {
            setUserId(fallbackUid);
          }
        } catch (_) {}
        // LIFFの初期化失敗時もWebブラウザとしてフォーム送信可能にする
        setIsLiffEnvironment(false);
      } finally {
        if (isMounted) {
          setIsLiffReady(true);
        }
      }
    };

    const fetchTerms = async () => {
      try {
        const res = await fetch("/api/public/terms");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setTermsText(data.terms);
        } else {
          if (isMounted) setTermsText("利用規約の読み込みに失敗しました。");
        }
      } catch (error) {
        if (isMounted) setTermsText("利用規約の読み込みに失敗しました。");
      }
    };

    initLiff();
    fetchTerms();

    return () => {
      isMounted = false;
    };
  }, []);

  // 入力変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // クイック選択チップのクリックハンドラ（お悩み・目標をワンタップで追記）
  const handleQuickChipClick = (chipText: string) => {
    setFormData(prev => {
      const current = prev.skillLevel.trim();
      if (!current) {
        return { ...prev, skillLevel: chipText };
      }
      if (current.includes(chipText)) {
        // 既に含まれている場合は削除
        const updated = current
          .split("、")
          .map(s => s.trim())
          .filter(s => s !== chipText)
          .join("、");
        return { ...prev, skillLevel: updated };
      } else {
        // 追記
        return { ...prev, skillLevel: `${current}、${chipText}` };
      }
    });
  };

  // 各希望日時の大まかな時間帯プリセット選択
  const handleSlotSelect = (target: 1 | 2 | 3, slotValue: string) => {
    if (target === 1) {
      setFormData(prev => ({
        ...prev,
        time1Slot: prev.time1Slot === slotValue ? "" : slotValue,
        time1Start: "",
        time1End: ""
      }));
      setCustomTimeMode1(false);
    } else if (target === 2) {
      setFormData(prev => ({
        ...prev,
        time2Slot: prev.time2Slot === slotValue ? "" : slotValue,
        time2Start: "",
        time2End: ""
      }));
      setCustomTimeMode2(false);
    } else if (target === 3) {
      setFormData(prev => ({
        ...prev,
        time3Slot: prev.time3Slot === slotValue ? "" : slotValue,
        time3Start: "",
        time3End: ""
      }));
      setCustomTimeMode3(false);
    }
  };

  // 調整可能な大まかな時間枠チェックボックスのトグル
  const handleTimeSlotCheckboxToggle = (slot: string) => {
    setSelectedTimeSlots(prev => 
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  // フォーム送信処理（LIFF/Webハイブリッド）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    // スクロールとフォーカス付きのエラー通知
    const scrollToField = (id: string, message: string) => {
      setSubmitError(message);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      } else {
        window.scrollTo({ top: 120, behavior: "smooth" });
      }
    };

    // バリデーション
    if (!formData.name.trim()) {
      scrollToField("name", "お名前を入力してください。");
      return;
    }
    if (!formData.dob) {
      scrollToField("dob", "生年月日（または年代）を選択してください。");
      return;
    }
    if (showSecondStudent && formData.name2.trim() && !formData.dob2) {
      scrollToField("dob2", "2人目の生年月日（または年代）を選択してください。");
      return;
    }
    if (!formData.email.trim()) {
      scrollToField("email", "メールアドレスを入力してください。");
      return;
    }
    if (!formData.phone.trim()) {
      scrollToField("phone", "電話番号を入力してください。");
      return;
    }
    if (!formData.station.trim()) {
      scrollToField("station", "最寄駅または希望エリアを入力してください。");
      return;
    }
    if (!formData.date1) {
      scrollToField("date1", "第1希望日を選択してください。");
      return;
    }
    if (!formData.skillLevel.trim()) {
      scrollToField("skillLevel", "現在の泳力・お悩みまたは目標を選択・入力してください。");
      return;
    }
    if (!formData.agreed) {
      scrollToField("agreed", "利用規約への同意が必要です。内容をご確認の上、チェックをお願いします。");
      return;
    }

    setIsSubmitting(true);

    // 日時文字列のフォーマット
    const formatDateTime = (date: string, start: string, end: string, slot?: string) => {
      if (!date && !slot) return "";
      if (date && slot && slot !== "custom") {
        return `${date} ${slot}`;
      }
      if (date && start && end) return `${date} ${start}〜${end}`;
      if (date && start) return `${date} ${start}〜`;
      if (date) return date;
      return slot || "";
    };

    // 調整可能な時間帯（チェックボックス選択と自由記述の合成）
    const combinedAvailableTimes = [
      selectedTimeSlots.length > 0 ? `【希望時間帯】${selectedTimeSlots.join("、")}` : "",
      formData.availableTimes.trim()
    ].filter(Boolean).join("\n");

    const payload = {
      userId: userId || null, // Webブラウザ時はnull許容
      name: formData.name.trim(),
      kana: formData.kana.trim(),
      dob: formData.dob,
      gender: formData.gender,
      name2: showSecondStudent ? formData.name2.trim() : "",
      kana2: showSecondStudent ? formData.kana2.trim() : "",
      dob2: showSecondStudent ? formData.dob2 : "",
      gender2: showSecondStudent ? formData.gender2 : "",
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      station: formData.station.trim(),
      availableTimes: combinedAvailableTimes,
      skillLevel: formData.skillLevel.trim(),
      frequency: formData.frequency,
      notes: formData.notes.trim(),
      referrerName: formData.referrerName.trim(),
      datetime1: formatDateTime(formData.date1, formData.time1Start, formData.time1End, formData.time1Slot),
      datetime2: formatDateTime(formData.date2, formData.time2Start, formData.time2End, formData.time2Slot),
      datetime3: formatDateTime(formData.date3, formData.time3Start, formData.time3End, formData.time3Slot),
      date1: formData.date1,
      time1Start: formData.time1Start || (formData.time1Slot ? formData.time1Slot : ""),
      time1End: formData.time1End,
      date2: formData.date2,
      time2Start: formData.time2Start || (formData.time2Slot ? formData.time2Slot : ""),
      time2End: formData.time2End,
      date3: formData.date3,
      time3Start: formData.time3Start || (formData.time3Slot ? formData.time3Slot : ""),
      time3End: formData.time3End,
      source: isLiffEnvironment ? "LINE/LIFF体験予約フォーム" : "Web体験予約フォーム"
    };

    try {
      const response = await fetch("/api/trial-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmittedName(formData.name.trim());
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });

        // LIFFクライアント内の場合は一定時間後に閉じる案内または自動クローズ
        if (typeof liff !== "undefined" && liff.isInClient && liff.isInClient()) {
          setTimeout(() => {
            try {
              liff.closeWindow();
            } catch (closeErr) {
              console.log("liff.closeWindow skipped");
            }
          }, 3000);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSubmitError(errorData.error || "予約の送信に失敗しました。時間をおいて再度お試しください。");
      }
    } catch (error: any) {
      console.error("送信エラー:", error);
      setSubmitError("通信エラーが発生しました。インターネット接続をご確認の上、もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング表示
  if (!isLiffReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-600">予約フォームを読み込み中...</p>
        </div>
      </div>
    );
  }

  // 送信完了サンクス画面
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50/70 py-10 px-4 sm:px-6 font-sans">
        <div className="max-w-lg mx-auto space-y-6">
          <Card className="border-emerald-200 bg-white shadow-sm rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs">
                <Check className="h-8 w-8 text-white stroke-[3]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black">体験予約を受け付けました</h1>
              <p className="text-emerald-100 text-xs sm:text-sm">
                お申し込みありがとうございます。内容を確認の上、担当者よりご連絡いたします。
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6 text-slate-700">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-sm space-y-2">
                <div className="text-xs text-slate-500 font-semibold">お申込者様</div>
                <div className="text-base font-bold text-slate-900">{submittedName} 様</div>
                <div className="text-xs text-slate-600 pt-1">
                  ご登録のメールアドレス（{formData.email}）宛てに受付確認のご案内をお送りいたします。
                </div>
              </div>

              {/* 今後の流れ */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-sky-500" />
                  <span>今後の流れ</span>
                </h2>
                <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                  <div className="flex gap-3 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-800">24時間以内に担当よりご連絡</strong>
                      <p className="text-slate-500 mt-0.5">
                        ご希望日時と近隣公営プールの空き状況を確認し、候補日時・場所をご案内します。
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-[11px]">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-800">日程・プール施設の確定</strong>
                      <p className="text-slate-500 mt-0.5">
                        当日の持ち物（水着・キャップ・ゴーグル）や集合場所を詳しくお知らせします。
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-[11px]">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-800">体験レッスン当日（60分）</strong>
                      <p className="text-slate-500 mt-0.5">
                        現地プールで専任コーチと合流。レッスン後に水中動画カルテをお渡しします。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* お友達紹介特典の適用確認 */}
              {formData.referrerName && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                  🎁 <strong>お友達紹介特典が適用されました</strong>（{formData.referrerName} 様のご紹介）<br />
                  初回体験レッスンが特別価格 3,500円（税込）となります。
                </div>
              )}

              <div className="pt-2 flex flex-col gap-3">
                <Button asChild className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl h-12 shadow-xs">
                  <Link href="/">トップページへ戻る</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 予約入力フォーム
  return (
    <div className="min-h-screen bg-slate-50/60 py-6 sm:py-12 px-3 sm:px-6 font-sans text-slate-900">
      <div className="max-w-xl mx-auto space-y-6">
        {/* ヘッダー・戻るリンク */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>トップページへ戻る</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>SSL暗号化通信</span>
          </div>
        </div>

        {/* ページタイトル */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100/80 px-3 py-1 text-xs font-bold text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>完全専任マンツーマン指導</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            体験レッスンお申し込み
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            かんたん60秒で完了。近所の公営プールでプロコーチによるマンツーマンレッスンをお試しいただけます。
          </p>
        </div>

        {/* お友達紹介キャンペーン案内バナー */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm mb-1.5">
            <span className="text-base">🎁</span>
            <span>お友達紹介キャンペーン実施中！</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            ご紹介でお申し込みの方は、初回体験が<strong>特別価格 3,500円（通常 6,000円）</strong>となります。<br />
            ご紹介者様のお名前を下記フォームにご記入ください。
          </p>
        </div>

        {/* エラーアラート */}
        {submitError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
            {sanitizeErrorMessage(submitError, 'エラーが発生しました。再度お試しください。')}
          </div>
        )}

        {/* フォームカード */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* セクション: ご紹介者様（任意） */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-sky-500" />
                    <span>ご紹介者様（任意）</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">任意</Badge>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referrerName" className="text-xs font-semibold text-slate-700">
                    ご紹介者様のお名前
                  </Label>
                  <Input
                    id="referrerName"
                    type="text"
                    name="referrerName"
                    value={formData.referrerName}
                    onChange={handleChange}
                    placeholder="例：山田 太郎 様（ご紹介者がいる場合のみ）"
                    className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                  />
                  <p className="text-[11px] text-amber-700">
                    ※ご紹介者様を入力いただくと初回体験が特別価格3,500円になります。
                  </p>
                </div>
              </div>

              {/* セクション: 基本情報（1人目） */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-sky-500" />
                    <span>受講者様の基本情報</span>
                  </span>
                  <Badge className="bg-rose-500 text-white text-[10px] hover:bg-rose-500">必須</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                      お名前 <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="例：山田 太郎"
                      className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="kana" className="text-xs font-semibold text-slate-700">
                      フリガナ <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="kana"
                      type="text"
                      name="kana"
                      value={formData.kana}
                      onChange={handleChange}
                      required
                      placeholder="例：ヤマダ タロウ"
                      className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dob" className="text-xs font-semibold text-slate-700">
                        生年月日 <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[11px] text-sky-600 font-medium">年代ボタンでワンタップ入力も可能</span>
                    </div>

                    {/* 年代・学年のクイック入力チップ */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
                      {AGE_GROUP_PRESETS.map((preset) => {
                        const isSelected = formData.dob === preset.defaultDob;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, dob: preset.defaultDob }));
                            }}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-sky-500 border-sky-500 text-white font-bold shadow-xs scale-102"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                            }`}
                          >
                            {isSelected ? `✓ ${preset.label}` : preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      <div className="space-y-1">
                        <Input
                          id="dob"
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={handleChange}
                          required
                          className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500 bg-white"
                        />
                        <p className="text-[11px] text-slate-500">
                          ※上の年代ボタンを押すか、カレンダーから日付をお選びください
                        </p>
                      </div>

                      <div className="space-y-1">
                        <select
                          id="gender"
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          required
                          className="w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        >
                          <option value="">性別を選択してください *</option>
                          <option value="男性">男性</option>
                          <option value="女性">女性</option>
                          <option value="回答しない">回答しない</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* セクション: 2人目の情報（トグルで折りたたみ） */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <div 
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setShowSecondStudent(!showSecondStudent)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="toggleSecondStudent"
                      checked={showSecondStudent}
                      onCheckedChange={(checked) => setShowSecondStudent(!!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label 
                      htmlFor="toggleSecondStudent" 
                      className="text-xs sm:text-sm font-bold text-slate-800 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      2人同時の体験レッスンを希望する（兄弟・親子・ペア）
                    </label>
                  </div>
                  <button 
                    type="button" 
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="Toggle second student"
                  >
                    {showSecondStudent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {showSecondStudent && (
                  <div className="pt-3 border-t border-slate-200/80 space-y-3.5">
                    <p className="text-[11px] text-slate-500">
                      ※2名同時の受講も可能です。2人目の情報をご入力ください。
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="name2" className="text-xs font-semibold text-slate-700">お名前（2人目）</Label>
                        <Input
                          id="name2"
                          type="text"
                          name="name2"
                          value={formData.name2}
                          onChange={handleChange}
                          placeholder="例：山田 花子"
                          className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500 bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="kana2" className="text-xs font-semibold text-slate-700">フリガナ（2人目）</Label>
                        <Input
                          id="kana2"
                          type="text"
                          name="kana2"
                          value={formData.kana2}
                          onChange={handleChange}
                          placeholder="例：ヤマダ ハナコ"
                          className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="dob2" className="text-xs font-semibold text-slate-700">
                            生年月日（2人目）
                          </Label>
                          <span className="text-[11px] text-sky-600 font-medium">年代ボタンでワンタップ入力も可能</span>
                        </div>

                        {/* 年代・学年のクイック入力チップ */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
                          {AGE_GROUP_PRESETS.map((preset) => {
                            const isSelected = formData.dob2 === preset.defaultDob;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, dob2: preset.defaultDob }));
                                }}
                                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                                  isSelected
                                    ? "bg-sky-500 border-sky-500 text-white font-bold shadow-xs scale-102"
                                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                                }`}
                              >
                                {isSelected ? `✓ ${preset.label}` : preset.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          <div className="space-y-1">
                            <Input
                              id="dob2"
                              type="date"
                              name="dob2"
                              value={formData.dob2}
                              onChange={handleChange}
                              className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500 bg-white"
                            />
                            <p className="text-[11px] text-slate-500">
                              ※上の年代ボタンを押すか、カレンダーから日付をお選びください
                            </p>
                          </div>

                          <div className="space-y-1">
                            <select
                              id="gender2"
                              name="gender2"
                              value={formData.gender2}
                              onChange={handleChange}
                              className="w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            >
                              <option value="">性別を選択してください</option>
                              <option value="男性">男性</option>
                              <option value="女性">女性</option>
                              <option value="回答しない">回答しない</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* セクション: 連絡先・希望エリア */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-sky-500" />
                    <span>ご連絡先 ＆ 希望エリア</span>
                  </span>
                  <Badge className="bg-rose-500 text-white text-[10px] hover:bg-rose-500">必須</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                      メールアドレス <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="example@mail.com"
                      className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                      電話番号 <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="090-1234-5678"
                      className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="station" className="text-xs font-semibold text-slate-700">
                    最寄駅もしくは希望のエリア <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="station"
                    type="text"
                    name="station"
                    value={formData.station}
                    onChange={handleChange}
                    required
                    placeholder="例：恵比寿駅、目黒駅、品川区周辺、横浜駅など"
                    className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                  />
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5 text-[11px] text-emerald-800 leading-relaxed">
                    💡 具体的なプール施設が決まっていなくても大丈夫です。ご自宅の最寄り駅を教えていただければ、利用可能な近隣公営温水プールを事務局よりご提案します。
                  </div>
                </div>
              </div>

              {/* セクション: 希望日時 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-sky-500" />
                    <span>レッスン希望日時</span>
                  </span>
                  <span className="text-[11px] text-slate-500">第1希望のみ必須</span>
                </div>

                {/* ざっくり調整可能な時間帯（チェックボックス複数選択） */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                    <span>調整しやすい大まかな時間帯（複数選択可・任意）</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {GENERAL_TIME_SLOT_OPTIONS.map((slot) => {
                      const isChecked = selectedTimeSlots.includes(slot);
                      return (
                        <label
                          key={slot}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors select-none ${
                            isChecked
                              ? "bg-sky-50 border-sky-300 text-sky-800 font-semibold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTimeSlotCheckboxToggle(slot)}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                          />
                          <span>{slot}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 第1希望日時（必須） */}
                <div className="rounded-xl border-2 border-sky-200 bg-white p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="date1" className="text-xs font-bold text-slate-800">
                      第1希望日時 <span className="text-rose-500">*必須</span>
                    </Label>
                    <Badge className="bg-sky-500 text-white text-[10px]">第1希望</Badge>
                  </div>
                  <Input
                    id="date1"
                    type="date"
                    name="date1"
                    value={formData.date1}
                    onChange={handleChange}
                    required
                    className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                  />
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1.5">時間帯を選択:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {TIME_SLOT_PRESETS.map((p) => {
                        const isSelected = formData.time1Slot === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => handleSlotSelect(1, p.value)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                              isSelected
                                ? "bg-sky-500 border-sky-500 text-white font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {isSelected ? `✓ ${p.label}` : p.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTimeMode1(!customTimeMode1);
                          if (!customTimeMode1) {
                            setFormData(prev => ({ ...prev, time1Slot: "" }));
                          }
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border border-dashed font-medium transition-colors ${
                          customTimeMode1
                            ? "bg-sky-50 border-sky-400 text-sky-700 font-bold"
                            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        ⏱ 時間を細かく指定
                      </button>
                    </div>
                    {customTimeMode1 && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <Input
                          type="time"
                          name="time1Start"
                          value={formData.time1Start}
                          onChange={handleChange}
                          step="600"
                          className="h-10 text-xs rounded-lg"
                        />
                        <span className="text-slate-400 text-xs">〜</span>
                        <Input
                          type="time"
                          name="time1End"
                          value={formData.time1End}
                          onChange={handleChange}
                          step="600"
                          className="h-10 text-xs rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 第2希望日時（任意） */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="date2" className="text-xs font-semibold text-slate-700">
                      第2希望日時 <span className="text-slate-400 font-normal">（任意）</span>
                    </Label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">早く確定しやすい</span>
                  </div>
                  <Input
                    id="date2"
                    type="date"
                    name="date2"
                    value={formData.date2}
                    onChange={handleChange}
                    className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                  />
                  <div className="pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {TIME_SLOT_PRESETS.map((p) => {
                        const isSelected = formData.time2Slot === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => handleSlotSelect(2, p.value)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                              isSelected
                                ? "bg-sky-500 border-sky-500 text-white font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {isSelected ? `✓ ${p.label}` : p.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTimeMode2(!customTimeMode2);
                          if (!customTimeMode2) {
                            setFormData(prev => ({ ...prev, time2Slot: "" }));
                          }
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border border-dashed font-medium transition-colors ${
                          customTimeMode2
                            ? "bg-sky-50 border-sky-400 text-sky-700 font-bold"
                            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        ⏱ 時間を細かく指定
                      </button>
                    </div>
                    {customTimeMode2 && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <Input
                          type="time"
                          name="time2Start"
                          value={formData.time2Start}
                          onChange={handleChange}
                          step="600"
                          className="h-10 text-xs rounded-lg"
                        />
                        <span className="text-slate-400 text-xs">〜</span>
                        <Input
                          type="time"
                          name="time2End"
                          value={formData.time2End}
                          onChange={handleChange}
                          step="600"
                          className="h-10 text-xs rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 第3希望日時（任意） */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="date3" className="text-xs font-semibold text-slate-700">
                      第3希望日時 <span className="text-slate-400 font-normal">（任意）</span>
                    </Label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">早く確定しやすい</span>
                  </div>
                  <Input
                    id="date3"
                    type="date"
                    name="date3"
                    value={formData.date3}
                    onChange={handleChange}
                    className="h-11 text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                  />
                  <div className="pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {TIME_SLOT_PRESETS.map((p) => {
                        const isSelected = formData.time3Slot === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => handleSlotSelect(3, p.value)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                              isSelected
                                ? "bg-sky-500 border-sky-500 text-white font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {isSelected ? `✓ ${p.label}` : p.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTimeMode3(!customTimeMode3);
                          if (!customTimeMode3) {
                            setFormData(prev => ({ ...prev, time3Slot: "" }));
                          }
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border border-dashed font-medium transition-colors ${
                          customTimeMode3
                            ? "bg-sky-50 border-sky-400 text-sky-700 font-bold"
                            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        ⏱ 時間を細かく指定
                      </button>
                    </div>
                    {customTimeMode3 && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <Input
                          type="time"
                          name="time3Start"
                          value={formData.time3Start}
                          onChange={handleChange}
                          step="600"
                          className="h-10 text-xs rounded-lg"
                        />
                        <span className="text-slate-400 text-xs">〜</span>
                        <Input
                          type="time"
                          name="time3End"
                          value={formData.time3End}
                          onChange={handleChange}
                          step="600"
                          className="h-10 text-xs rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* セクション: 泳力・お悩み・目標 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Waves className="h-4 w-4 text-sky-500" />
                    <span>現在の泳力・お悩み・目標</span>
                  </span>
                  <Badge className="bg-rose-500 text-white text-[10px] hover:bg-rose-500">必須</Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>よくある目標・お悩み（タップで簡単入力）:</span>
                  </div>
                  {/* クイック選択チップ */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SKILL_CHIPS.map((chip) => {
                      const isSelected = formData.skillLevel.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleQuickChipClick(chip)}
                          className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                            isSelected
                              ? "bg-sky-500 border-sky-500 text-white font-bold shadow-xs scale-102"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected ? `✓ ${chip}` : `＋ ${chip}`}
                        </button>
                      );
                    })}
                  </div>

                  <Textarea
                    name="skillLevel"
                    value={formData.skillLevel}
                    onChange={handleChange}
                    required
                    placeholder="例：水に顔をつけるのが苦手、クロールで息継ぎをすると沈んでしまう、25m完泳したい等（上のボタンから選択も可能です）"
                    className="min-h-[90px] text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500 mt-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="frequency" className="text-xs font-semibold text-slate-700">
                    レッスン希望頻度 <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    required
                    className="w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    <option value="毎週">毎週定期的に受講したい</option>
                    <option value="隔週">隔週（月2回程度）で受講したい</option>
                    <option value="月1回">月1回ペースで受講したい</option>
                    <option value="不定期">不定期・単発で受講したい</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="availableTimes" className="text-xs font-semibold text-slate-700">
                    継続受講をご検討の場合、受講可能な曜日や時間帯（任意）
                  </Label>
                  <Textarea
                    id="availableTimes"
                    name="availableTimes"
                    value={formData.availableTimes}
                    onChange={handleChange}
                    placeholder="例：土曜日の午前中、水曜日の16時以降など"
                    className="min-h-[60px] text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
                    ご質問・ご要望など（任意）
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="気になる点やコーチへのご要望など、何でもご自由にご記入ください"
                    className="min-h-[70px] text-sm rounded-xl border-slate-200 focus-visible:ring-sky-500"
                  />
                </div>
              </div>

              {/* セクション: 利用規約 */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800">利用規約への同意</div>
                <div className="h-36 overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {termsText === null ? "利用規約を読み込み中..." : termsText}
                </div>

                <div 
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    formData.agreed 
                      ? "bg-sky-50/80 border-sky-300 ring-1 ring-sky-200" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, agreed: !prev.agreed }))}
                >
                  <Checkbox
                    id="agreed"
                    name="agreed"
                    checked={formData.agreed}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreed: !!checked }))}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <Label 
                    htmlFor="agreed" 
                    className="text-xs sm:text-sm font-bold text-slate-800 cursor-pointer flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    上記の利用規約に同意する <span className="text-rose-500">*</span>
                  </Label>
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full h-14 rounded-2xl text-base font-bold shadow-md transition-all ${
                    isSubmitting
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : isLiffEnvironment
                      ? "bg-[#06C755] hover:bg-[#05b34c] text-white shadow-emerald-100"
                      : "bg-sky-500 hover:bg-sky-600 text-white shadow-sky-100"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      <span>送信中...</span>
                    </span>
                  ) : isLiffEnvironment ? (
                    "LINEで体験レッスンを申し込む"
                  ) : (
                    "体験レッスンを申し込む（60分）"
                  )}
                </Button>
                <p className="text-[11px] text-slate-400 text-center mt-2.5">
                  ※送信後24時間以内に担当者より日程確定のご連絡を差し上げます。
                </p>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
