"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function BookingForm() {
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [termsText, setTermsText] = useState<string | null>(null);
  
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
    emailConfirm: "",
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
  // 詳細な時間指定モード（10分刻み入力）の表示切り替えフラグ
  const [customTimeMode1, setCustomTimeMode1] = useState(false);
  const [customTimeMode2, setCustomTimeMode2] = useState(false);
  const [customTimeMode3, setCustomTimeMode3] = useState(false);
  
  // 生年月日（年・月・日）の個別state
  const [dobParts, setDobParts] = useState({
    year: "",
    month: "",
    day: ""
  });
  const [dob2Parts, setDob2Parts] = useState({
    year: "",
    month: "",
    day: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 生年月日の更新ハンドラ
  const handleDobChange = (person: 1 | 2, field: "year" | "month" | "day", value: string) => {
    if (person === 1) {
      const nextParts = { ...dobParts, [field]: value };
      setDobParts(nextParts);
      if (nextParts.year && nextParts.month && nextParts.day) {
        const formatted = `${nextParts.year}-${nextParts.month.padStart(2, "0")}-${nextParts.day.padStart(2, "0")}`;
        setFormData(prev => ({ ...prev, dob: formatted }));
      } else {
        setFormData(prev => ({ ...prev, dob: "" }));
      }
    } else {
      const nextParts = { ...dob2Parts, [field]: value };
      setDob2Parts(nextParts);
      if (nextParts.year && nextParts.month && nextParts.day) {
        const formatted = `${nextParts.year}-${nextParts.month.padStart(2, "0")}-${nextParts.day.padStart(2, "0")}`;
        setFormData(prev => ({ ...prev, dob2: formatted }));
      } else {
        setFormData(prev => ({ ...prev, dob2: "" }));
      }
    }
  };

  // 年の選択肢（今年から1930年まで降順、和暦も併記）
  const currentYear = new Date().getFullYear();
  const getJapaneseEra = (year: number) => {
    if (year >= 2019) return `令和${year - 2018 === 1 ? "元" : year - 2018}年`;
    if (year >= 1989) return `平成${year - 1988 === 1 ? "元" : year - 1988}年`;
    if (year >= 1926) return `昭和${year - 1925 === 1 ? "元" : year - 1925}年`;
    return "";
  };
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // 1. 画面ロード時にLIFFを初期化し、LINE IDを取得
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_TRIAL_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error("NEXT_PUBLIC_TRIAL_LIFF_ID または NEXT_PUBLIC_LIFF_ID が設定されていません。");
        }

        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserId(profile.userId);
          setIsLiffReady(true);

          // LIFFアクセスログの記録と閲覧タグ（trial_form_viewed）の自動付与（非同期・ノンブロッキング）
          try {
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
          } catch {
            // トラッキングの失敗はユーザーのフォーム表示・入力を阻害しない
          }
        } else {
          const redirectUri = window.location.origin + window.location.pathname;
          // リダイレクトがブロックされた場合のためにメッセージを表示
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

    const fetchTerms = async () => {
      try {
        const res = await fetch("/api/public/terms");
        if (res.ok) {
          const data = await res.json();
          setTermsText(data.terms);
        } else {
          setTermsText("利用規約の読み込みに失敗しました。");
        }
      } catch (error) {
        setTermsText("利用規約の読み込みに失敗しました。");
      }
    };

    initLiff();
    fetchTerms();
  }, []);

  // 大まかな時間帯プリセット
  const TIME_SLOT_PRESETS = [
    { label: "平日夕方 (15:00〜18:00)", value: "平日夕方（15:00〜18:00）" },
    { label: "土日午前 (9:00〜12:00)", value: "土日午前（9:00〜12:00）" },
    { label: "土日午後 (13:00〜18:00)", value: "土日午後（13:00〜18:00）" },
    { label: "終日いつでも調整可", value: "終日いつでも調整可" },
  ];

  // 全体で調整可能な大まかな時間枠チェックボックス一覧
  const GENERAL_TIME_SLOT_OPTIONS = [
    "平日夕方（15:00〜18:00）",
    "土日午前",
    "土日午後",
    "終日いつでも調整可",
    "平日午前（9:00〜12:00）",
    "平日夜間（18:00〜21:00）",
  ];

  // 入力変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  // 2. 「LINEで申し込む」ボタンが押された時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.dob) {
      alert("生年月日を選択してください。");
      return;
    }
    // 2人目について、いずれか1つでも入力されている場合は年・月・日のすべてが選択されているか確認
    if ((dob2Parts.year || dob2Parts.month || dob2Parts.day) && !formData.dob2) {
      alert("2人目の生年月日を年・月・日まで正確に選択してください。");
      return;
    }
    if (formData.email !== formData.emailConfirm) {
      alert("メールアドレスが一致しません。");
      return;
    }
    if (!formData.agreed) {
      alert("利用規約への同意が必要です。");
      return;
    }

    setIsSubmitting(true);

    if (!userId) {
      alert("LINE IDが取得できませんでした。LINEアプリから開き直してください。");
      setIsSubmitting(false);
      return;
    }

    // 日時文字列のフォーマット（大まかな時間帯プリセットまたは詳細時間のいずれにも対応）
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
      userId: userId,
      ...formData,
      availableTimes: combinedAvailableTimes,
      datetime1: formatDateTime(formData.date1, formData.time1Start, formData.time1End, formData.time1Slot),
      datetime2: formatDateTime(formData.date2, formData.time2Start, formData.time2End, formData.time2Slot),
      datetime3: formatDateTime(formData.date3, formData.time3Start, formData.time3End, formData.time3Slot),
      source: "体験予約フォーム"
    };

    try {
      // 内部のAPIルートへ送信
      const response = await fetch("/api/trial-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        if (liff.isInClient()) {
          // LIFF環境下ではアラートを出さずに即座に閉じる
          liff.closeWindow();
        } else {
          alert("お申し込みを受け付けました！画面を閉してください。");
        }
      } else {
        alert("送信に失敗しました。もう一度お試しください。");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("送信エラー:", error);
      alert("通信エラーが発生しました。");
      setIsSubmitting(false);
    }
  };

  if (!isLiffReady) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "sans-serif" }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (liffError) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "sans-serif", color: "red", padding: "20px" }}>
        <p>エラーが発生しました: {liffError}</p>
        <p style={{ color: "#666", fontSize: "14px" }}>LINEアプリから開き直すか、設定を確認してください。</p>
      </div>
    );
  }

  const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", fontWeight: "bold", color: "#555", fontSize: "14px" };
  const inputStyle: React.CSSProperties = { padding: "12px", marginTop: "6px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px" };
  const sectionTitleStyle: React.CSSProperties = { borderLeft: "4px solid #00B900", paddingLeft: "10px", margin: "30px 0 15px 0", fontSize: "18px", color: "#333" };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#f9f9f9" }}>
      <h2 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>体験レッスンお申し込み</h2>
      
      {/* お友達紹介キャンペーン価格の明記バナー */}
      <div style={{ 
        backgroundColor: "#FEF3C7", 
        border: "1.5px solid #F59E0B", 
        borderRadius: "8px", 
        padding: "14px 16px", 
        marginBottom: "20px" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", color: "#92400E", fontSize: "14px", marginBottom: "4px" }}>
          <span>🎁</span>
          <span>お友達紹介キャンペーン実施中！</span>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "#B45309", lineHeight: "1.5" }}>
          ※お友達紹介の場合は、<strong>初回体験が特別価格3,500円（通常6,000円）</strong>となります。<br />
          ご紹介でお申し込みの方は、下記の「ご紹介者様のお名前」欄にご記入ください。
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        
        <div style={sectionTitleStyle}>ご紹介者様（任意）</div>
        
        <label style={labelStyle}>
          ご紹介者様のお名前（お友達紹介キャンペーン）:
          <input 
            type="text" 
            name="referrerName" 
            value={formData.referrerName} 
            onChange={handleChange} 
            placeholder="例：山田 太郎 様（ご紹介者がいる場合のみ）" 
            style={inputStyle} 
          />
          <span style={{ fontSize: "12px", color: "#B45309", marginTop: "4px", fontWeight: "normal" }}>
            ※ご紹介者様のお名前を入力いただくと、初回体験が特別価格3,500円（通常6,000円）となります。
          </span>
        </label>

        <div style={sectionTitleStyle}>基本情報（1人目）</div>
        
        <label style={labelStyle}>
          お名前:
          <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="例：山田 太郎" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          フリガナ:
          <input type="text" name="kana" value={formData.kana} onChange={handleChange} required placeholder="例：ヤマダ タロウ" style={inputStyle} />
        </label>

        <div style={labelStyle}>
          <span>生年月日: <span style={{ color: "red", fontSize: "12px" }}>※必須</span></span>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px", alignItems: "center" }}>
            <select
              value={dobParts.year}
              onChange={(e) => handleDobChange(1, "year", e.target.value)}
              required
              style={{ ...inputStyle, marginTop: 0, flex: "1.4", minWidth: 0, padding: "12px 6px" }}
            >
              <option value="">年</option>
              {years.map(y => (
                <option key={y} value={y}>
                  {y}年{getJapaneseEra(y) ? ` (${getJapaneseEra(y)})` : ""}
                </option>
              ))}
            </select>
            <select
              value={dobParts.month}
              onChange={(e) => handleDobChange(1, "month", e.target.value)}
              required
              style={{ ...inputStyle, marginTop: 0, flex: "1", minWidth: 0, padding: "12px 6px" }}
            >
              <option value="">月</option>
              {months.map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            <select
              value={dobParts.day}
              onChange={(e) => handleDobChange(1, "day", e.target.value)}
              required
              style={{ ...inputStyle, marginTop: 0, flex: "1", minWidth: 0, padding: "12px 6px" }}
            >
              <option value="">日</option>
              {days.map(d => (
                <option key={d} value={d}>{d}日</option>
              ))}
            </select>
          </div>
        </div>

        <label style={labelStyle}>
          性別:
          <select name="gender" value={formData.gender} onChange={handleChange} required style={inputStyle}>
            <option value="">選択してください</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="回答しない">回答しない</option>
          </select>
        </label>

        <div style={sectionTitleStyle}>2人目の情報（任意）</div>

        <label style={labelStyle}>
          お名前（2人目）:
          <input type="text" name="name2" value={formData.name2} onChange={handleChange} placeholder="例：山田 花子" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          フリガナ（2人目）:
          <input type="text" name="kana2" value={formData.kana2} onChange={handleChange} placeholder="例：ヤマダ ハナコ" style={inputStyle} />
        </label>

        <div style={labelStyle}>
          <span>生年月日（2人目）:</span>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px", alignItems: "center" }}>
            <select
              value={dob2Parts.year}
              onChange={(e) => handleDobChange(2, "year", e.target.value)}
              style={{ ...inputStyle, marginTop: 0, flex: "1.4", minWidth: 0, padding: "12px 6px" }}
            >
              <option value="">年</option>
              {years.map(y => (
                <option key={y} value={y}>
                  {y}年{getJapaneseEra(y) ? ` (${getJapaneseEra(y)})` : ""}
                </option>
              ))}
            </select>
            <select
              value={dob2Parts.month}
              onChange={(e) => handleDobChange(2, "month", e.target.value)}
              style={{ ...inputStyle, marginTop: 0, flex: "1", minWidth: 0, padding: "12px 6px" }}
            >
              <option value="">月</option>
              {months.map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            <select
              value={dob2Parts.day}
              onChange={(e) => handleDobChange(2, "day", e.target.value)}
              style={{ ...inputStyle, marginTop: 0, flex: "1", minWidth: 0, padding: "12px 6px" }}
            >
              <option value="">日</option>
              {days.map(d => (
                <option key={d} value={d}>{d}日</option>
              ))}
            </select>
          </div>
        </div>

        <label style={labelStyle}>
          性別（2人目）:
          <select name="gender2" value={formData.gender2} onChange={handleChange} style={inputStyle}>
            <option value="">選択してください</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="回答しない">回答しない</option>
          </select>
        </label>

        <div style={sectionTitleStyle}>連絡先・その他</div>

        <label style={labelStyle}>
          メールアドレス:
          <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="example@mail.com" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          メールアドレス（確認）:
          <input type="email" name="emailConfirm" value={formData.emailConfirm} onChange={handleChange} required placeholder="再度入力してください" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          電話番号:
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="090-1234-5678" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          最寄駅もしくは希望のエリア:
          <input type="text" name="station" value={formData.station} onChange={handleChange} required placeholder="例：恵比寿駅、渋谷区周辺" style={inputStyle} />
          <span style={{
            fontSize: "12px",
            color: "#065f46",
            marginTop: "6px",
            lineHeight: "1.6",
            fontWeight: "normal",
            backgroundColor: "#ECFDF5",
            border: "1px solid #A7F3D0",
            padding: "8px 12px",
            borderRadius: "6px"
          }}>
            ※具体的なプールが決まっていなくても大丈夫です。ご自宅の最寄り駅を教えていただければ、利用可能な近隣プールを事務局からご提案します
          </span>
        </label>

        <div style={sectionTitleStyle}>希望日時（第1希望のみ必須）</div>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px", marginTop: "-8px", lineHeight: "1.5" }}>
          ※第1希望は必須です。第2・第3希望は「空いていれば早く確定しやすい」ため、可能であればご指定ください（任意入力）。
        </p>

        {/* ざっくり調整可能な時間帯（チェックボックス複数選択） */}
        <div style={{
          backgroundColor: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: "8px",
          padding: "12px 14px",
          marginBottom: "16px"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#166534", marginBottom: "4px" }}>
            ⏰ 調整しやすい大まかな時間帯（複数選択可・任意）
          </div>
          <p style={{ fontSize: "11px", color: "#15803D", margin: "0 0 10px 0" }}>
            特定の時間にこだわらず、幅広く対応可能な時間帯があればチェックしてください。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {GENERAL_TIME_SLOT_OPTIONS.map((slot) => {
              const isChecked = selectedTimeSlots.includes(slot);
              return (
                <label
                  key={slot}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    color: isChecked ? "#166534" : "#374151",
                    fontWeight: isChecked ? "bold" : "normal",
                    backgroundColor: isChecked ? "#DCFCE7" : "#FFFFFF",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${isChecked ? "#86EFAC" : "#E5E7EB"}`,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleTimeSlotCheckboxToggle(slot)}
                    style={{ width: "16px", height: "16px", accentColor: "#00B900" }}
                  />
                  <span>{slot}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 第1希望日時（必須） */}
        <div style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E5E7EB", borderRadius: "8px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ ...labelStyle, marginBottom: "8px" }}>
            <span>第1希望日時: <span style={{ color: "red", fontSize: "12px" }}>※必須</span></span>
          </div>
          <input
            type="date"
            name="date1"
            value={formData.date1}
            onChange={handleChange}
            required
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginTop: 0, marginBottom: "8px" }}
          />
          <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>
            時間帯をざっくり選択:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TIME_SLOT_PRESETS.map((p) => {
              const isSelected = formData.time1Slot === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleSlotSelect(1, p.value)}
                  style={{
                    fontSize: "12px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: isSelected ? "1.5px solid #00B900" : "1px solid #D1D5DB",
                    backgroundColor: isSelected ? "#ECFDF5" : "#F9FAFB",
                    color: isSelected ? "#065F46" : "#374151",
                    fontWeight: isSelected ? "bold" : "normal",
                    cursor: "pointer",
                  }}
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
              style={{
                fontSize: "12px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: customTimeMode1 ? "1.5px solid #3B82F6" : "1px dashed #9CA3AF",
                backgroundColor: customTimeMode1 ? "#EFF6FF" : "#FFFFFF",
                color: customTimeMode1 ? "#1D4ED8" : "#4B5563",
                fontWeight: customTimeMode1 ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              ⏱ 時間を細かく指定
            </button>
          </div>
          {customTimeMode1 && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", marginTop: "8px" }}>
              <input type="time" name="time1Start" value={formData.time1Start} onChange={handleChange} step="600" style={{ ...inputStyle, marginTop: 0, flex: 1, padding: "10px 5px" }} />
              <span>〜</span>
              <input type="time" name="time1End" value={formData.time1End} onChange={handleChange} step="600" style={{ ...inputStyle, marginTop: 0, flex: 1, padding: "10px 5px" }} />
            </div>
          )}
        </div>

        {/* 第2希望日時（任意） */}
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ ...labelStyle, marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>第2希望日時 <span style={{ color: "#6B7280", fontSize: "12px", fontWeight: "normal" }}>（任意）</span></span>
              <span style={{ fontSize: "11px", color: "#059669", backgroundColor: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>空いていれば早く確定しやすい</span>
            </div>
          </div>
          <input
            type="date"
            name="date2"
            value={formData.date2}
            onChange={handleChange}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginTop: 0, marginBottom: "8px" }}
          />
          <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>
            時間帯をざっくり選択:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TIME_SLOT_PRESETS.map((p) => {
              const isSelected = formData.time2Slot === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleSlotSelect(2, p.value)}
                  style={{
                    fontSize: "12px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: isSelected ? "1.5px solid #00B900" : "1px solid #D1D5DB",
                    backgroundColor: isSelected ? "#ECFDF5" : "#F9FAFB",
                    color: isSelected ? "#065F46" : "#374151",
                    fontWeight: isSelected ? "bold" : "normal",
                    cursor: "pointer",
                  }}
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
              style={{
                fontSize: "12px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: customTimeMode2 ? "1.5px solid #3B82F6" : "1px dashed #9CA3AF",
                backgroundColor: customTimeMode2 ? "#EFF6FF" : "#FFFFFF",
                color: customTimeMode2 ? "#1D4ED8" : "#4B5563",
                fontWeight: customTimeMode2 ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              ⏱ 時間を細かく指定
            </button>
          </div>
          {customTimeMode2 && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", marginTop: "8px" }}>
              <input type="time" name="time2Start" value={formData.time2Start} onChange={handleChange} step="600" style={{ ...inputStyle, marginTop: 0, flex: 1, padding: "10px 5px" }} />
              <span>〜</span>
              <input type="time" name="time2End" value={formData.time2End} onChange={handleChange} step="600" style={{ ...inputStyle, marginTop: 0, flex: 1, padding: "10px 5px" }} />
            </div>
          )}
        </div>

        {/* 第3希望日時（任意） */}
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ ...labelStyle, marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>第3希望日時 <span style={{ color: "#6B7280", fontSize: "12px", fontWeight: "normal" }}>（任意）</span></span>
              <span style={{ fontSize: "11px", color: "#059669", backgroundColor: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>空いていれば早く確定しやすい</span>
            </div>
          </div>
          <input
            type="date"
            name="date3"
            value={formData.date3}
            onChange={handleChange}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginTop: 0, marginBottom: "8px" }}
          />
          <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>
            時間帯をざっくり選択:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TIME_SLOT_PRESETS.map((p) => {
              const isSelected = formData.time3Slot === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleSlotSelect(3, p.value)}
                  style={{
                    fontSize: "12px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: isSelected ? "1.5px solid #00B900" : "1px solid #D1D5DB",
                    backgroundColor: isSelected ? "#ECFDF5" : "#F9FAFB",
                    color: isSelected ? "#065F46" : "#374151",
                    fontWeight: isSelected ? "bold" : "normal",
                    cursor: "pointer",
                  }}
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
              style={{
                fontSize: "12px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: customTimeMode3 ? "1.5px solid #3B82F6" : "1px dashed #9CA3AF",
                backgroundColor: customTimeMode3 ? "#EFF6FF" : "#FFFFFF",
                color: customTimeMode3 ? "#1D4ED8" : "#4B5563",
                fontWeight: customTimeMode3 ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              ⏱ 時間を細かく指定
            </button>
          </div>
          {customTimeMode3 && (
            <div style={{ display: "flex", gap: "5px", alignItems: "center", marginTop: "8px" }}>
              <input type="time" name="time3Start" value={formData.time3Start} onChange={handleChange} step="600" style={{ ...inputStyle, marginTop: 0, flex: 1, padding: "10px 5px" }} />
              <span>〜</span>
              <input type="time" name="time3End" value={formData.time3End} onChange={handleChange} step="600" style={{ ...inputStyle, marginTop: 0, flex: 1, padding: "10px 5px" }} />
            </div>
          )}
        </div>

        <div style={sectionTitleStyle}>泳力・目標</div>

        <label style={labelStyle}>
          現在の泳力・目標:
          <textarea name="skillLevel" value={formData.skillLevel} onChange={handleChange} required placeholder="例：25m泳げるようになりたい、クロールのフォームを改善したい等" style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }} />
        </label>

        <label style={labelStyle}>
          レッスン希望頻度:
          <select name="frequency" value={formData.frequency} onChange={handleChange} required style={inputStyle}>
            <option value="">選択してください</option>
            <option value="毎週">毎週</option>
            <option value="隔週">隔週</option>
            <option value="月1回">月1回</option>
            <option value="不定期">不定期・単発</option>
          </select>
        </label>

        <label style={labelStyle}>
          入会をご検討の場合、レッスン可能な曜日や時間帯（任意）:
          <textarea name="availableTimes" value={formData.availableTimes} onChange={handleChange} placeholder="例：月曜10:00〜12:00、木曜18:00以降など" style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} />
        </label>

        <label style={labelStyle}>
          その他（ご質問など）:
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="自由にご記入ください" style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} />
        </label>

        <div style={{ marginTop: "30px" }}>
          <div style={sectionTitleStyle}>利用規約</div>
          <div style={{ 
            height: "200px", 
            overflowY: "auto", 
            padding: "15px", 
            backgroundColor: "#fff", 
            border: "1px solid #ccc", 
            borderRadius: "8px",
            fontSize: "13px",
            color: "#555",
            whiteSpace: "pre-wrap",
            lineHeight: "1.6"
          }}>
            {termsText === null ? "利用規約を読み込み中..." : termsText}
          </div>
          
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "bold", marginTop: "15px" }}>
            <input type="checkbox" name="agreed" checked={formData.agreed} onChange={handleChange} required style={{ width: "20px", height: "20px" }} />
            <span>上記の利用規約に同意する</span>
          </label>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ 
            padding: "16px", 
            backgroundColor: isSubmitting ? "#ccc" : "#00B900", // LINEのブランドカラー
            color: "white", 
            border: "none", 
            borderRadius: "8px", 
            fontSize: "16px", 
            fontWeight: "bold",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            marginTop: "10px"
          }}
        >
          {isSubmitting ? "送信中..." : "LINEで申し込む"}
        </button>
      </form>
    </div>
  );
}
