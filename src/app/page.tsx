import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import {
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Video,
  CreditCard,
  ArrowRight,
  Clock,
  Users,
  Award,
  HelpCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  Phone,
  Waves
} from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session
  let user = null

  if (session) {
    const { data: userData } = await supabase.auth.getUser()
    user = userData?.user
  }

  // 1. ログイン済みユーザーのリダイレクト判定（既存動作を100%保持）
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'owner') {
      redirect('/admin')
    } else if (profile?.role === 'coach') {
      redirect('/coach')
    }

    // 生徒（会員）の判定
    const student = await getStudentProfile(supabase, user.id)
    if (student) {
      redirect('/member/dashboard')
    }

    // 役割未設定時のフォールバック
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">アカウント設定が必要です</h1>
        <p className="mb-8 text-slate-600">あなたのユーザーには役割（Role）が割り当てられていません。管理者に連絡してください。</p>
        <Button onClick={async () => {
          'use server'
          try {
            const supabase = await createClient()
            await supabase.auth.signOut()
          } catch (e) {
            console.error('SignOut error:', e)
          }
          redirect('/')
        }}>
          ログアウト
        </Button>
      </div>
    )
  }

  // 2. 未ログイン一般ユーザー向け公開トップページLP（高CVR最適化）
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-sky-100 selection:text-sky-900 font-sans">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-sm shadow-sky-200">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">Swim Partners</span>
              <span className="block text-[10px] font-medium text-sky-600 -mt-1 tracking-wider">水泳個人レッスン・公営プール出張</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-sky-600 transition-colors">4大強み</a>
            <a href="#comparison" className="hover:text-sky-600 transition-colors">他社比較</a>
            <a href="#areas" className="hover:text-sky-600 transition-colors">出張エリア</a>
            <a href="#pricing" className="hover:text-sky-600 transition-colors">料金案内</a>
            <a href="#flow" className="hover:text-sky-600 transition-colors">受講の流れ</a>
            <a href="#faq" className="hover:text-sky-600 transition-colors">よくある質問</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors px-2 py-1"
            >
              関係者ログイン
            </Link>
            <Button asChild className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-100 text-sm font-bold rounded-full px-5">
              <Link href="/trial">体験予約</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero（ファーストビュー） */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24 bg-gradient-to-b from-sky-50/70 via-white to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* 安心・実績バッジ */}
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-sky-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-sky-500" />
              <span>近所の公営プールでプロの完全専任マンツーマン指導</span>
            </div>

            {/* メインキャッチコピー */}
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.25] sm:leading-[1.2]">
              水泳がもっと好きになる。<br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                完全専任マンツーマン
              </span>で<br />
              みるみる上達を実感
            </h1>

            {/* サブコピー */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              水嫌い・顔つけが苦手なお子様から、25m完泳、大人のフォーム改善・マスターズまで。
              毎回同じ専任コーチが、ご自宅近くの公営プールに出張指導します。
            </p>

            {/* 4大安心バッジ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2 text-left">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <ShieldCheck className="h-5 w-5 text-sky-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 leading-tight">完全専任制<br /><span className="text-[10px] font-normal text-slate-500">担当が毎回同じ</span></span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <MapPin className="h-5 w-5 text-sky-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 leading-tight">近所プール出張<br /><span className="text-[10px] font-normal text-slate-500">送迎負担ゼロ</span></span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <Video className="h-5 w-5 text-sky-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 leading-tight">毎回の動画カルテ<br /><span className="text-[10px] font-normal text-slate-500">水中動画で成長可視化</span></span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <CreditCard className="h-5 w-5 text-sky-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 leading-tight">入会金0円・明朗会計<br /><span className="text-[10px] font-normal text-slate-500">指名料・年会費なし</span></span>
              </div>
            </div>

            {/* CTAボタングループ */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 bg-sky-500 hover:bg-sky-600 text-white rounded-full text-base sm:text-lg font-bold shadow-lg shadow-sky-200/60 transition-all hover:scale-[1.02]">
                <Link href="/trial" className="flex items-center justify-center gap-2">
                  <span>体験レッスンを予約する（60分）</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-6 rounded-full text-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-50">
                <a href="#areas">出張対応エリアを確認</a>
              </Button>
            </div>

            {/* キャンペーン案内 */}
            <div className="inline-block bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs sm:text-sm text-amber-800">
              🎁 <strong>お友達紹介キャンペーン実施中</strong>：ご紹介でお申し込みの場合、初回体験が<strong>特別価格 3,500円</strong>（通常 6,000円）！
            </div>
          </div>
        </div>
      </section>

      {/* 4大強みセクション（差別化の明確化） */}
      <section id="features" className="py-16 md:py-24 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Why Swim Partners</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Swim Partners が選ばれる4つの圧倒的な理由
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              大手のグループレッスンや他社個人スクールにはない、徹底した受講者ファーストのこだわり。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 強み1 */}
            <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 font-bold text-lg">
                    01
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-600">担当コーチ固定</span>
                    <h3 className="text-lg font-bold text-slate-900">安心の完全専任マンツーマン</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  毎回担当が変わる一般的なスクールと異なり、専任コーチが継続して担当。性格や癖、前回の課題を正確に把握しているため、無駄な確認時間がなく最短で苦手を克服できます。
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">毎回同じコーチ</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">人見知りのお子様も安心</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">一人ひとりに合わせた指導</span>
                </div>
              </CardContent>
            </Card>

            {/* 強み2 */}
            <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 font-bold text-lg">
                    02
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-600">通学の負担ゼロ</span>
                    <h3 className="text-lg font-bold text-slate-900">近所の公営プールへ出張指導</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  遠くのスイミングスクールへ通う送迎の手間はありません。ご自宅や学校の近くにある公営温水プールへコーチが出張。通い慣れた身近な施設でリラックスして受講できます。
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">送迎ストレス解消</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">プール施設利用料も実費のみ</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">最寄り駅からの提案対応</span>
                </div>
              </CardContent>
            </Card>

            {/* 強み3 */}
            <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 font-bold text-lg">
                    03
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-600">成果が見える化</span>
                    <h3 className="text-lg font-bold text-slate-900">毎回の動画カルテ＆進捗分析</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  レッスン毎に水中の泳ぎを撮影し、プロの視点でフォームを解説したデジタルカルテを発行。どこが良くなったか、次回は何を直すかが一目でわかり、上達の実感が湧きます。
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">スマホでいつでも閲覧</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">水中のフォーム改善</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">保護者の方も安心</span>
                </div>
              </CardContent>
            </Card>

            {/* 強み4 */}
            <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 font-bold text-lg">
                    04
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-600">圧倒的な安心感</span>
                    <h3 className="text-lg font-bold text-slate-900">入会金0円・透明な料金体系</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  入会金や年会費、更新料は一切不要。不明瞭なコーチ指名料や別途交通費の請求もありません。レッスン受講分だけの明朗会計で、どなたでも安心して継続していただけます。
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">入会金・年会費 0円</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">コーチ指名料 0円</span>
                  <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-md font-medium">追加交通費請求なし</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 一般水泳スクールとの徹底比較表 */}
      <section id="comparison" className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Comparison</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              他の水泳教室・スクールとの徹底比較
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              泳ぐ時間、担当の一貫性、料金の透明性。比べてわかるSwim Partnersの質の高さ。
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 font-bold text-slate-700 w-1/4">比較項目</th>
                  <th className="p-4 font-bold text-slate-500 w-1/4">一般のスイミングスクール<br /><span className="text-xs font-normal text-slate-400">（グループレッスン）</span></th>
                  <th className="p-4 font-bold text-slate-500 w-1/4">大手個人レッスン会社<br /><span className="text-xs font-normal text-slate-400">（一般的なマンツーマン）</span></th>
                  <th className="p-4 font-bold text-sky-700 bg-sky-50/70 border-x border-sky-200 w-1/4">
                    Swim Partners<br /><span className="text-xs font-semibold text-sky-600">（当スクール）</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">指導形式・密度</td>
                  <td className="p-4 text-slate-600">1対10人以上<br /><span className="text-xs text-slate-400">泳ぐ時間は実質10分未満</span></td>
                  <td className="p-4 text-slate-600">1対1マンツーマン</td>
                  <td className="p-4 font-bold text-sky-700 bg-sky-50/40 border-x border-sky-200">
                    完全専任マンツーマン<br /><span className="text-xs font-normal text-sky-600">60分みっちり泳げて質問し放題</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">担当コーチ</td>
                  <td className="p-4 text-slate-600">クラスごとに交代・未定</td>
                  <td className="p-4 text-slate-600">毎回変わる（固定は高額な指名料）</td>
                  <td className="p-4 font-bold text-sky-700 bg-sky-50/40 border-x border-sky-200">
                    完全専任制（固定・指名料0円）<br /><span className="text-xs font-normal text-sky-600">課題や性格を深く把握して指導</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">受講場所</td>
                  <td className="p-4 text-slate-600">指定校舎のみ（送迎が必須）</td>
                  <td className="p-4 text-slate-600">提携プール限定、または遠方</td>
                  <td className="p-4 font-bold text-sky-700 bg-sky-50/40 border-x border-sky-200">
                    近所の公営温水プールへ出張<br /><span className="text-xs font-normal text-sky-600">自宅近くで送迎ストレスゼロ</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">水中動画カルテ</td>
                  <td className="p-4 text-slate-600">なし（進級テスト判定のみ）</td>
                  <td className="p-4 text-slate-600">別料金または口頭アドバイスのみ</td>
                  <td className="p-4 font-bold text-sky-700 bg-sky-50/40 border-x border-sky-200">
                    毎回の水中動画カルテ無料提供<br /><span className="text-xs font-normal text-sky-600">スマホで成長を動画確認できる</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">諸費用・料金体系</td>
                  <td className="p-4 text-slate-600">入会金1〜2万円＋年会費＋指定水着代</td>
                  <td className="p-4 text-slate-600">入会金＋交通費実費請求＋指名料</td>
                  <td className="p-4 font-bold text-sky-700 bg-sky-50/40 border-x border-sky-200">
                    入会金・年会費・指名料 0円<br /><span className="text-xs font-normal text-sky-600">受講料のみの完全明朗会計</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">日程の柔軟性</td>
                  <td className="p-4 text-slate-600">曜日・時間固定（振替制限あり）</td>
                  <td className="p-4 text-slate-600">空き枠が少なく調整難</td>
                  <td className="p-4 font-bold text-sky-700 bg-sky-50/40 border-x border-sky-200">
                    土日・平日夕方など柔軟調整可能<br /><span className="text-xs font-normal text-sky-600">コーチと直接スムーズに日程設定</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 出張対応エリア ＆ 公営プール案内 */}
      <section id="areas" className="py-16 md:py-24 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Service Areas</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              出張対応主要エリア ＆ 近隣公営プール
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              東京都・神奈川県・千葉県の各公営プールへ出張対応。最寄り駅をお伝えいただければ最適な施設をご提案します。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 品川エリア */}
            <Card className="border-slate-200 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 font-semibold">東京都品川区</Badge>
                  <MapPin className="h-4 w-4 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">品川エリア</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  品川健康センター、日野学園温水プール、荏原文化センターなど、品川区内の利便性の高い公営プールへ出張指導。
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50">
                  <Link href="/personal_swim/shinagawa" className="flex items-center justify-center gap-1">
                    品川エリア専用案内を見る <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* 目黒エリア */}
            <Card className="border-slate-200 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 font-semibold">東京都目黒区</Badge>
                  <MapPin className="h-4 w-4 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">目黒エリア</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  目黒区民センター屋内プール、碑文谷体育館温水プール、八雲体育館など、落ち着いた環境で受講可能。
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50">
                  <Link href="/personal_swim/meguro" className="flex items-center justify-center gap-1">
                    目黒エリア専用案内を見る <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* 世田谷エリア */}
            <Card className="border-slate-200 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 font-semibold">東京都世田谷区</Badge>
                  <MapPin className="h-4 w-4 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">世田谷エリア</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  世田谷総合運動場温水プール、烏山区民センター、玉川中学校温水プールなど、広々とした施設が充実。
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50">
                  <Link href="/personal_swim/setagaya" className="flex items-center justify-center gap-1">
                    世田谷エリア専用案内を見る <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* 横浜エリア */}
            <Card className="border-slate-200 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 font-semibold">神奈川県横浜市</Badge>
                  <MapPin className="h-4 w-4 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">横浜エリア</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  横浜国際プール、港北スポーツセンター、都筑プール、西スポーツセンターなど、主要各区の温水プールへ出張。
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50">
                  <Link href="/personal_swim/yokohama" className="flex items-center justify-center gap-1">
                    横浜エリア専用案内を見る <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* 船橋エリア */}
            <Card className="border-slate-200 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 font-semibold">千葉県船橋市</Badge>
                  <MapPin className="h-4 w-4 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">船橋エリア</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  船橋市運動公園プール、グラスポ法典公園など、船橋・西船橋近隣の公営プールに対応。
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50">
                  <Link href="/personal_swim/funabashi" className="flex items-center justify-center gap-1">
                    船橋エリア専用案内を見る <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* 浦安エリア */}
            <Card className="border-slate-200 shadow-xs hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 font-semibold">千葉県浦安市</Badge>
                  <MapPin className="h-4 w-4 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">浦安エリア</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  浦安市運動公園屋内水泳プールなど、設備が充実した綺麗な施設で集中してレッスンを受けられます。
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold border-sky-200 text-sky-700 hover:bg-sky-50">
                  <Link href="/personal_swim/urayasu" className="flex items-center justify-center gap-1">
                    浦安エリア専用案内を見る <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>

          <div className="mt-8 text-center bg-white p-6 rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-700 font-medium">
              💡 <strong>上記以外のエリア（大田区、港区、江東区、川崎市、千葉市など）も随時出張可能です。</strong><br className="hidden sm:inline" />
              ご自宅の最寄り駅を体験予約フォームにてお知らせいただければ、近隣で最適な公営プールをご提案します。
            </p>
          </div>
        </div>
      </section>

      {/* 料金案内 */}
      <section id="pricing" className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Pricing</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              明朗・安心の料金プラン
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              入会金・年会費は永久0円。受講分のみの透明な価格設定です。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 体験レッスンカード */}
            <Card className="border-2 border-sky-500 shadow-md shadow-sky-100 rounded-2xl overflow-hidden relative">
              <div className="bg-sky-500 text-white text-xs font-bold py-1.5 px-4 text-center">
                まずはお気軽に！初回限定プラン
              </div>
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">体験レッスン（60分）</h3>
                  <p className="text-xs text-slate-500 mt-1">完全マンツーマン指導 ＋ 水中動画カルテ付き</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-sky-600">6,000</span>
                  <span className="text-sm font-bold text-slate-600">円（税込）</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span>🎁</span> お友達紹介特別価格: 3,500円（税込）
                  </div>
                  <p className="text-[11px] text-amber-700">ご紹介者様のお名前をご記入いただくと、特別価格が適用されます。</p>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" /> 60分間のマンツーマン実技レッスン</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" /> コーチによる水中動画の撮影・分析</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" /> 上達のためのアドバイスカルテ進呈</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" /> 入会の強引な勧誘は一切ありません</li>
                </ul>
                <Button asChild className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full font-bold h-12 shadow-md shadow-sky-100">
                  <Link href="/trial">体験レッスンを予約する</Link>
                </Button>
              </CardContent>
            </Card>

            {/* 通常レッスンカード */}
            <Card className="border border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-slate-50/50">
              <div className="bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-4 text-center">
                継続コース（都度払い・回数券対応）
              </div>
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">通常レッスン（60分）</h3>
                  <p className="text-xs text-slate-500 mt-1">専任コーチによる継続個別トレーニング</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-800">8,800</span>
                  <span className="text-sm font-bold text-slate-600">円〜 / 回（税込）</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                  月謝制またはお得な回数券（4回・8回）もご用意。目的や通学頻度（毎週・隔週・月1回など）に合わせて柔軟にお選びいただけます。
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 入会金・年会費・更新料 0円</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 専任コーチ指名料 0円</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 毎回の動画カルテ発行</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 兄弟・友達とのペア受講割引あり</li>
                </ul>
                <div className="pt-2 text-center text-xs text-slate-500">
                  ※別途プール入場料（一般200〜500円程度）のみ現地にてご負担いただきます。
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 受講の流れ */}
      <section id="flow" className="py-16 md:py-24 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">Flow</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              受講までの流れ（かんたん3ステップ）
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              WebまたはLINEから60秒でお申し込み完了。あとはプールへ向かうだけ。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-black text-sm">
                STEP 1
              </div>
              <h3 className="text-base font-bold text-slate-900">体験予約フォームの送信</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ご希望の日時、最寄り駅、現在の泳力や目標をフォームに入力して送信（所要時間約60秒）。LINEでもWebでもそのまま申込可能です。
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-black text-sm">
                STEP 2
              </div>
              <h3 className="text-base font-bold text-slate-900">日時・プールの確定</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                24時間以内に担当スタッフまたはコーチよりご連絡。ご希望に合わせた近隣公営プールと集合場所をご案内し、日時を確定します。
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-black text-sm">
                STEP 3
              </div>
              <h3 className="text-base font-bold text-slate-900">当日レッスン受講＆カルテ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                当日はプール施設にて待ち合わせ。専任コーチが60分マンツーマンで指導。終了後は水中動画カルテで改善点を確認いただけます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* よくある質問（FAQ） */}
      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest">FAQ</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              よくあるご質問
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              体験レッスンや指導内容について、よくいただくご質問にお答えします。
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-sky-500 shrink-0" />
                まったく泳げない・水が怖い子どもでも受講できますか？
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                はい、大歓迎です。水慣れや顔つけ、潜るのが苦手なお子様の指導経験が豊富なコーチが担当します。無理強いせず、安心できる信頼関係を築きながら楽しくステップアップしていきます。
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-sky-500 shrink-0" />
                具体的なプールが決まっていなくても申し込めますか？
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                はい、ご安心ください。フォームにご自宅の最寄り駅やエリアをご入力いただければ、事務局より近隣の利用可能な公営温水プール（アクセス・設備・水温など）をいくつかご提案いたします。
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-sky-500 shrink-0" />
                大人の受講やマスターズ対策も可能ですか？
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                はい、大人の方の受講も非常に多くいただいております。「きれいなフォームで楽に長く泳ぎたい」「マスターズ大会でベストタイムを出したい」「トライアスロン対策」など、大人の目的に合わせた高度な技術指導も可能です。
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-sky-500 shrink-0" />
                2人同時（兄弟・親子・お友達）での体験受講はできますか？
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                はい、可能です。体験予約フォームに「2人目の情報」を入力いただけるトグルがございますので、そちらにご記入ください。ペア受講向けの特別価格案内もございます。
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-sky-500 shrink-0" />
                入会金や年会費、交通費などの追加費用はかかりますか？
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                入会金、年会費、コーチ指名料、出張交通費は一切いただきません。お客様にご負担いただくのは「レッスン受講料」と「現地プール入場料（実費200〜500円程度）」のみとなります。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ボトムCTA */}
      <section className="py-16 md:py-20 bg-gradient-to-tr from-sky-600 to-cyan-600 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <Badge className="bg-white/20 text-white hover:bg-white/20 border-none px-3 py-1 text-xs">
            安心の完全専任マンツーマン
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            まずは60分の体験レッスンで、<br />
            泳げる楽しさと上達を実感しませんか？
          </h2>
          <p className="text-sky-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            ご希望の日時と最寄り駅を入力するだけ（所要時間約60秒）。
            専任コーチがあなただけの特別な水泳体験をお届けします。
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="h-14 px-8 bg-white hover:bg-slate-100 text-sky-700 rounded-full text-base sm:text-lg font-bold shadow-xl transition-all hover:scale-[1.02]">
              <Link href="/trial" className="flex items-center justify-center gap-2">
                <span>体験レッスンを予約する（簡単60秒）</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 text-slate-600 text-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-white font-bold text-xs">
                  <Waves className="h-4 w-4" />
                </div>
                <span className="text-base font-bold text-slate-900">Swim Partners</span>
              </div>
              <p className="text-slate-500 mt-1">近所の公営プールでプロの完全専任マンツーマンレッスン</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <a href="#features" className="hover:text-sky-600">特徴</a>
              <a href="#comparison" className="hover:text-sky-600">他社比較</a>
              <a href="#areas" className="hover:text-sky-600">出張エリア</a>
              <a href="#pricing" className="hover:text-sky-600">料金</a>
              <a href="#faq" className="hover:text-sky-600">FAQ</a>
              <Link href="/trial" className="font-bold text-sky-600 hover:underline">体験予約</Link>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              出張対応主要エリア：
              <Link href="/personal_swim/shinagawa" className="hover:underline ml-1">品川</Link>・
              <Link href="/personal_swim/meguro" className="hover:underline">目黒</Link>・
              <Link href="/personal_swim/setagaya" className="hover:underline">世田谷</Link>・
              <Link href="/personal_swim/yokohama" className="hover:underline">横浜</Link>・
              <Link href="/personal_swim/funabashi" className="hover:underline">船橋</Link>・
              <Link href="/personal_swim/urayasu" className="hover:underline">浦安</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hover:text-slate-700">コーチ・関係者ログイン</Link>
              <span>© {new Date().getFullYear()} Swim Partners. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// 生徒プロフィール確認ヘルパー（既存保護）
async function getStudentProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('auth_user_id', userId)
    .single()
  return data
}
