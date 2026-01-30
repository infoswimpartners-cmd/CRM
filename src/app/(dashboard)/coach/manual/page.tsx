import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BookOpen, Calendar, DollarSign, FileText, User, Settings, Info } from "lucide-react"

export default function CoachManualPage() {
    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-cyan-500" />
                    コーチマニュアル
                </h1>
                <p className="text-slate-500">
                    Swim Partners システムの使い方ガイドです。各機能の目的と操作方法を確認できます。
                </p>
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-slate-100/50">
                    <TabsTrigger value="dashboard" className="py-2.5">ダッシュボード</TabsTrigger>
                    <TabsTrigger value="schedule" className="py-2.5">予定管理</TabsTrigger>
                    <TabsTrigger value="report" className="py-2.5">レッスン報告</TabsTrigger>
                    <TabsTrigger value="students" className="py-2.5">生徒管理</TabsTrigger>
                    <TabsTrigger value="finance" className="py-2.5">売上・報酬</TabsTrigger>
                </TabsList>

                {/* Dashboard Section */}
                <TabsContent value="dashboard" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>ダッシュボード (ホーム)</CardTitle>
                            <CardDescription>ログイン直後に表示される画面です。現在の状況を一目で確認できます。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <section className="space-y-2">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-cyan-100 flex items-center justify-center text-cyan-600 text-xs text-center font-bold">1</div>
                                        KPIカード (重要指標)
                                    </h3>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-2">
                                        <li><strong>今月の報酬 (見込):</strong> 当月のレッスン実施状況に基づいた報酬見込み額です。確定ではありません。</li>
                                        <li><strong>アクティブ生徒:</strong> 直近3ヶ月以内にレッスンの受講履歴がある生徒数です。</li>
                                        <li><strong>実施レッスン:</strong> 当月に実施済みのレッスン回数です（前月比も表示）。</li>
                                    </ul>
                                </section>
                                <section className="space-y-2">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-cyan-100 flex items-center justify-center text-cyan-600 text-xs text-center font-bold">2</div>
                                        クイックアクション
                                    </h3>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-2">
                                        <li><strong>予定を登録:</strong> カレンダー画面へ移動し、レッスン可能な日時を登録します。</li>
                                        <li><strong>レッスン報告:</strong> レッスン終了後の報告フォームへ直接移動します。</li>
                                    </ul>
                                </section>
                                <section className="space-y-2">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-cyan-100 flex items-center justify-center text-cyan-600 text-xs text-center font-bold">3</div>
                                        今後の予定 / 最新のメモ
                                    </h3>
                                    <p className="text-sm text-slate-600 ml-2">
                                        画面右側（または下部）には、直近のレッスン予定と、最近提出したレッスンメモが表示されます。
                                        タブで切り替えが可能です。
                                    </p>
                                </section>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Schedule Section */}
                <TabsContent value="schedule" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-purple-500" />
                                予定管理・登録
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-slate-600">
                                生徒が予約できるように、あなたの空き時間を登録します。
                            </p>
                            <Separator />
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800">操作方法</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-sm mb-2 text-indigo-700">予定を追加する</h4>
                                        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
                                            <li>カレンダー上の登録したい日時を<strong>ダブルクリック</strong>します。</li>
                                            <li>「タイトル」（例: レッスン可能）を入力します。詳しくは「レッスン」などを推奨。</li>
                                            <li>「開始時間」と「終了時間」を確認・調整します。</li>
                                            <li>「場所」を入力します（市民プール名など）。</li>
                                            <li>既に予約済みの場合は「生徒」を選択できます（任意）。</li>
                                            <li>「登録」ボタンを押します。</li>
                                        </ol>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-sm mb-2 text-red-700">予定を編集・削除する</h4>
                                        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
                                            <li>カレンダー上の予定をクリックします。</li>
                                            <li>内容を修正して「更新」を押すか、右下の「削除」ボタンを押します。</li>
                                        </ol>
                                    </div>
                                </div>
                                <Alert>
                                    <Calendar className="h-4 w-4" />
                                    <AlertTitle>注意点</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        予定を登録すると、管理者および生徒（予約時）に公開されます。
                                        急なキャンセルの場合は、速やかに削除または管理者に連絡してください。
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Report Section */}
                <TabsContent value="report" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-500" />
                                レッスン報告 (メモ)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-slate-600">
                                レッスン終了後、速やかに活動報告（カルテ）を作成してください。これが報酬計算の根拠となります。
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <h3 className="font-bold text-yellow-800 text-sm mb-2">報告の流れ</h3>
                                <ol className="list-decimal list-inside text-sm text-yellow-900 space-y-1">
                                    <li>サイドバーの<strong>「レッスン報告」</strong>をクリックします。</li>
                                    <li><strong>生徒を選択</strong>します。</li>
                                    <li>コース（会員種別）を選択します。</li>
                                    <li>実施した<strong>レッスンメニュー</strong>（60分、90分など）を選択します。</li>
                                    <li>レッスン内容や生徒の様子（メモ）を記入します。これは生徒にも共有される場合があります。</li>
                                    <li>「送信する」を押して完了です。</li>
                                </ol>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ※ 報告を修正したい場合は、「レッスン履歴」から該当の報告を探し、編集してください（現在は管理者のみ編集可能な場合があります）。
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Student Management */}
                <TabsContent value="students" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-500" />
                                生徒管理
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600 mb-4">
                                担当している生徒の一覧と詳細情報を確認できます。
                            </p>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li className="flex items-start gap-2">
                                    <div className="min-w-[4px] h-[4px] rounded-full bg-slate-400 mt-2" />
                                    <span><strong>生徒詳細:</strong> 生徒の名前をクリックすると、過去のレッスン履歴や登録情報、保護者連絡先などを確認できます。</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="min-w-[4px] h-[4px] rounded-full bg-slate-400 mt-2" />
                                    <span><strong>メモの閲覧:</strong> 過去に自分が記入したレッスンメモを振り返り、次回の指導に役立ててください。</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Finance Section */}
                <TabsContent value="finance" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-cyan-600" />
                                売上・報酬管理
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-slate-600 mb-4">
                                あなたの報酬履歴と支払状況を確認するページです。
                            </p>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="border p-4 rounded-lg">
                                    <h4 className="font-bold text-sm mb-2">月次報酬履歴</h4>
                                    <p className="text-xs text-slate-600">
                                        過去の月ごとの報酬合計、レッスン回数、適用された報酬率を確認できます。
                                        各月をクリックすると、その月のレッスンごとの明細（日時・単価・報酬額）が展開されます。
                                    </p>
                                </div>
                                <div className="border p-4 rounded-lg">
                                    <h4 className="font-bold text-sm mb-2">支払通知書</h4>
                                    <p className="text-xs text-slate-600">
                                        管理者から発行された支払通知書を確認・ダウンロードできます。
                                        ステータスが「支払完了」になっているものは、指定口座への振込が完了しています。
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>


            <Separator />

            {/* Internal Operations Manual */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <Info className="h-6 w-6 text-orange-600" />
                    社内運用マニュアル
                </h3>
                <p className="text-slate-600">
                    スタッフ向け指示書・運用ルール
                </p>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">業務名：会員の先行利用・追加利用時の対応フロー</CardTitle>
                        <CardDescription>
                            入会契約済みだが利用開始前、または月回数消化後に「おかわり」を希望する場合
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">適用ルール</h4>
                            <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
                                <li>
                                    <strong>価格:</strong> 契約コースの1回あたり単価（料金表参照）を適用する。<br />
                                    <span className="text-red-600 font-bold">※決して正規の単発料金（9,000円等）やビジター料金を案内しないこと。</span>
                                </li>
                                <li>
                                    <strong>決済:</strong> サブスクリプションには含めず、<span className="font-semibold">Stripe等の単発決済（インボイス）</span>で処理する。
                                </li>
                            </ul>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">システム操作手順</h4>
                            <ol className="list-decimal ml-5 space-y-2 text-sm text-slate-700">
                                <li>会員の契約コースを確認する（例：月2回・60分）。</li>
                                <li>
                                    Stripe（またはCRM）で該当する以下の商品を呼び出す。
                                    <div className="bg-white p-2 border rounded mt-1 shadow-sm">
                                        追加レッスン [60分/月2回用]：8,700円
                                    </div>
                                </li>
                                <li>決済を実行（または請求書送付）し、入金確認後に予約を確定する。</li>
                            </ol>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="font-semibold text-blue-800 mb-1">顧客への案内例</h4>
                            <p className="text-sm text-blue-900 italic">
                                「○○様は既にご入会済みですので、コース開始前ですが、会員様特別単価の8,700円にてご受講いただけます。」
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Billing System */}
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-amber-600" />
                            自動請求システム
                        </CardTitle>
                        <CardDescription>
                            レッスン予約時に自動で請求書が発行される仕組みについて
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">システムの流れ</h4>
                            <ol className="list-decimal ml-5 space-y-1 text-sm text-slate-700">
                                <li><strong>予定登録:</strong> スケジュール画面で生徒を選択してレッスン予定を登録します。</li>
                                <li><strong>自動請求:</strong> システムが自動的にStripe請求書を作成し、生徒のメールアドレスに送信します（レッスン7日前から対象）。</li>
                                <li><strong>支払期日:</strong> 請求書の支払期日はレッスン前日に設定されます。</li>
                                <li><strong>入金確認:</strong> Stripeで入金状況が自動管理されます。</li>
                            </ol>
                        </div>

                        <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold mb-2 text-red-700">キャンセル規定</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span><strong>前日正午まで:</strong> 無料キャンセル（請求書は自動で無効化されます）</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span><strong>前日正午以降:</strong> キャンセル料（レッスン料と同額）が発生します</span>
                                </div>
                            </div>
                        </div>

                        <Alert className="border-amber-300">
                            <Info className="h-4 w-4" />
                            <AlertTitle>コーチの操作</AlertTitle>
                            <AlertDescription className="text-xs">
                                予定の削除・キャンセルはスケジュール画面から行ってください。
                                削除時にシステムが自動でキャンセル期限を判定し、請求書の無効化またはキャンセル料処理を行います。
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                {/* Monthly Subscription */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">月謝制会員の請求について</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
                            <li><strong>月謝:</strong> 入会時に設定されたコース（月2回/月4回等）に基づき、毎月1日にStripeから自動引き落としされます。</li>
                            <li><strong>追加レッスン:</strong> 月の規定回数を超えるレッスンは、自動請求システムにより会員優待価格で単発請求されます。</li>
                        </ul>

                        <div className="overflow-x-auto mt-4 border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                    <tr>
                                        <th className="p-2 text-left">会員種別</th>
                                        <th className="p-2 text-left">月謝</th>
                                        <th className="p-2 text-left">追加レッスン</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-slate-100"><td className="p-2 font-semibold" colSpan={3}>60分コース</td></tr>
                                    <tr className="border-t">
                                        <td className="p-2">月2回</td><td className="p-2">17,400円/月</td><td className="p-2">8,700円/回</td>
                                    </tr>
                                    <tr className="border-t">
                                        <td className="p-2">月4回</td><td className="p-2">34,000円/月</td><td className="p-2">8,500円/回</td>
                                    </tr>
                                    <tr className="bg-slate-100"><td className="p-2 font-semibold" colSpan={3}>90分コース</td></tr>
                                    <tr className="border-t">
                                        <td className="p-2">月2回</td><td className="p-2">25,400円/月</td><td className="p-2">12,700円/回</td>
                                    </tr>
                                    <tr className="border-t">
                                        <td className="p-2">月4回</td><td className="p-2">50,000円/月</td><td className="p-2">12,500円/回</td>
                                    </tr>
                                    <tr className="bg-slate-100"><td className="p-2 font-semibold" colSpan={3}>単発会員</td></tr>
                                    <tr className="border-t">
                                        <td className="p-2">単発 (60分)</td><td className="p-2">-</td><td className="p-2">9,000円/回</td>
                                    </tr>
                                    <tr className="border-t">
                                        <td className="p-2">単発 (90分)</td><td className="p-2">-</td><td className="p-2">13,000円/回</td>
                                    </tr>
                                    <tr className="border-t">
                                        <td className="p-2">単発 (120分)</td><td className="p-2">-</td><td className="p-2">17,000円/回</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                    <Settings className="h-5 w-5 text-slate-500" />
                    設定・その他
                </h3>
                <p className="text-sm text-slate-600">
                    パスワードの変更やプロフィールの確認は、サイドバーの<strong>「設定」</strong>（またはアカウント設定）から行えます。
                    システムに関する不明点がある場合は、管理者へ直接お問い合わせください。
                </p>
            </div>
        </div >
    )
}
