'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { registerTrioWaitlist } from '@/actions/trio_onboarding';
import { toast } from 'sonner';
import { Loader2, Mail, User, CheckCircle2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitlistFormProps {
    waitlistCount: number;
    onSuccess?: () => void;
}

export default function WaitlistForm({ waitlistCount, onSuccess }: WaitlistFormProps) {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;

        try {
            const res = await registerTrioWaitlist({ name, email });
            if (res.success) {
                setSubmitted(true);
                toast.success('キャンセル待ちに登録しました');
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error || 'エラーが発生しました');
            }
        } catch (error) {
            toast.error('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="text-center space-y-6 py-8 animate-in fade-in zoom-in duration-700">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 border border-emerald-100">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">登録が完了しました</h3>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                        ご登録ありがとうございます。欠員が出次第、LINEまたはメールにて最優先でご案内いたします。
                    </p>
                </div>
                <div className="pt-4">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 inline-block px-4 py-1.5 rounded-full">
                        優先ステータス: 有効
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest mx-auto shadow-sm">
                    キャンセル待ち登録
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-3xl font-black tracking-tighter text-slate-800">キャンセル待ち登録</CardTitle>
                    <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        現在のキャンセル待ち数: <span className="text-amber-600 text-xs">{waitlistCount}</span> 名
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">お名前</Label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <Input 
                                    id="name" 
                                    name="name" 
                                    placeholder="お名前" 
                                    required 
                                    className="h-12 pl-12 rounded-2xl bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">メールアドレス</Label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <Input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    placeholder="example@swim-partners.com" 
                                    required 
                                    className="h-12 pl-12 rounded-2xl bg-white/80 border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-black hover:to-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                キャンセル待ちに登録する
                            </>
                        )}
                    </Button>

                    <p className="text-center text-[10px] text-slate-300 font-medium px-4 leading-relaxed uppercase tracking-widest">
                        * 登録完了後、枠が空き次第優先的にご案内いたします。<br/>
                        プライバシーポリシーに同意の上送信してください。
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}
