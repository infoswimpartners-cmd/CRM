/**
 * 顧客カルテ（students.notes）の整形・クリーンアップ用ユーティリティ
 */

export interface ApplicationNoteInfo {
    skillLevel?: string | null
    concern?: string | null
    area?: string | null
    frequency?: string | null
    availableTimes?: string | null
    notes?: string | null
}

const LINE_FRIEND_UNAPPLIED_NOTE = '公式LINE友だち追加（未申込）'
const APPLICATION_BLOCK_HEADER = '【体験申込時の入力情報】'

/**
 * 既存のメモから「公式LINE友だち追加（未申込）」の記載を除去する
 */
export function stripLineFriendAddNote(notes: string | null | undefined): string {
    if (!notes) return ''
    return notes
        .split('\n')
        .filter((line) => line.trim() !== LINE_FRIEND_UNAPPLIED_NOTE)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

/**
 * 申込情報（目標・泳力・お悩み・希望エリア・ご要望など）を顧客カルテ用のメモに反映する
 * - 「公式LINE友だち追加（未申込）」は自動的に削除する
 * - 既にスタッフ等が記入したメモは保持する
 */
export function buildStudentNotesFromApplication(
    existingNotes: string | null | undefined,
    info: ApplicationNoteInfo
): string | null {
    const cleanedExisting = stripLineFriendAddNote(existingNotes)

    const lines: string[] = []
    if (info.skillLevel && info.skillLevel.trim()) {
        lines.push(`・泳力レベル・目標: ${info.skillLevel.trim()}`)
    }
    if (info.concern && info.concern.trim()) {
        lines.push(`・お悩み・課題: ${info.concern.trim()}`)
    }
    if (info.area && info.area.trim()) {
        lines.push(`・希望エリア・最寄駅: ${info.area.trim()}`)
    }
    if (info.frequency && info.frequency.trim()) {
        lines.push(`・希望頻度: ${info.frequency.trim()}`)
    }
    if (info.availableTimes && info.availableTimes.trim()) {
        lines.push(`・希望日時・曜日: ${info.availableTimes.trim()}`)
    }
    if (info.notes && info.notes.trim()) {
        lines.push(`・ご要望・備考: ${info.notes.trim()}`)
    }

    if (lines.length === 0) {
        return cleanedExisting || null
    }

    const applicationBlock = `${APPLICATION_BLOCK_HEADER}\n${lines.join('\n')}`

    // 既に同じブロックが反映済みの場合は重複追記しない
    if (cleanedExisting.includes(APPLICATION_BLOCK_HEADER)) {
        return cleanedExisting || null
    }

    if (!cleanedExisting) {
        return applicationBlock
    }

    return `${cleanedExisting}\n\n${applicationBlock}`
}
