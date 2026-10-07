import { ReactNode } from "react";

/**
 * TrioDashboardLayout
 * 親レイアウト (src/app/trio/layout.tsx) とのヘッダー・ボトムナビの二重描画を解消するため、
 * 子要素をそのまま透過するパススルーレイアウトとします。
 */
export default function TrioDashboardLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
