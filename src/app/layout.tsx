import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swim Partners Manager",
  description: "Swim Partners 業務管理システム",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`antialiased font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
