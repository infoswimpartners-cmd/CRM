'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TrioJoinPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/trio/dashboard');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A192F]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">ダッシュボードへ移動中...</p>
            </div>
        </div>
    );
}
