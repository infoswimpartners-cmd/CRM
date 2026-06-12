'use client'

import { UserCheck, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function LeadAssignmentGuide() {
    return (
        <section className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <UserCheck className="h-6 w-6 text-emerald-600" />
                体験案件・アサイン管理
            </h2>
            <p className="text-gray-700">
                お客様の体験申込からレッスン実施、そして連絡開始までの連動システムフローと操作手順です。
            </p>

            {/* 全体プロセス図解 */}
            <Card className="border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50">
                    <CardTitle className="text-lg text-slate-800">全体連携プロセス</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col items-center">
                    <img 
                        src="/images/flow_diagram.png" 
                        alt="体験レッスンアサインの流れ" 
                        className="max-w-full h-auto rounded-lg shadow-sm border border-slate-100 max-h-[500px] object-contain"
                    />
                    <p className="text-xs text-slate-500 mt-2">※申込から連絡開始までのシステム自動連携図</p>
                </CardContent>
            </Card>

            {/* ステップ詳細 */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">体験レッスン案件の7ステップ詳細フロー</h3>
                
                <div className="relative border-l-2 border-emerald-100 pl-6 ml-3 space-y-6">
                    {/* Step 1 */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                        <h4 className="font-bold text-slate-800">案件申し込み (顧客)</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            体験申込フォーム（<code>/trial</code>）からお客様が希望日時、競技種目、希望エリアを入力してお申し込みを行います。
                            （Next.js の自動リトライ対策により、重複送信は発生しません。）
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                        <h4 className="font-bold text-slate-800">レッスン場所の選定提案 (管理者)</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            管理者は管理画面の「体験申込リード管理」（<code>/admin/leads</code>）で申込内容を確認します。
                            申込内容の希望エリアに基づき、レッスンを実施可能な候補プール・施設を選定し、提案の準備をします。
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                        <h4 className="font-bold text-slate-800">案件通知スペースへ自動送信 (システム)</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            案件情報および管理者によって提案された候補場所などの情報が、Google Chatの「案件通知スペース（Webhook）」へ自動で送信され、コーチ全体へ募集が掛かります。
                        </p>
                    </div>

                    {/* Step 4 */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">4</div>
                        <h4 className="font-bold text-slate-800">案件アサイン (コーチ)</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            コーチはコーチ用画面の「体験リード管理」（<code>/coach/leads</code>）を確認し、自身の予定や勤務可能な場所が一致する案件に対し、<b>「アサインする」</b>ボタンを押して担当に立候補します。
                        </p>
                    </div>

                    {/* Step 5 */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">5</div>
                        <h4 className="font-bold text-slate-800">場所・日程の確定 (コーチ)</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            アサインされたコーチは、申込者と調整のうえ（または管理者の指示に基づき）、最終的なレッスンの日時と施設をスケジュール登録し、確定させます。
                        </p>
                    </div>

                    {/* Step 6 */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">6</div>
                        <h4 className="font-bold text-slate-800">事務局LINEから確定メッセージ自動送信 (システム)</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            アサインが確定すると、生徒マスタ（<code>students</code>）とコーチとのメイン紐付け関係（<code>student_coaches</code>: <code>role='main'</code>）が即時に作成され、生徒のLINE宛てにコーチ確定通知メッセージが自動で送信されます。
                            メッセージには<b>コーチ個別の「LINE友達追加URL」</b>が自動的に埋め込まれます。
                        </p>
                    </div>

                    {/* Step 7 */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">7</div>
                        <h4 className="font-bold text-slate-800">顧客からコーチLINEへ連絡開始 (顧客)</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            LINE通知を受け取ったお客様がURLをクリックしてコーチの個人LINEを友達追加し、挨拶やレッスンに関するメッセージを送信することで、直接の個別連絡（やりとり）がスタートします！
                        </p>
                    </div>
                </div>
            </div>


            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 mt-4">
                <HelpCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                    <span className="font-bold">重要ルール:</span><br />
                    各コーチがアカウントを有効化した際、またはプロフィールの設定変更時には、必ず<b>「LINE友達追加URL」が正しく設定されていること</b>を確認してください。これが未登録、または誤っている場合、ステップ6でお客様に送信されるLINE内のURLが正常に機能せず、ステップ7の直接連絡に進むことができなくなります。
                </div>
            </div>
        </section>
    )
}
