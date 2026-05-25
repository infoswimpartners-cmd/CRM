import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "体験予約フォーム｜Swim Partners",
  description: "Swim Partners の体験レッスンお申し込みフォームです。",
};

export default function TrialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
