"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function ClearNextAuthSession() {
    useEffect(() => {
        // NextAuthのセッション（LINE連携用の一時的なもの）だけを削除
        // 画面リダイレクトはしません
        signOut({ redirect: false });
    }, []);

    return null;
}
