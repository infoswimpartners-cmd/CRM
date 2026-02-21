'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react'

interface Transaction {
    id: string;
    change_amount: number;
    reason: string | null;
    created_at: string;
}

export default function TransactionHistory({ transactions }: { transactions: Transaction[] }) {
    if (transactions.length === 0) {
        return (
            <div className="glass-card p-8 text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>履歴はありません</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {transactions.map((tx) => {
                const isPositive = tx.change_amount > 0
                return (
                    <div key={tx.id} className="glass-card p-4 flex items-center justify-between group hover:bg-white/90">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                {isPositive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 text-sm">
                                    {tx.reason || (isPositive ? '購入/付与' : 'レッスン消化')}
                                </p>
                                <p className="text-xs text-gray-400 font-mono">
                                    {format(new Date(tx.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                </p>
                            </div>
                        </div>
                        <div className={`text-lg font-black ${isPositive ? 'text-blue-600' : 'text-gray-500'}`}>
                            {isPositive ? '+' : ''}{tx.change_amount}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
