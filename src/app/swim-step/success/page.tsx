'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import Link from 'next/link';
import { 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Sparkles, 
  MessageCircle, 
  Calendar, 
  ChevronRight, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SwimStepSuccessPage() {
  const [isInClient, setIsInClient] = useState(false);

  useEffect(() => {
    try {
      const liffId =
        process.env.NEXT_PUBLIC_SWIM_STEP_LIFF_ID ||
        process.env.NEXT_PUBLIC_LIFF_ID ||
        process.env.NEXT_PUBLIC_TRIAL_LIFF_ID;

      if (liffId) {
        liff.init({ liffId }).then(() => {
          setIsInClient(liff.isInClient());
        }).catch((err) => {
          console.warn('LIFF init warning:', err);
        });
      }
    } catch (e) {
      console.warn('LIFF check error:', e);
    }
  }, []);

  const handleClose = () => {
    try {
      if (liff.isInClient()) {
        liff.closeWindow();
      } else {
        window.close();
      }
    } catch (e) {
      console.warn('Close window error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* 完了ヘッダーカード */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-emerald-100 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
              お申し込み・決済完了
            </Badge>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              ご予約ありがとうございます！
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              スイムステップ（城東小学校プール 10月限定クラス）のお申し込みとお支払いが正常に完了いたしました。
            </p>
          </div>

          {/* LINE通知案内 */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4 text-left flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-emerald-900">
              <div className="font-bold">LINE公式アカウントに詳細メッセージを送信しました</div>
              <p className="text-emerald-800 text-xs leading-relaxed">
                トーク画面にご予約内容の控え、当日の持ち物、集合場所の案内が届いておりますのでご確認ください。
              </p>
            </div>
          </div>
        </div>

        {/* 当日のご案内・持ち物 */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              当日の持ち物・集合場所
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm text-slate-700">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wide text-blue-600">
                <MapPin className="w-4 h-4 text-blue-600" />
                集合場所・受付
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70 text-xs sm:text-sm">
                <strong>城東小学校プール（プール棟入口）</strong>
                <p className="text-slate-500 text-xs mt-1">
                  ※レッスン開始10分前までにプール棟入口受付へお越しください。
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wide text-blue-600">
                <Clock className="w-4 h-4 text-blue-600" />
                当日の持ち物リスト
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  水着（指定なし・動きやすいもの）
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  水泳帽（スイムキャップ）
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  水泳用ゴーグル
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  バスタオル
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  飲み物（水分補給用）
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 閉じる / 戻るボタン */}
        <div className="space-y-2">
          {isInClient ? (
            <Button
              onClick={handleClose}
              className="w-full py-6 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              LINEトーク画面に戻る
            </Button>
          ) : (
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full py-6 text-base font-bold rounded-xl"
            >
              画面を閉じる
            </Button>
          )}
          <p className="text-center text-xs text-slate-500">
            ※キャンセルや日程変更をご希望の場合は、前日正午までにLINE公式アカウントのトーク画面よりご連絡ください。
          </p>
          <p className="text-center text-[11px] text-slate-400">
            その他ご不明な点やお困りごとも、LINEトーク画面よりお気軽にお問い合わせいただけます。
          </p>
        </div>
      </div>
    </div>
  );
}
