
'use client'

// 受付完了メールはフォーム送信時に自動送信されるため、
// このコンポーネント（手動承認ボタン）は削除されました。
// 後方互換性のためファイルは残しています。

interface Props {
    studentId: string
    studentName: string
    status: string | null
    email?: string | null
}

export function ReceptionEmailButton(_props: Props) {
    // 手動受付承認システムは廃止。reception_completed がフォーム受信時に自動送信されます。
    return null
}
