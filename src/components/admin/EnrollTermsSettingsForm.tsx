"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { updateAppConfig } from '@/actions/app_configs';
import { Loader2, Save, FileCheck, Plus, Trash2, Layers } from 'lucide-react';

interface ConsentTerm {
  id: string;
  label: string;
  text: string;
  target: 'all' | 'monthly' | 'package';
}

interface EnrollTermsSettingsFormProps {
  initialTermsJson: string;
}

export function EnrollTermsSettingsForm({ initialTermsJson }: EnrollTermsSettingsFormProps) {
  const [terms, setTerms] = useState<ConsentTerm[]>(() => {
    try {
      return JSON.parse(initialTermsJson);
    } catch (e) {
      console.error("Failed to parse initialTermsJson:", e);
      return [];
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新規同意項目の追加
  const handleAddTerm = () => {
    const newTerm: ConsentTerm = {
      id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: '新規の同意項目',
      text: '',
      target: 'all',
    };
    setTerms([...terms, newTerm]);
  };

  // 同意項目の削除
  const handleDeleteTerm = (id: string) => {
    if (confirm('この同意項目を削除してもよろしいですか？\n※保存ボタンを押すまではデータベースには反映されません。')) {
      setTerms(terms.filter(t => t.id !== id));
    }
  };

  // 各フィールドの値変更
  const handleChangeTerm = (id: string, key: keyof ConsentTerm, value: any) => {
    setTerms(terms.map(t => (t.id === id ? { ...t, [key]: value } : t)));
  };

  // 保存処理
  const handleSave = async () => {
    // バリデーション
    const invalidTerm = terms.find(t => !t.label.trim() || !t.text.trim());
    if (invalidTerm) {
      alert('管理用ラベルと同意文章は必須入力です。空欄がないか確認してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const value = JSON.stringify(terms);
      const res = await updateAppConfig('enroll_consent_terms', value, '入会フォーム：動的同意事項チェックリスト設定');

      if (res.success) {
        alert('入会フォームの同意事項設定を保存しました！');
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
            <FileCheck className="h-5 w-5 text-blue-600 animate-pulse" />
            <div>
              <CardTitle className="text-lg font-black text-slate-800">入会フォーム：同意事項の確認設定</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                入会フォームの「③ 同意事項の確認」に表示されるチェック項目を自由に追加・削除・編集できます。
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={handleAddTerm}
            variant="outline"
            className="border-blue-200 hover:bg-blue-50 text-blue-600 font-bold flex items-center gap-1.5 h-8 text-xs rounded-lg shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            新規項目を追加
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {terms.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
            <p className="text-xs text-slate-500 font-medium">登録されている同意項目がありません。</p>
            <Button
              onClick={handleAddTerm}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs px-3 rounded-lg shadow-sm"
            >
              最初の同意項目を追加する
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {terms.map((term, index) => (
              <div
                key={term.id}
                className="p-5 border border-slate-200 rounded-2xl bg-white shadow-xs space-y-4 relative hover:border-slate-300 transition-colors animate-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <Input
                      value={term.label}
                      onChange={(e) => handleChangeTerm(term.id, 'label', e.target.value)}
                      placeholder="管理用ラベル（例: キャンセル規定）"
                      className="h-8 text-xs font-bold text-slate-800 bg-slate-50/50 max-w-[280px]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <select
                        value={term.target}
                        onChange={(e) => handleChangeTerm(term.id, 'target', e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
                      >
                        <option value="all">すべてのプランで表示</option>
                        <option value="monthly">月謝プランのみ表示</option>
                        <option value="package">パッケージプランのみ表示</option>
                      </select>
                    </div>

                    <Button
                      onClick={() => handleDeleteTerm(term.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex-shrink-0"
                      title="この項目を削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block ml-1">
                    同意させる文章（入会画面のチェックボックス横に表示されるテキスト）
                  </label>
                  <Textarea
                    value={term.text}
                    onChange={(e) => handleChangeTerm(term.id, 'text', e.target.value)}
                    placeholder="ここに実際の同意規約文を入力してください。"
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
            onClick={handleAddTerm}
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 text-slate-600 font-bold flex items-center gap-1.5 h-9 px-4 rounded-lg shadow-xs"
          >
            <Plus className="h-4 w-4" />
            新規項目を追加する
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
