"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

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
            className="bg-white text-emerald-600 hover:bg-emerald-50 w-full rounded-2xl h-12 font-black text-sm shadow-lg active:scale-95 transition-all mt-2 cursor-pointer"
        >
            {isLoading ? "連携処理中..." : "LINEと連携する"}
        </Button>
    );
}
