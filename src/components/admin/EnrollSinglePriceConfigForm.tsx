"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { updateAppConfig } from '@/actions/app_configs';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';

interface EnrollSinglePriceConfigFormProps {
  initialShowSinglePrices: string;
}

export function EnrollSinglePriceConfigForm({ initialShowSinglePrices }: EnrollSinglePriceConfigFormProps) {
  const [showSinglePrices, setShowSinglePrices] = useState(initialShowSinglePrices === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await updateAppConfig('enroll_show_single_prices', showSinglePrices ? 'true' : 'false', '入会フォーム：単発プラン選択時に単発レッスン料金一覧を表示するかどうか');
      if (res.success) {
        alert('単発レッスン料金の表示設定を保存しました。');
      } else {
        alert(res.error || '設定の保存に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm mt-6 animate-in fade-in duration-300">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          {showSinglePrices ? (
            <Eye className="h-5 w-5 text-blue-600 animate-pulse" />
          ) : (
            <EyeOff className="h-5 w-5 text-slate-500" />
          )}
          <div>
            <CardTitle className="text-lg font-black text-slate-800">入会フォーム：単発レッスン料金の表示設定</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              単発プランが選ばれたときに、登録されている「単発のレッスン料金一覧（60分、90分、120分）」を入会画面に表示するかどうかを制御します。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
          <div>
            <span className="text-xs font-black text-slate-850 block">
              単発プラン選択時に「標準レッスン受講料」を一覧表示する
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              有効にすると、単発プラン選択時にご請求明細と受講ルールに「60分 / 90分 / 120分」の1回あたりの料金が自動表示されます。非表示にすると表示されません。
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSinglePrices}
              onChange={(e) => setShowSinglePrices(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 h-9 px-4 rounded-lg shadow-sm transition-all hover:shadow"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>設定を保存する</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
