"use client";

import React, { useEffect, useState } from 'react';
import liff from '@line/liff';

export default function EnrollSuccessPage() {
  const [isLiffReady, setIsLiffReady] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;
        await liff.init({ liffId });
        setIsLiffReady(true);
      } catch (err) {
        console.error("LIFF Success Page init error:", err);
      }
    };
    initLiff();
  }, []);

  const handleClose = () => {
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      // ブラウザ等で開かれている場合はアラートまたは元のページに戻る
      alert("LINEアプリ内から開いてください。アプリを閉じるか、ブラウザを終了してください。");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* 美しい背景エフェクト */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[80px] animate-[blob_20s_infinite_ease-in-out]"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-cyan-100/30 rounded-full mix-blend-multiply filter blur-[80px] animate-[blob_25s_infinite_ease-in-out_2s]"></div>
      </div>

      <div className="relative z-10 max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fadeIn">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-700 to-cyan-500 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm animate-bounce">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-wider">お手続き完了</h1>
          <p className="text-xs opacity-90 mt-1">ご入会ありがとうございます！</p>
        </div>

        {/* コンテンツ */}
        <div className="p-8 space-y-6 text-center">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-800">決済登録が完了しました</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Swim Partners へのオンライン入会お手続きが正常に完了いたしました。<br />
              ご登録いただいたメールアドレス宛に決済完了のご案内を送信しておりますので、ご確認ください。
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-left space-y-2">
            <h3 className="text-xs font-bold text-blue-800">💡 今後の流れ</h3>
            <ul className="text-xs text-blue-900 space-y-1">
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 font-bold">1.</span>
                <span>この画面を閉じて、LINEアプリに戻ります。</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-1.5 font-bold">2.</span>
                <span>トーク画面からレッスンをご予約いただけます。</span>
              </li>
            </ul>
          </div>

          {/* LINEを閉じるボタン */}
          <button
            onClick={handleClose}
            className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 active:scale-[0.98] text-white rounded-xl font-bold text-center tracking-wider transition-all shadow-md"
          >
            LINEアプリに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
