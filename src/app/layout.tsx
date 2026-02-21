import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swim Partners Manager",
  description: "Swim Partners 業務管理システム",
  manifest: "/manifest.json",
};

import AuthProvider from "@/components/providers/AuthProvider";
import { FluidWaterBackground } from "@/components/layout/FluidWaterBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`antialiased font-sans relative min-h-screen bg-white`}
      >
        <FluidWaterBackground />
        <AuthProvider>
          <div className="relative z-10">
            {children}
          </div>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
