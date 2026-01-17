import { EarningsSummary } from "@/components/finance/EarningsSummary"
import { PaymentHistory } from "@/components/finance/PaymentHistory"
import { DollarSign } from "lucide-react"

export default function FinancePage() {
    return (
        <div className="p-8 space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-4">
                <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
                    <DollarSign className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">売上管理</h1>
                    <p className="text-slate-500 text-sm">報酬額や支払い状況を確認できます</p>
                </div>
            </div>

            {/* Earnings Summary */}
            <section>
                <EarningsSummary />
            </section>

            {/* Payment History */}
            <section>
                <PaymentHistory />
            </section>
        </div>
    )
}
