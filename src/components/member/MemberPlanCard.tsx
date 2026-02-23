import { endOfMonth, addMonths, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CreditCard, Calendar, Info } from 'lucide-react'

interface MemberPlanCardProps {
    student: {
        id: string
        membership_type_id: string | null
        plan_start_date?: string | null
        billing_cycle_start?: string | null
    }
    membershipType: {
        id: string
        name: string
        lesson_count_per_month: number
        unit_price: number
    } | null
}

/**
 * 会員のプラン情報カード
 * 月会費プランの場合、振替有効期限（翌月末まで）を表示
 */
export default function MemberPlanCard({ student, membershipType }: MemberPlanCardProps) {
    /** 振替有効期限：翌月末 */
    const getTransferDeadline = (): string => {
        const nextMonthEnd = endOfMonth(addMonths(new Date(), 1))
        return format(nextMonthEnd, 'yyyy年M月d日', { locale: ja })
    }

    const isMonthlyPlan = membershipType && membershipType.lesson_count_per_month > 0
    const transferDeadline = isMonthlyPlan ? getTransferDeadline() : null

    if (!membershipType) {
        return (
            <div className="glass-card p-5 border-dashed border-2 border-gray-200 bg-white/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-xl">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-600">プラン未設定</p>
                        <p className="text-xs text-gray-400 mt-0.5">担当コーチにご連絡ください</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="glass-card p-5 relative overflow-hidden">
            {/* デコレーション */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-blue-50/80 blur-xl" />

            <div className="relative z-10 space-y-4">
                {/* プラン名 */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-xl">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Plan</p>
                            <h3 className="font-black text-gray-800">{membershipType.name}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400">月額</p>
                        <p className="font-black text-gray-800">
                            ¥{membershipType.unit_price.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* 月回数 */}
                <div className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
                    <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                        <p className="text-xs text-gray-500">月あたりのレッスン回数</p>
                        <p className="font-bold text-gray-800 text-sm">
                            月{membershipType.lesson_count_per_month}回
                        </p>
                    </div>
                </div>

                {/* 振替有効期限（月会費プランのみ表示） */}
                {isMonthlyPlan && transferDeadline && (
                    <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-amber-700">振替有効期限</p>
                            <p className="text-sm font-black text-amber-800">{transferDeadline}</p>
                            <p className="text-[10px] text-amber-600 mt-0.5">
                                今月のレッスンを振り替える場合、この日までにご利用ください
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
