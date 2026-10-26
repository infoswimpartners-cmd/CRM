'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, ShieldCheck } from 'lucide-react'
import {
    BASIC_AGREEMENT,
    COMPENSATION_MEMORANDUM,
    COMPANY_INFO
} from '@/lib/constants/agreements'

interface CoachContractModalProps {
    agreedAt?: string | null
    buttonVariant?: 'outline' | 'default' | 'ghost'
    className?: string
}

export function CoachContractModal({ agreedAt, buttonVariant = 'outline', className }: CoachContractModalProps) {
    const [open, setOpen] = useState(false)

    const formatDate = (isoString?: string | null) => {
        if (!isoString) return null
        try {
            return new Date(isoString).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            })
        } catch {
            return isoString
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={buttonVariant} size="sm" className={`gap-1.5 ${className}`}>
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>業務委託契約書・覚書を確認</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-6">
                <DialogHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            契約内容の確認（控え）
                        </DialogTitle>
                        {agreedAt && (
                            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                                同意済 ({formatDate(agreedAt)})
                            </span>
                        )}
                    </div>
                    <DialogDescription className="text-xs text-slate-500">
                        Swim Partnersとの間で電磁的に合意された業務委託基本契約および報酬覚書の内容です。
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col mt-2">
                    <TabsList className="grid grid-cols-2 bg-slate-100 h-10">
                        <TabsTrigger value="basic" className="text-xs font-semibold">
                            業務委託契約書
                        </TabsTrigger>
                        <TabsTrigger value="memo" className="text-xs font-semibold">
                            報酬に関する覚書
                        </TabsTrigger>
                    </TabsList>

                    {/* 基本契約書 */}
                    <TabsContent value="basic" className="flex-1 overflow-y-auto mt-3 p-4 border rounded-xl bg-slate-50/40 text-xs sm:text-sm space-y-4">
                        <div className="text-center font-bold text-base text-slate-900 border-b pb-2">
                            {BASIC_AGREEMENT.title}
                        </div>
                        <p className="text-slate-600 leading-relaxed">{BASIC_AGREEMENT.preamble}</p>

                        {BASIC_AGREEMENT.articles.map((art, idx) => (
                            <div key={idx} className="space-y-1">
                                <h4 className="font-bold text-slate-900">{art.title}</h4>
                                {Array.isArray(art.content) ? (
                                    <div className="space-y-0.5 pl-2 text-slate-700">
                                        {art.content.map((c, i) => (
                                            <p key={i}>{c}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="pl-2 text-slate-700">{art.content}</p>
                                )}
                            </div>
                        ))}

                        <div className="pt-4 border-t space-y-1 text-xs text-slate-600">
                            <div>【甲】名称: {COMPANY_INFO.name} / 代表者: {COMPANY_INFO.representative}</div>
                            <div>所在地: 〒{COMPANY_INFO.postalCode} {COMPANY_INFO.address}</div>
                        </div>
                    </TabsContent>

                    {/* 覚書 */}
                    <TabsContent value="memo" className="flex-1 overflow-y-auto mt-3 p-4 border rounded-xl bg-slate-50/40 text-xs sm:text-sm space-y-4">
                        <div className="text-center font-bold text-base text-slate-900 border-b pb-2">
                            {COMPENSATION_MEMORANDUM.title}
                        </div>
                        <p className="text-slate-600 leading-relaxed">{COMPENSATION_MEMORANDUM.preamble}</p>

                        <div className="space-y-1">
                            <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.articles[0].title}</h4>
                            <div className="space-y-0.5 pl-2 text-slate-700">
                                {(COMPENSATION_MEMORANDUM.articles[0].content as string[]).map((c, i) => (
                                    <p key={i}>{c}</p>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.articles[1].title}</h4>
                            <p className="pl-2 text-slate-700">{COMPENSATION_MEMORANDUM.articles[1].content as string}</p>
                            <table className="w-full border-collapse border border-slate-200 text-xs my-2">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border p-2 text-left">平均件数</th>
                                        <th className="border p-2 text-left">報酬率</th>
                                        <th className="border p-2 text-left">ランク</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPENSATION_MEMORANDUM.slideTiers.map((tier, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="border p-1.5">{tier.monthlyAverage}</td>
                                            <td className="border p-1.5 font-bold text-blue-600">{tier.rewardRate}</td>
                                            <td className="border p-1.5">{tier.rank}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.article3.title}</h4>
                            <p className="pl-2 text-slate-700">{COMPENSATION_MEMORANDUM.article3.description}</p>
                            <table className="w-full border-collapse border border-slate-200 text-xs my-2">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border p-2 text-left">プラン名</th>
                                        <th className="border p-2 text-left">人数</th>
                                        <th className="border p-2 text-left">計算単価</th>
                                        <th className="border p-2 text-left">報酬額（50%時）</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPENSATION_MEMORANDUM.article3.table.map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="border p-1.5 font-medium">{r.planName}</td>
                                            <td className="border p-1.5">{r.attendees}</td>
                                            <td className="border p-1.5">{r.basePrice}</td>
                                            <td className="border p-1.5 font-bold">{r.coachReward50} {r.note && <span className="text-[10px] text-amber-600 font-normal">{r.note}</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-1">
                            <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.article4.title}</h4>
                            <p className="pl-2 text-slate-700">{COMPENSATION_MEMORANDUM.article4.content}</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
