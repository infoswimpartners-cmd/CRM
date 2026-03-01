'use client';

import { useState, useTransition } from 'react';
import { updateMemberProfile } from '@/actions/member/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'sonner';
import { Loader2, User, Phone, CheckCircle2 } from 'lucide-react';

const normalizeGender = (g: string | null | undefined) => {
    if (g === '男') return '男性';
    if (g === '女') return '女性';
    if (!g) return '未回答';
    return g;
};

export default function ProfileForm({ student }: { student: any }) {
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await updateMemberProfile(null, formData);
            if (result.error) {
                toast.error(result.error);
            } else if (result.success) {
                toast.success(result.success);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="full_name" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">氏名 (必須)</Label>
                        <Input
                            id="full_name" name="full_name" defaultValue={student.full_name || ''} required
                            className="bg-gray-50/50 border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="full_name_kana" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">フリガナ</Label>
                        <Input
                            id="full_name_kana" name="full_name_kana" defaultValue={student.full_name_kana || ''}
                            className="bg-gray-50/50 border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 font-medium"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="contact_phone" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest flex items-center gap-1">
                            <Phone className="w-3 h-3" /> 電話番号
                        </Label>
                        <Input
                            id="contact_phone" name="contact_phone" defaultValue={student.contact_phone || ''} type="tel"
                            className="bg-gray-50/50 border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">メールアドレス</Label>
                        <Input
                            value={student.contact_email || ''} disabled
                            className="bg-gray-100/50 text-gray-400 border-none h-14 rounded-2xl font-medium cursor-not-allowed"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">※メールアドレスの変更は運営までお問い合わせください</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="gender" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">性別</Label>
                        <Select name="gender" defaultValue={normalizeGender(student.gender)}>
                            <SelectTrigger className="bg-gray-50/50 border-none h-14 rounded-2xl focus:ring-2 focus:ring-blue-400 font-medium">
                                <SelectValue placeholder="性別を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="男性">男性</SelectItem>
                                <SelectItem value="女性">女性</SelectItem>
                                <SelectItem value="その他">その他</SelectItem>
                                <SelectItem value="未回答">未回答</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="birth_date" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">生年月日</Label>
                        <Input
                            id="birth_date" name="birth_date" type="date" defaultValue={student.birth_date || ''}
                            className="bg-gray-50/50 border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Second Student (if 2 person lesson or if fields exist, we render them open to allow them to fill it in) */}
            <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    ペア生徒情報（兄弟・友人と受講される場合のみ）
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <Label htmlFor="second_student_name" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">ペア氏名</Label>
                        <Input
                            id="second_student_name" name="second_student_name" defaultValue={student.second_student_name || ''}
                            className="bg-gray-50/50 border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="second_student_name_kana" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">ペアフリガナ</Label>
                        <Input
                            id="second_student_name_kana" name="second_student_name_kana" defaultValue={student.second_student_name_kana || ''}
                            className="bg-gray-50/50 border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 font-medium"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="second_student_gender" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">ペア性別</Label>
                        <Select name="second_student_gender" defaultValue={normalizeGender(student.second_student_gender)}>
                            <SelectTrigger className="bg-gray-50/50 border-none h-14 rounded-2xl focus:ring-2 focus:ring-blue-400 font-medium">
                                <SelectValue placeholder="性別を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="男性">男性</SelectItem>
                                <SelectItem value="女性">女性</SelectItem>
                                <SelectItem value="その他">その他</SelectItem>
                                <SelectItem value="未回答">未回答</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="second_student_birth_date" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">ペア生年月日</Label>
                        <Input
                            id="second_student_birth_date" name="second_student_birth_date" type="date" defaultValue={student.second_student_birth_date || ''}
                            className="bg-gray-50/50 border-none h-14 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 font-medium"
                        />
                    </div>
                </div>
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-2xl text-lg shadow-xl active:scale-[0.98] transition-all"
            >
                {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        保存する
                    </>
                )}
            </Button>
        </form>
    );
}
