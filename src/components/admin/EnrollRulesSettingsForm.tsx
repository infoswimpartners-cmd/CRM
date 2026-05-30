"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { updateAppConfig } from '@/actions/app_configs';
import { Loader2, Save, ClipboardList, Plus, Trash2, Layers } from 'lucide-react';

interface RuleTerm {
  id: string;
  label: string;
  text: string;
  target: 'all' | 'monthly' | 'package';
}

interface EnrollRulesSettingsFormProps {
  initialRulesJson: string;
}

export function EnrollRulesSettingsForm({ initialRulesJson }: EnrollRulesSettingsFormProps) {
  const [rules, setRules] = useState<RuleTerm[]>(() => {
    try {
      return JSON.parse(initialRulesJson);
    } catch (e) {
      console.error("Failed to parse initialRulesJson:", e);
      return [];
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新規ルールの追加
  const handleAddRule = () => {
    const newRule: RuleTerm = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: '新規の受講ルール',
      text: '',
      target: 'all',
    };
    setRules([...rules, newRule]);
  };

  // ルールの削除
  const handleDeleteRule = (id: string) => {
    if (confirm('この受講ルールを削除してもよろしいですか？\n※保存ボタンを押すまではデータベースには反映されません。')) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  // 各フィールドの値変更
  const handleChangeRule = (id: string, key: keyof RuleTerm, value: any) => {
    setRules(rules.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  };

  // 保存処理
  const handleSave = async () => {
    // バリデーション
    const invalidRule = rules.find(r => !r.label.trim() || !r.text.trim());
    if (invalidRule) {
      alert('管理用ラベルとルール文章は必須入力です。空欄がないか確認してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const value = JSON.stringify(rules);
      const res = await updateAppConfig('enroll_rules_terms', value, '入会フォーム：動的受講ルールチェックリスト設定');

      if (res.success) {
        alert('入会フォームの受講ルール設定を保存しました！');
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600 animate-pulse" />
            <div>
              <CardTitle className="text-lg font-black text-slate-800">入会フォーム：受講ルールの確認設定</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                入会フォームの「【重要】このプランの受講ルール」に表示される項目を自由に追加・削除・編集できます。
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={handleAddRule}
            variant="outline"
            className="border-blue-200 hover:bg-blue-50 text-blue-600 font-bold flex items-center gap-1.5 h-8 text-xs rounded-lg shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            新規ルールを追加
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {rules.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
            <p className="text-xs text-slate-500 font-medium">登録されている受講ルールがありません。</p>
            <Button
              onClick={handleAddRule}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs px-3 rounded-lg shadow-sm"
            >
              最初の受講ルールを追加する
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                className="p-5 border border-slate-200 rounded-2xl bg-white shadow-xs space-y-4 relative hover:border-slate-300 transition-colors animate-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <Input
                      value={rule.label}
                      onChange={(e) => handleChangeRule(rule.id, 'label', e.target.value)}
                      placeholder="管理用ラベル（例: 交通費・施設利用料）"
                      className="h-8 text-xs font-bold text-slate-800 bg-slate-50/50 max-w-[280px]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <select
                        value={rule.target}
                        onChange={(e) => handleChangeRule(rule.id, 'target', e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
                      >
                        <option value="all">すべてのプランで表示</option>
                        <option value="monthly">月謝プランのみ表示</option>
                        <option value="package">パッケージプランのみ表示</option>
                      </select>
                    </div>

                    <Button
                      onClick={() => handleDeleteRule(rule.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex-shrink-0"
                      title="このルールを削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block ml-1">
                    受講ルールの文章（入会画面の箇条書きに表示されるテキスト）
                  </label>
                  <Textarea
                    value={rule.text}
                    onChange={(e) => handleChangeRule(rule.id, 'text', e.target.value)}
                    placeholder="ここに実際の受講ルール文章を入力してください。"
                    rows={2}
                    className="text-xs focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <Button
            onClick={handleAddRule}
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 text-slate-600 font-bold flex items-center gap-1.5 h-9 px-4 rounded-lg shadow-xs"
          >
            <Plus className="h-4 w-4" />
            新規ルールを追加する
          </Button>

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
