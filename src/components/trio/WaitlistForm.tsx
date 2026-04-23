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
            <div className="text-center space-y-8 py-10 animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 border border-emerald-100">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-black text-sky-950 tracking-tight">登録が完了しました</h3>
                    <p className="text-sky-600/70 text-sm font-bold leading-relaxed max-w-xs mx-auto">
                        欠員が出次第、LINEまたはメールにて最優先でご案内いたします。
                    </p>
                </div>
                <div className="pt-4">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] bg-white border border-emerald-100 inline-block px-6 py-2 rounded-full shadow-sm">
                        Priority Status: Active
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-sky-100 rounded-full text-sky-500 text-[10px] font-black uppercase tracking-[0.3em] mx-auto shadow-sm">
                    Waitlist Registration
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-4xl font-black tracking-tighter text-sky-950">キャンセル待ち登録</CardTitle>
                    <CardDescription className="text-sky-300 font-black uppercase tracking-[0.3em] text-[10px]">
                        Current Waitlist: <span className="text-sky-500 text-sm">{waitlistCount}</span> Members
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-5">
                        <div className="space-y-2.5">
                            <Label htmlFor="name" className="text-[10px] font-black text-sky-300 uppercase tracking-widest ml-2">Your Name</Label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-300 group-focus-within:text-sky-500 transition-colors" />
                                <Input 
                                    id="name" 
                                    name="name" 
                                    placeholder="お名前" 
                                    required 
                                    className="h-14 pl-14 rounded-2xl bg-white border border-sky-100 focus:border-sky-400 focus:ring-sky-100 shadow-sm transition-all text-sm font-bold text-sky-900"
                                />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <Label htmlFor="email" className="text-[10px] font-black text-sky-300 uppercase tracking-widest ml-2">Email Address</Label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-300 group-focus-within:text-sky-500 transition-colors" />
                                <Input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    placeholder="example@swim-partners.com" 
                                    required 
                                    className="h-14 pl-14 rounded-2xl bg-white border border-sky-100 focus:border-sky-400 focus:ring-sky-100 shadow-sm transition-all text-sm font-bold text-sky-900"
                                />
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-16 bg-sky-400 hover:bg-sky-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-sky-400/20 transition-all active:scale-[0.98] border-none"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <span className="flex items-center gap-3">
                                <Send className="w-5 h-5" />
                                キャンセル待ちに登録する
                            </span>
                        )}
                    </Button>

                    <p className="text-center text-[10px] text-sky-300 font-bold px-6 leading-relaxed uppercase tracking-[0.25em]">
                        Reserved for members limited to 12.
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}
