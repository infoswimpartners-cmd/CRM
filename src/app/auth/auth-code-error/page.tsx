import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md text-center p-8">
                <CardHeader className="space-y-6 pt-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                        <AlertCircle className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-blue-900 tracking-tight">認証に失敗しました</h1>
                        <CardDescription className="text-blue-400 font-medium leading-relaxed">
                            リンクの有効期限が切れているか、既に無効になっている可能性があります。
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <p className="text-sm text-blue-800 bg-blue-50 p-4 rounded-2xl">
                        お手数ですが、再度パスワード再設定画面からリンクを発行してください。
                    </p>
                    <div className="space-y-3">
                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl text-lg shadow-lg shadow-blue-200 active:scale-[0.98] transition-all">
                            <Link href="/member/forgot-password">
                                パスワード再設定画面へ
                            </Link>
                        </Button>
                        <Button asChild variant="link" className="w-full text-blue-400 hover:text-blue-600 font-bold">
                            <Link href="/member/login">
                                <ArrowLeft className="mr-2 h-4 w-4" /> ログイン画面に戻る
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
