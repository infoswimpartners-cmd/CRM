'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function DashboardErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled Dashboard Server Component render error:', error);
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200/80 shadow-xl p-6 sm:p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                    <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        一時的なエラーが発生しました
                    </h2>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                        ページの読み込み中に一時的な通信エラーまたはタイムアウトが発生しました。再度お試しいただくか、しばらく経ってからアクセスしてください。
                    </p>
                    {error.digest && (
                        <p className="text-[11px] font-mono text-zinc-600 bg-zinc-50 py-1 px-2 rounded-md inline-block">
                            エラー識別コード: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => reset()}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" />
                        再試行する
                    </button>
                    <Link
                        href="/admin"
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-slate-800 font-medium text-sm transition-all flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        管理画面トップ
                    </Link>
                </div>
            </div>
        </div>
    );
}
