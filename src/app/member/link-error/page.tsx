'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

function MemberLinkErrorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const message = searchParams.get('message') || '連携エラーが発生しました';

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/member/login');
    };

    return (
        <Card className="w-full max-w-md border-red-200 bg-red-50">
            <CardHeader>
                <CardTitle className="text-red-700">会員データの連携に失敗しました</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-red-900">{message}</p>
                <p className="text-sm text-gray-600">
                    ご登録のLINEアカウントまたはメールアドレスが、
                    管理システム上のデータと一致しない可能性があります。
                </p>

                <div className="pt-4 space-y-2">
                    <Button
                        variant="default"
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={handleLogout}
                    >
                        ログアウトして戻る
                    </Button>
                    <div className="text-center">
                        <a href="mailto:info.swimpartners@gmail.com" className="text-sm text-gray-500 hover:underline">
                            管理者に問い合わせる
                        </a>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function MemberLinkErrorPage() {
    return (
        <div className="flex min-h-[80vh] items-center justify-center p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <MemberLinkErrorContent />
            </Suspense>
        </div>
    );
}
