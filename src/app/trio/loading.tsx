import { Loader2 } from 'lucide-react';

/**
 * TrioLoading
 * Trioポータル用の明るくクールなフルスクリーン・ローディング
 */
export default function TrioLoading() {
    return (
        <div className="min-h-[80vh] bg-white flex flex-col items-center justify-center gap-8 animate-fade-in">
            <div className="relative">
                {/* Decorative Glowing Rings (Light) */}
                <div className="absolute inset-0 bg-sky-100/50 rounded-full blur-3xl animate-pulse scale-150" />
                <div className="w-24 h-24 rounded-[2rem] bg-white border border-sky-100 shadow-[0_20px_50px_rgba(56,189,248,0.1)] flex items-center justify-center relative z-10">
                    <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                </div>
            </div>
            <div className="space-y-2 text-center relative z-10">
                <p className="font-black text-[10px] uppercase tracking-[0.5em] text-sky-500 animate-pulse">Initializing</p>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter">THE TRIO</h2>
            </div>
        </div>
    );
}
