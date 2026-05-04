"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { MessageCircle } from "lucide-react";

/**
 * LineLinkButton
 * プレミアム・クールなデザインのLINE連携ボタン
 */
export default function LineLinkButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleLinkLine = async () => {
        setIsLoading(true);
        // NextAuth経由でLINE認証をスタートさせる
        // 完了後はもう一度ダッシュボードに戻る（パラメータ付きで明示）
        await signIn('line', { callbackUrl: '/member/dashboard?action=link_line' });
    };

    return (
        <Button
            onClick={handleLinkLine}
            disabled={isLoading}
            className="w-full h-16 rounded-[1.5rem] bg-white hover:bg-emerald-50 border border-emerald-100 text-emerald-600 font-black text-sm tracking-widest uppercase transition-all active:scale-95 shadow-[0_10px_40px_rgba(16,185,129,0.08)] flex items-center justify-center gap-3"
        >
            <MessageCircle className="w-5 h-5" />
            {isLoading ? "PROCESING..." : "LINEと連携する"}
        </Button>
    );
}
