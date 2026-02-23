import { AlertTriangle, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ManualBanner() {
    return (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in-up">
            <div className="flex items-start gap-3 min-w-0 w-full sm:w-auto">
                <div className="p-2.5 bg-orange-100 rounded-lg text-orange-600 shrink-0 mt-0.5">
                    <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-orange-900 text-base flex items-center gap-2 flex-wrap">
                        【必読】コーチ運用マニュアル
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-medium shrink-0">重要</span>
                    </h3>
                    <p className="text-sm text-orange-700 mt-1 break-words">
                        振替ルールや指導報告の入力方法は<br className="hidden sm:block" />こちらをご確認ください
                    </p>
                </div>
            </div>
            <Button asChild className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white border-none shadow-md shadow-orange-200 shrink-0">
                <Link href="/coach/manual" target="_blank">
                    マニュアルを確認する
                </Link>
            </Button>
        </div>
    );
}
