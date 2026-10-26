'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    FileText,
    CheckCircle2,
    User,
    CreditCard,
    Sparkles,
    Loader2,
    ShieldCheck,
    Building2,
    Camera,
    ChevronRight,
    MapPin,
    AlertCircle,
    MessageSquare,
    Smartphone,
    ExternalLink,
    ShieldAlert
} from 'lucide-react'
import {
    BASIC_AGREEMENT,
    COMPENSATION_MEMORANDUM,
    COMPANY_INFO
} from '@/lib/constants/agreements'
import {
    agreeToCoachContracts,
    completeCoachOnboarding
} from '@/actions/coach-contract'
import { AreaStationPicker } from '@/components/forms/AreaStationPicker'

interface CoachOnboardingWizardProps {
    profile: {
        id: string
        full_name: string | null
        full_name_kana: string | null
        email: string
        phone_number?: string | null
        address?: string | null
        avatar_url: string | null
        base_area?: string | null
        line_admin_invite_url?: string | null
    }
    isDemo?: boolean
}

export function CoachOnboardingWizard({ profile, isDemo = false }: CoachOnboardingWizardProps) {
    const router = useRouter()
    const supabase = createClient()

    // ステップ管理: 1: 契約書同意, 2: プロフィール, 3: 口座情報, 4: 連絡ツール, 5: 完了
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1)
    const [loading, setLoading] = useState(false)

    // --- STEP 1: 契約同意フォーム ---
    const [signerName, setSignerName] = useState(profile.full_name || '')
    const [signerAddress, setSignerAddress] = useState(profile.address || '')
    const [agreedBasic, setAgreedBasic] = useState(false)
    const [agreedMemo, setAgreedMemo] = useState(false)

    // --- STEP 2: プロフィールフォーム ---
    const [profileData, setProfileData] = useState({
        full_name: profile.full_name || '',
        full_name_kana: profile.full_name_kana || '',
        phone_number: profile.phone_number || '',
        avatar_url: profile.avatar_url || '',
        base_area: profile.base_area || ''
    })
    const [uploadingAvatar, setUploadingAvatar] = useState(false)

    // --- STEP 3: 口座情報フォーム ---
    const [bankData, setBankData] = useState({
        bank_name: '',
        branch_name: '',
        account_type: '普通',
        account_number: '',
        account_holder_name: profile.full_name_kana || ''
    })

    // --- STEP 4: LINE管理者参加確認 ---
    const [lineAdminConfirmed, setLineAdminConfirmed] = useState(false)
    const rawLineAdminUrl = profile.line_admin_invite_url || (isDemo ? 'https://line.me/R/ti/p/demo-invite-admin' : null)
    // 安全なhttp/httpsスキームのみ許可（javascript: などの悪意あるURLスキームを遮断）
    const effectiveLineAdminUrl = rawLineAdminUrl && /^https?:\/\//i.test(rawLineAdminUrl.trim()) ? rawLineAdminUrl.trim() : null

    // STEP 1 の送信 (契約書同意)
    const handleAgreeContracts = async () => {
        if (!signerName.trim() || !signerAddress.trim()) {
            toast.error('署名者のお名前と現住所を入力してください。')
            return
        }
        if (!agreedBasic || !agreedMemo) {
            toast.error('業務委託契約書および報酬に関する覚書の双方にご同意ください。')
            return
        }

        if (isDemo) {
            toast.success('【デモ】契約同意ログの記録をシミュレーションしました')
            setProfileData(prev => ({ ...prev, full_name: signerName }))
            setCurrentStep(2)
            return
        }

        setLoading(true)
        try {
            const res = await agreeToCoachContracts({
                signerName,
                signerAddress
            })

            if (res.success) {
                toast.success('契約内容への同意ログを正常に記録しました')
                setProfileData(prev => ({
                    ...prev,
                    full_name: signerName
                }))
                setCurrentStep(2)
            } else {
                toast.error(res.error || '同意処理に失敗しました')
            }
        } catch (err: any) {
            toast.error('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // STEP 2 の写真アップロード
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return
            setUploadingAvatar(true)
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${profile.id}-${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }))
            toast.success('写真をアップロードしました')
        } catch (error: any) {
            toast.error('写真のアップロードに失敗しました: ' + error.message)
        } finally {
            setUploadingAvatar(false)
        }
    }

    // STEP 2 の送信 (プロフィール更新)
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profileData.full_name.trim()) {
            toast.error('お名前を入力してください')
            return
        }

        if (isDemo) {
            toast.success('【デモ】プロフィール保存をシミュレーションしました')
            setBankData(prev => ({
                ...prev,
                account_holder_name: prev.account_holder_name || profileData.full_name_kana || ''
            }))
            setCurrentStep(3)
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: profileData.full_name,
                    full_name_kana: profileData.full_name_kana || null,
                    phone_number: profileData.phone_number || null,
                    avatar_url: profileData.avatar_url || null,
                    base_area: profileData.base_area || null
                })
                .eq('id', profile.id)

            if (error) throw error

            toast.success('プロフィール情報を保存しました')
            setBankData(prev => ({
                ...prev,
                account_holder_name: prev.account_holder_name || profileData.full_name_kana || ''
            }))
            setCurrentStep(3)
        } catch (err: any) {
            toast.error('プロフィールの保存に失敗しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // STEP 3 の送信 (口座情報更新)
    const handleSaveBankInfo = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isDemo) {
            toast.success('【デモ】口座情報保存をシミュレーションしました')
            setCurrentStep(4)
            return
        }

        setLoading(true)

        try {
            // 口座情報が入力されている場合は保存
            if (bankData.bank_name && bankData.account_number) {
                const res = await fetch('/api/settings/bank', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bankData)
                })

                if (!res.ok) {
                    throw new Error('口座情報の保存に失敗しました')
                }
            }

            toast.success('口座情報を保存しました')
            setCurrentStep(4)
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    // STEP 5 の完了 (オンボーディング完了)
    const handleFinishOnboarding = async () => {
        if (isDemo) {
            toast.success('【デモ完了】実際のフローではダッシュボードが開放されます！')
            router.push('/admin/coaches')
            return
        }

        setLoading(true)
        try {
            const res = await completeCoachOnboarding()
            if (res.success) {
                toast.success('初期設定が完了しました！Swim Partnersへようこそ。')
                router.push('/coach')
                router.refresh()
            } else {
                toast.error(res.error || '完了処理に失敗しました')
            }
        } catch (err: any) {
            toast.error('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {isDemo && (
                <div className="p-3.5 bg-amber-500 text-white rounded-xl shadow-sm text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    【デモ検証モード】管理者による操作確認用です。実際のDBデータは更新されません。
                </div>
            )}

            {/* ヘッダー */}
            <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    Coach Onboarding
                </span>
                <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 leading-tight">
                    <span className="inline-block">コーチ初期セットアップ</span>
                </h1>
                <p className="text-xs sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
                    <span className="inline-block">Swim Partnersでの指導開始にあたり、</span>
                    <span className="inline-block">契約内容のご確認と</span>
                    <span className="inline-block">プロフィールの初期設定をお願いいたします。</span>
                </p>
            </div>

            {/* ステップインジケーター */}
            <div className="grid grid-cols-5 gap-1 sm:gap-3">
                {[
                    { step: 1, label: '契約・覚書', shortLabel: '契約', icon: FileText },
                    { step: 2, label: '基本情報', shortLabel: '基本', icon: User },
                    { step: 3, label: '振込口座', shortLabel: '口座', icon: CreditCard },
                    { step: 4, label: '連絡ツール', shortLabel: '連絡', icon: Smartphone },
                    { step: 5, label: '設定完了', shortLabel: '完了', icon: CheckCircle2 }
                ].map(({ step, label, shortLabel, icon: Icon }) => {
                    const isDone = currentStep > step
                    const isCurrent = currentStep === step
                    return (
                        <div
                            key={step}
                            className={`flex flex-col items-center justify-center py-2 px-1 sm:p-3 rounded-xl border text-center transition-all ${
                                isCurrent
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                    : isDone
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-white text-slate-400 border-slate-200'
                            }`}
                        >
                            <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full mb-1 text-xs font-bold shrink-0">
                                {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                                ) : (
                                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                                )}
                            </div>
                            <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap leading-tight">
                                <span className="sm:hidden">{step}.{shortLabel}</span>
                                <span className="hidden sm:inline">{step}. {label}</span>
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* ================= STEP 1: 契約書・覚書の確認と同意 ================= */}
            {currentStep === 1 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/60 border-b pb-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs sm:text-sm">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            STEP 1 / 5
                        </div>
                        <CardTitle className="text-base sm:text-xl text-slate-800 leading-snug">
                            <span className="inline-block">業務委託契約書 ＆</span>{' '}
                            <span className="inline-block">報酬に関する覚書の確認・同意</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm leading-relaxed text-slate-600">
                            <span className="inline-block">以下の2つの書類の内容をご確認いただき、</span>
                            <span className="inline-block">末尾の同意欄にチェックを入れてください。</span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 space-y-5 sm:space-y-6">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11 bg-slate-100 p-1">
                                <TabsTrigger value="basic" className="font-semibold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
                                    ① 契約書<span className="hidden sm:inline">（基本契約）</span>
                                </TabsTrigger>
                                <TabsTrigger value="memo" className="font-semibold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
                                    ② 覚書<span className="hidden sm:inline">（2026年6月改定）</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* ① 業務委託契約書 */}
                            <TabsContent value="basic" className="mt-4">
                                <div className="border rounded-xl p-5 bg-white max-h-[380px] overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700 shadow-inner">
                                    <div className="text-center pb-2 border-b">
                                        <h3 className="font-bold text-base sm:text-lg text-slate-900">{BASIC_AGREEMENT.title}</h3>
                                    </div>
                                    <p className="text-slate-600">{BASIC_AGREEMENT.preamble}</p>

                                    {BASIC_AGREEMENT.articles.map((art, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <h4 className="font-bold text-slate-900">{art.title}</h4>
                                            {Array.isArray(art.content) ? (
                                                <div className="space-y-0.5 pl-2">
                                                    {art.content.map((c, i) => (
                                                        <p key={i}>{c}</p>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="pl-2">{art.content}</p>
                                            )}
                                        </div>
                                    ))}

                                    <div className="pt-4 border-t space-y-2 text-xs text-slate-600">
                                        <div className="font-semibold">【契約締結元（甲）】</div>
                                        <div>名称: {COMPANY_INFO.name}</div>
                                        <div>代表者: {COMPANY_INFO.representative}</div>
                                        <div>所在地: 〒{COMPANY_INFO.postalCode} {COMPANY_INFO.address}</div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ② 報酬に関する覚書 */}
                            <TabsContent value="memo" className="mt-4">
                                <div className="border rounded-xl p-5 bg-white max-h-[380px] overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700 shadow-inner">
                                    <div className="text-center pb-2 border-b">
                                        <h3 className="font-bold text-base sm:text-lg text-slate-900">{COMPENSATION_MEMORANDUM.title}</h3>
                                    </div>
                                    <p className="text-slate-600">{COMPENSATION_MEMORANDUM.preamble}</p>

                                    {/* 第1条 */}
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.articles[0].title}</h4>
                                        <div className="space-y-0.5 pl-2">
                                            {(COMPENSATION_MEMORANDUM.articles[0].content as string[]).map((c, i) => (
                                                <p key={i}>{c}</p>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 第2条 スライド制 */}
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.articles[1].title}</h4>
                                        <p className="pl-2">{COMPENSATION_MEMORANDUM.articles[1].content as string}</p>

                                        <div className="overflow-x-auto my-2">
                                            <table className="w-full border-collapse border border-slate-200 text-xs">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-700">
                                                        <th className="border border-slate-200 px-3 py-2 text-left">1ヶ月あたりの平均件数</th>
                                                        <th className="border border-slate-200 px-3 py-2 text-left">報酬率（税込レッスン料に対して）</th>
                                                        <th className="border border-slate-200 px-3 py-2 text-left">評価ランク</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {COMPENSATION_MEMORANDUM.slideTiers.map((tier, i) => (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="border border-slate-200 px-3 py-1.5">{tier.monthlyAverage}</td>
                                                            <td className="border border-slate-200 px-3 py-1.5 font-semibold text-blue-600">{tier.rewardRate}</td>
                                                            <td className="border border-slate-200 px-3 py-1.5 font-medium">{tier.rank}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 第3条 レッスン報酬額 */}
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.article3.title}</h4>
                                        <p className="pl-2">{COMPENSATION_MEMORANDUM.article3.description}</p>

                                        <div className="overflow-x-auto my-2">
                                            <table className="w-full border-collapse border border-slate-200 text-xs">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-700">
                                                        <th className="border border-slate-200 px-3 py-2 text-left">プラン名</th>
                                                        <th className="border border-slate-200 px-3 py-2 text-left">受講人数</th>
                                                        <th className="border border-slate-200 px-3 py-2 text-left">計算単価</th>
                                                        <th className="border border-slate-200 px-3 py-2 text-left">コーチ報酬（50%の場合）</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {COMPENSATION_MEMORANDUM.article3.table.map((row, i) => (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="border border-slate-200 px-3 py-1.5 font-medium">{row.planName}</td>
                                                            <td className="border border-slate-200 px-3 py-1.5">{row.attendees}</td>
                                                            <td className="border border-slate-200 px-3 py-1.5">{row.basePrice}</td>
                                                            <td className="border border-slate-200 px-3 py-1.5 font-bold text-slate-800">
                                                                {row.coachReward50}
                                                                {row.note && <div className="text-[10px] text-amber-600 font-normal">{row.note}</div>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 第4条 */}
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-900">{COMPENSATION_MEMORANDUM.article4.title}</h4>
                                        <p className="pl-2">{COMPENSATION_MEMORANDUM.article4.content}</p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* 署名者情報入力（乙） */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
                            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                <User className="h-4 w-4 text-blue-600" />
                                署名者（受託者: 乙）情報の確認・入力
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="signerName" className="text-xs font-semibold text-slate-700">
                                        氏名（本名）<span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="signerName"
                                        value={signerName}
                                        onChange={(e) => setSignerName(e.target.value)}
                                        placeholder="例: 山田 太郎"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="signerAddress" className="text-xs font-semibold text-slate-700">
                                        現住所（番地・部屋番号まで）<span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="signerAddress"
                                        value={signerAddress}
                                        onChange={(e) => setSignerAddress(e.target.value)}
                                        placeholder="例: 東京都渋谷区〇〇 1-2-3 メゾン101"
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 同意チェックボックス */}
                        <div className="p-3.5 sm:p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                            <div className="flex items-start space-x-2.5 sm:space-x-3">
                                <Checkbox
                                    id="agreeBasic"
                                    checked={agreedBasic}
                                    onCheckedChange={(c) => setAgreedBasic(!!c)}
                                    className="mt-1 shrink-0"
                                />
                                <Label htmlFor="agreeBasic" className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed cursor-pointer select-none">
                                    <span className="inline-block">「業務委託契約書」の全文を確認し、</span>
                                    <span className="inline-block">内容を十分に理解した上で</span>
                                    <span className="inline-block">これに同意します。</span>
                                </Label>
                            </div>
                            <div className="flex items-start space-x-2.5 sm:space-x-3">
                                <Checkbox
                                    id="agreeMemo"
                                    checked={agreedMemo}
                                    onCheckedChange={(c) => setAgreedMemo(!!c)}
                                    className="mt-1 shrink-0"
                                />
                                <Label htmlFor="agreeMemo" className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed cursor-pointer select-none">
                                    <span className="inline-block">「報酬に関する覚書（2026年6月改定）」の</span>
                                    <span className="inline-block">報酬体系および算定基準を確認し、</span>
                                    <span className="inline-block">これに同意します。</span>
                                </Label>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-2 border-t border-blue-100 leading-relaxed">
                                <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <span>同意ボタンを押した日時、IPアドレス、端末情報が電磁的記録（契約同意ログ）として安全に保存されます。</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50/60 border-t py-4 px-4 sm:px-6 flex justify-end">
                        <Button
                            onClick={handleAgreeContracts}
                            disabled={loading || !agreedBasic || !agreedMemo || !signerName.trim() || !signerAddress.trim()}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-sm whitespace-nowrap text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    記録中...
                                </>
                            ) : (
                                <>
                                    規約に同意して次へ進む
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* ================= STEP 2: プロフィール情報の入力 ================= */}
            {currentStep === 2 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/60 border-b pb-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs sm:text-sm">
                            <User className="h-4 w-4 shrink-0" />
                            STEP 2 / 5
                        </div>
                        <CardTitle className="text-base sm:text-xl text-slate-800 leading-snug">
                            <span className="inline-block">コーチ基本プロフィールの登録</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm leading-relaxed text-slate-600">
                            <span className="inline-block">生徒様との連絡やマッチングに使用する</span>
                            <span className="inline-block">基本情報を登録してください。</span>
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSaveProfile}>
                        <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 space-y-5 sm:space-y-6">
                            {/* アイコン写真 */}
                            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border bg-slate-50/60">
                                <Avatar className="w-20 h-20 border-2 border-white shadow-md">
                                    <AvatarImage src={profileData.avatar_url || ''} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-bold">
                                        {profileData.full_name?.slice(0, 2) || '写真'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1.5 text-center sm:text-left flex-1">
                                    <Label className="text-xs font-semibold text-slate-700">プロフィール写真（顔写真）</Label>
                                    <p className="text-xs text-slate-500">
                                        生徒や保護者に安心感を与える明るい笑顔の写真を推奨します。
                                    </p>
                                    <div className="pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={uploadingAvatar}
                                            className="relative bg-white"
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            {uploadingAvatar ? (
                                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Camera className="mr-2 h-3.5 w-3.5" />
                                            )}
                                            {uploadingAvatar ? 'アップロード中...' : '写真を変更する'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* 氏名・フリガナ */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="full_name" className="text-xs font-semibold text-slate-700">
                                        お名前（漢字）<span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="full_name"
                                        value={profileData.full_name}
                                        onChange={(e) => setProfileData(p => ({ ...p, full_name: e.target.value }))}
                                        placeholder="例: 山田 太郎"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="full_name_kana" className="text-xs font-semibold text-slate-700">
                                        フリガナ（カタカナ）
                                    </Label>
                                    <Input
                                        id="full_name_kana"
                                        value={profileData.full_name_kana}
                                        onChange={(e) => setProfileData(p => ({ ...p, full_name_kana: e.target.value }))}
                                        placeholder="例: ヤマダ タロウ"
                                    />
                                </div>
                            </div>

                            {/* 電話番号 */}
                            <div className="space-y-1.5">
                                <Label htmlFor="phone_number" className="text-xs font-semibold text-slate-700">
                                    電話番号（連絡先）
                                </Label>
                                <Input
                                    id="phone_number"
                                    type="tel"
                                    value={profileData.phone_number}
                                    onChange={(e) => setProfileData(p => ({ ...p, phone_number: e.target.value }))}
                                    placeholder="例: 090-1234-5678"
                                    className="max-w-md bg-white"
                                />
                            </div>

                            {/* 基本活動エリア（都道府県・市区町村・路線・駅ピッカー） */}
                            <div className="space-y-2 pt-2 border-t">
                                <div>
                                    <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-blue-600" />
                                        基本活動エリア・最寄り駅の選択
                                    </Label>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        指導可能な都道府県・市区町村や、アクセスしやすい路線・駅を選択してください。
                                    </p>
                                </div>

                                <AreaStationPicker
                                    value={profileData.base_area}
                                    onChange={(newVal) => setProfileData(p => ({ ...p, base_area: newVal }))}
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50/60 border-t py-4 px-4 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCurrentStep(1)}
                                className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                                戻る
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || !profileData.full_name?.trim()}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-sm whitespace-nowrap text-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        保存中...
                                    </>
                                ) : (
                                    <>
                                        次へ進む（振込先設定）
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {/* ================= STEP 3: 報酬振込口座の登録 ================= */}
            {currentStep === 3 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/60 border-b pb-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs sm:text-sm">
                            <CreditCard className="h-4 w-4 shrink-0" />
                            STEP 3 / 5
                        </div>
                        <CardTitle className="text-base sm:text-xl text-slate-800 leading-snug">
                            <span className="inline-block">報酬振込口座（銀行口座）の登録</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm leading-relaxed text-slate-600">
                            <span className="inline-block">毎月のレッスン報酬をお支払いする</span>
                            <span className="inline-block">口座情報を入力してください。</span>
                            <span className="inline-block text-[11px] text-slate-400">（後から変更可能）</span>
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSaveBankInfo}>
                        <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="bank_name" className="text-xs font-semibold text-slate-700">
                                        金融機関名
                                    </Label>
                                    <Input
                                        id="bank_name"
                                        value={bankData.bank_name}
                                        onChange={(e) => setBankData(b => ({ ...b, bank_name: e.target.value }))}
                                        placeholder="例: 三菱UFJ銀行 / ゆうちょ銀行"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch_name" className="text-xs font-semibold text-slate-700">
                                        支店名 / 支店番号
                                    </Label>
                                    <Input
                                        id="branch_name"
                                        value={bankData.branch_name}
                                        onChange={(e) => setBankData(b => ({ ...b, branch_name: e.target.value }))}
                                        placeholder="例: 渋谷支店 (123)"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">口座種別</Label>
                                    <Select
                                        value={bankData.account_type}
                                        onValueChange={(val) => setBankData(b => ({ ...b, account_type: val }))}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="普通">普通</SelectItem>
                                            <SelectItem value="当座">当座</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="account_number" className="text-xs font-semibold text-slate-700">
                                        口座番号（半角数字）
                                    </Label>
                                    <Input
                                        id="account_number"
                                        value={bankData.account_number}
                                        onChange={(e) => setBankData(b => ({ ...b, account_number: e.target.value }))}
                                        placeholder="例: 1234567"
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="account_holder_name" className="text-xs font-semibold text-slate-700">
                                    口座名義（カタカナ）
                                </Label>
                                <Input
                                    id="account_holder_name"
                                    value={bankData.account_holder_name}
                                    onChange={(e) => setBankData(b => ({ ...b, account_holder_name: e.target.value }))}
                                    placeholder="例: ヤマダ タロウ"
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50/60 border-t py-4 px-4 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCurrentStep(2)}
                                className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                                戻る
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-sm whitespace-nowrap text-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        保存中...
                                    </>
                                ) : (
                                    <>
                                        次へ進む（連絡ツールの準備）
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {/* ================= STEP 4: 業務連絡ツールの準備 ================= */}
            {currentStep === 4 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/60 border-b pb-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs sm:text-sm">
                            <Smartphone className="h-4 w-4 shrink-0" />
                            STEP 4 / 5
                        </div>
                        <CardTitle className="text-base sm:text-xl text-slate-800 leading-snug">
                            <span className="inline-block">業務連絡ツールのセットアップ</span>{' '}
                            <span className="inline-block">（Googleチャット＆公式LINE）</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm leading-relaxed text-slate-600">
                            <span className="inline-block">円滑なレッスン運営のため、</span>
                            <span className="inline-block">本部連絡用ツールと</span>
                            <span className="inline-block">生徒連絡用アプリのご準備をお願いいたします。</span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 space-y-5 sm:space-y-6">
                        {/* ① Googleチャット案内 */}
                        <div className="p-4 sm:p-5 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                                        1. 【本部連絡用】Googleチャット
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">
                                        レッスン依頼・スケジュール調整・緊急連絡に使用
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs sm:text-sm text-slate-600 pl-0.5 space-y-2 leading-relaxed">
                                <p>
                                    面談完了後、事務局よりGoogleチャットの専用スペース招待をお送りいたします。<br />
                                    急な依頼を見逃さないよう、スマートフォンに<strong>「Google Chat」アプリ</strong>を入れ、通知を「常に許可」に設定してください。
                                </p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Button variant="outline" size="sm" asChild className="bg-white gap-1 text-xs whitespace-nowrap">
                                        <a href="https://apps.apple.com/jp/app/google-chat/id1163852619" target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            iOS（App Store）
                                        </a>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild className="bg-white gap-1 text-xs whitespace-nowrap">
                                        <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.dynamite" target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            Android（Google Play）
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* ② 公式LINEの管理者追加 ＆ アプリ案内 */}
                        <div className="p-4 sm:p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm shrink-0">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm sm:text-base flex flex-wrap items-center gap-1.5 leading-snug">
                                        <span>2. 【生徒連絡用】公式LINE</span>
                                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] whitespace-nowrap">
                                            重要ステップ
                                        </Badge>
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">
                                        生徒・保護者様とのレッスン前のご挨拶・待ち合わせ連絡に使用
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs sm:text-sm text-slate-600 space-y-3 leading-relaxed">
                                {/* 管理者招待URLブロック */}
                                {effectiveLineAdminUrl ? (
                                    <div className="p-3.5 sm:p-4 bg-white rounded-xl border-2 border-emerald-300 shadow-sm space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-bold text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5 leading-snug">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                    <span className="inline-block">【STEP 4-1】</span>{' '}
                                                    <span className="inline-block">公式LINEの管理者アカウントに追加</span>
                                                </div>
                                                <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                                                    <span className="inline-block">あなた専用の公式LINEアカウントを用意いたしました。</span>
                                                    <span className="inline-block">下のボタンから管理者に参加してください。</span>
                                                </p>
                                            </div>
                                            {isDemo && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] shrink-0 whitespace-nowrap">
                                                    デモURL表示中
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="pt-1">
                                            <Button
                                                asChild
                                                className="w-full sm:w-auto bg-[#06C755] hover:bg-[#05b34c] text-white font-bold h-11 px-4 sm:px-6 rounded-xl shadow-md gap-2 whitespace-nowrap text-xs sm:text-sm"
                                            >
                                                <a href={effectiveLineAdminUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                                    <span>公式LINEの管理者に参加する（別タブ）</span>
                                                </a>
                                            </Button>
                                        </div>

                                        <div className="flex items-start space-x-2 pt-2 border-t border-slate-100">
                                            <Checkbox
                                                id="line-admin-confirm"
                                                checked={lineAdminConfirmed}
                                                onCheckedChange={(checked) => setLineAdminConfirmed(checked === true)}
                                                className="mt-0.5 shrink-0 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                            />
                                            <label
                                                htmlFor="line-admin-confirm"
                                                className="text-xs font-semibold text-slate-800 cursor-pointer select-none leading-relaxed"
                                            >
                                                <span className="inline-block">公式LINEの管理者招待を開き、</span>
                                                <span className="inline-block">参加承認（管理者追加）を完了しました</span>
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-white rounded-lg border border-emerald-200/70 space-y-1">
                                        <div className="font-semibold text-emerald-800 text-xs sm:text-sm">
                                            📌 コーチ専用公式LINEアカウントの発行について
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            事務局にてコーチ専用の「LINE公式アカウント」を開設準備中です。開設後に管理者追加（参加用）のURLが届き次第、承認をお願いいたします。
                                        </p>
                                    </div>
                                )}

                                {/* スマホアプリのダウンロード */}
                                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                                    <div className="font-semibold text-slate-800 text-xs sm:text-sm leading-snug">
                                        <span className="inline-block">【STEP 4-2】</span>{' '}
                                        <span className="inline-block">スマホ管理アプリのダウンロード</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        生徒様からのメッセージを受信・返信できるよう、スマートフォンへ管理用アプリのダウンロードをお願いいたします。
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Button variant="outline" size="sm" asChild className="bg-white gap-1 text-xs border-emerald-300 hover:bg-emerald-50 whitespace-nowrap">
                                            <a href="https://apps.apple.com/jp/app/line-official-account/id1451478954" target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                iOS（App Store）
                                            </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild className="bg-white gap-1 text-xs border-emerald-300 hover:bg-emerald-50 whitespace-nowrap">
                                            <a href="https://play.google.com/store/apps/details?id=com.linecorp.lineoa" target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                Android（Google Play）
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* コンプライアンス注意喚起 */}
                            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-800 flex items-start gap-2 leading-relaxed">
                                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">重要（直接取引・私的連絡の禁止）: </span>
                                    個人LINEの直接交換は契約条項に基づき禁止されています。生徒様との連絡は必ず専用の公式LINEをご使用ください。
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50/60 border-t py-4 px-4 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCurrentStep(3)}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                        >
                            戻る
                        </Button>
                        <Button
                            onClick={() => {
                                if (effectiveLineAdminUrl && !lineAdminConfirmed) {
                                    toast.info('公式LINEへの管理者参加がまだの場合は、ボタンから参加をお願いいたします。')
                                }
                                setCurrentStep(5)
                            }}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-sm whitespace-nowrap text-sm"
                        >
                            確認しました（完了画面へ）
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* ================= STEP 5: 完了画面 ================= */}
            {currentStep === 5 && (
                <Card className="border-emerald-200 bg-gradient-to-b from-white to-emerald-50/30 shadow-md">
                    <CardContent className="pt-8 sm:pt-10 pb-8 px-4 sm:px-6 text-center space-y-6">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                            <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
                        </div>

                        <div className="space-y-2 max-w-md mx-auto">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-snug">
                                <span className="inline-block">初期セットアップが</span>
                                <span className="inline-block">完了しました！</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                <span className="inline-block">契約同意および基本プロフィールの</span>
                                <span className="inline-block">登録が正常に完了しました。</span><br className="hidden sm:inline" />
                                <span className="inline-block">ダッシュボードから稼働可能枠の登録や</span>
                                <span className="inline-block">スケジュールの管理を行っていただけます。</span>
                            </p>
                        </div>

                        <div className="max-w-md mx-auto p-4 rounded-xl bg-white border border-slate-200 text-left space-y-2 text-xs text-slate-600 leading-relaxed">
                            <div className="font-bold text-slate-700 pb-1 border-b">登録概要</div>
                            <div>・業務委託契約書: <span className="text-emerald-600 font-semibold">同意完了</span></div>
                            <div>・報酬に関する覚書: <span className="text-emerald-600 font-semibold">同意完了</span></div>
                            <div>・受託者氏名: <span className="font-medium text-slate-800">{signerName}</span></div>
                            <div>・振込口座: <span className="font-medium text-slate-800">{bankData.bank_name ? `${bankData.bank_name} ${bankData.branch_name}` : '未登録（後からマイページで設定可能）'}</span></div>
                            <div>・業務連絡ツール: <span className="text-emerald-600 font-semibold">Googleチャット ＆ 公式LINE準備完了</span></div>
                        </div>

                        <div className="pt-2 sm:pt-4">
                            <Button
                                onClick={handleFinishOnboarding}
                                disabled={loading}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 rounded-xl shadow-md text-sm sm:text-base whitespace-nowrap"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        ダッシュボードを開いています...
                                    </>
                                ) : (
                                    <>
                                        ダッシュボードをはじめる
                                        <ChevronRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
