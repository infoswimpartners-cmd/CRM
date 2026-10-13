'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Root Layout error caught by global-error.tsx:', error);
    }, [error]);

    return (
        <html lang="ja">
            <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
                <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200 shadow-xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
                        ⚠️
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            システムエラーが発生しました
                        </h2>
                        <p className="text-sm text-zinc-600 leading-relaxed">
                            一時的なシステム障害が発生しました。ページの再読み込みをお試しください。
                        </p>
                        {error.digest && (
                            <p className="text-[11px] font-mono text-zinc-600 bg-zinc-100 py-1 px-2 rounded-md inline-block">
                                エラーコード: {error.digest}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                            onClick={() => reset()}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm cursor-pointer"
                        >
                            再読み込みする
                        </button>
                        <Link
                            href="/"
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-slate-800 font-medium text-sm transition-all"
                        >
                            ホームへ戻る
                        </Link>
                    </div>
                </div>
            </body>
        </html>
    );
}
