import { User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CoachManagementGuide() {
    return (
        <section className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <User className="h-6 w-6 text-indigo-600" />
                コーチ管理・アカウント発行
            </h2>
            <p className="text-gray-700">
                従来の「パスワード通知」方式は廃止され、セキュリティの高い「招待リンク」方式に変更されました。
            </p>

            <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg text-indigo-700">招待フロー (アカウント作成)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <ol className="list-decimal ml-5 space-y-2 text-gray-700">
                            <li>
                                <strong>管理者による招待:</strong><br />
                                「コーチ管理」→「コーチを追加」で氏名・メールを入力して送信。<br />
                                <span className="text-xs text-gray-500">※ステータスは「招待中」になります。パスワードは設定しません。</span>
                            </li>
                            <li>
                                <strong>招待メール受信:</strong><br />
                                コーチにメールが届きます。リンクの有効期限は<strong>24時間</strong>です。
                            </li>
                            <li>
                                <strong>パスワード設定:</strong><br />
                                コーチ自身がリンクを開き、パスワードを設定すると登録完了です。
                            </li>
                        </ol>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg text-amber-700">再招待・リンク切れ対応</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="space-y-3">
                            <div>
                                <strong>リンクが切れた場合:</strong><br />
                                <span className="text-gray-600">24時間を過ぎるとリンクは無効になります。</span>
                            </div>
                            <div>
                                <strong>再招待の手順:</strong><br />
                                <span className="text-gray-600">
                                    コーチ一覧の「招待中」ステータス横にある<br />
                                    <strong>「再招待ボタン（紙飛行機アイコン）」</strong>でメール再送、<br />
                                    <strong>「リンクコピー（鎖アイコン）」</strong>でURLをコピーできます。
                                </span>
                            </div>
                            <div className="bg-amber-50 p-2 rounded mt-2 text-amber-800 text-xs">
                                ※既に「有効（Active）」なコーチには再招待できません。「パスワードをお忘れですか？」を利用するよう案内してください。
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-rose-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg text-rose-700">登録リンクの発行 (氏名・メール指定なし)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p className="text-gray-700">
                            「コーチ管理」画面右上の<strong>「登録リンクを発行」</strong>ボタンから、氏名やメールを指定しない招待URLを作成できます。
                        </p>
                        <ul className="list-disc ml-5 space-y-1 text-gray-700">
                            <li>LINEグループ等で多数の人に一斉に共有する場合に便利です。</li>
                            <li>アクセスした人が自分で氏名・メール・パスワードを入力して登録します。</li>
                            <li>有効期限は<strong>3日間</strong>です。</li>
                        </ul>
                        <div className="bg-rose-50 p-2 rounded mt-2 text-rose-800 text-xs font-bold">
                            ※このリンクを知っている人は誰でもアカウントを作成できてしまうため、共有範囲には十分注意してください。
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
