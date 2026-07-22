import { CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function BankAlertBanner({ userId }: { userId: string }) {
    const supabase = await createClient();

    // 口座情報の登録状況をチェック
    const key = `coach_bank:${userId}`;
    const { data: config } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', key)
        .single();

    let hasBankInfo = false;
    if (config?.value) {
        try {
            const parsed = JSON.parse(config.value);
            if (parsed.bank_name && parsed.account_number && parsed.account_holder_name) {
                hasBankInfo = true;
            }
        } catch { }
    }

    // すでに口座情報が登録されている場合は何も表示しない
    if (hasBankInfo) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in-up">
            <div className="flex items-start gap-3 min-w-0 w-full sm:w-auto">
                <div className="p-2.5 bg-red-100 rounded-lg text-red-600 shrink-0 mt-0.5">
                    <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-red-900 text-base flex items-center gap-2 flex-wrap">
                        【要設定】振込先口座情報が未登録です
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-medium shrink-0 animate-pulse">未登録</span>
                    </h3>
                    <p className="text-sm text-red-700 mt-1 break-words">
                        報酬を円滑にお支払いするため、振込先の銀行口座情報を登録してください。
                    </p>
                </div>
            </div>
            <Button asChild className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-none shadow-md shadow-red-200 shrink-0">
                <Link href="/settings#bank-info">
                    口座情報を登録する
                </Link>
            </Button>
        </div>
    );
}
