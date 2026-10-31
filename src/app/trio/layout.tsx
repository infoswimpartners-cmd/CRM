import { ReactNode } from "react";
import { redirect } from "next/navigation";

/**
 * TrioPublicLayout
 * トリオグループレッスン機能は現在非表示のため、マイページへリダイレクト
 */
export default function TrioPublicLayout({ children }: { children: ReactNode }) {
    redirect('/member/dashboard');
}
