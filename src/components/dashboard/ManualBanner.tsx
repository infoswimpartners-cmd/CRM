import { AlertTriangle, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ManualBanner() {
    return (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in-up">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
                    <BookOpen className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-bold text-orange-900 text-lg flex items-center gap-2">
                        【必読】コーチ運用マニュアル
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-medium">重要</span>
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                        振替ルールや指導報告の入力方法はこちらを確認してください
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
