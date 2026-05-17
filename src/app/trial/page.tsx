"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function BookingForm() {
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // フォーム入力値の状態管理
  const [formData, setFormData] = useState({
    name: "",
    kana: "",
    dob: "",
    name2: "",
    kana2: "",
    dob2: "",
    email: "",
    emailConfirm: "",
    phone: "",
    station: "",
    datetime1: "",
    datetime2: "",
    datetime3: "",
    skillLevel: "",
    frequency: "",
    notes: "",
    agreed: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. 画面ロード時にLIFFを初期化し、LINE IDを取得
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

  // 入力変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 2. 「LINEで申し込む」ボタンが押された時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
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

    // Makeへ送信するデータ
    const payload = {
      userId: userId,
      ...formData,
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
        alert("お申し込みを受け付けました！");
        if (liff.isInClient()) {
          liff.closeWindow();
        }
      } else {
        alert("送信に失敗しました。もう一度お試しください。");
      }
    } catch (error) {
      console.error("送信エラー:", error);
      alert("通信エラーが発生しました。");
    } finally {
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
      <h2 style={{ textAlign: "center", color: "#333", marginBottom: "30px" }}>体験レッスンお申し込み</h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        
        <div style={sectionTitleStyle}>基本情報（1人目）</div>
        
        <label style={labelStyle}>
          お名前:
          <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="例：山田 太郎" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          フリガナ:
          <input type="text" name="kana" value={formData.kana} onChange={handleChange} required placeholder="例：ヤマダ タロウ" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          生年月日:
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} required style={inputStyle} />
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

        <label style={labelStyle}>
          生年月日（2人目）:
          <input type="date" name="dob2" value={formData.dob2} onChange={handleChange} style={inputStyle} />
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
        </label>

        <div style={sectionTitleStyle}>希望日時（第3希望まで）</div>

        <label style={labelStyle}>
          第1希望日時:
          <input type="datetime-local" name="datetime1" value={formData.datetime1} onChange={handleChange} required style={inputStyle} />
        </label>

        <label style={labelStyle}>
          第2希望日時:
          <input type="datetime-local" name="datetime2" value={formData.datetime2} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          第3希望日時:
          <input type="datetime-local" name="datetime3" value={formData.datetime3} onChange={handleChange} style={inputStyle} />
        </label>

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
          その他（ご質問など）:
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="自由にご記入ください" style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} />
        </label>

        <div style={{ marginTop: "30px", padding: "15px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #eee" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "bold" }}>
            <input type="checkbox" name="agreed" checked={formData.agreed} onChange={handleChange} required style={{ width: "20px", height: "20px" }} />
            <span>
              <a href="https://swim-partners.com/rule" target="_blank" rel="noopener noreferrer" style={{ color: "#00B900", textDecoration: "underline" }}>利用規約</a>に同意する
            </span>
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
