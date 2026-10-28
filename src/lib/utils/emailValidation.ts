/**
 * メールアドレスのサニタイズおよびタイポ検知ユーティリティ
 */

// よくあるドメインのタイポ候補マップ
const COMMON_DOMAIN_TYPOS: Record<string, string> = {
    'gamil.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmeil.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.ne.jp': 'gmail.com',
    'yaho.co.jp': 'yahoo.co.jp',
    'yahooo.co.jp': 'yahoo.co.jp',
    'yhoo.co.jp': 'yahoo.co.jp',
    'yahoo.jp': 'yahoo.co.jp',
    'iclud.com': 'icloud.com',
    'icoud.com': 'icloud.com',
    'icloud.co.jp': 'icloud.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
}

/**
 * 全角英数・全角記号を半角に変換し、前後の空白を除去・小文字化する
 */
export function sanitizeEmail(email: string): string {
    if (!email) return ''

    // 全角スペースや前後の空白を除去
    let cleaned = email.replace(/[\u3000\s]+/g, ' ').trim()

    // 全角英数字および記号を半角に変換
    cleaned = cleaned.replace(/[！-～]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    })

    // 空白を完全に除去し、小文字化
    return cleaned.replace(/\s+/g, '').toLowerCase()
}

/**
 * よくあるドメインのタイポを検知し、修正候補があれば返す
 */
export function detectDomainTypo(email: string): { hasTypo: boolean; suggestedEmail?: string; suggestedDomain?: string } {
    const sanitized = sanitizeEmail(email)
    const atIndex = sanitized.indexOf('@')

    if (atIndex === -1) {
        return { hasTypo: false }
    }

    const localPart = sanitized.slice(0, atIndex)
    const domainPart = sanitized.slice(atIndex + 1)

    if (COMMON_DOMAIN_TYPOS[domainPart]) {
        const suggestedDomain = COMMON_DOMAIN_TYPOS[domainPart]
        return {
            hasTypo: true,
            suggestedDomain,
            suggestedEmail: `${localPart}@${suggestedDomain}`,
        }
    }

    return { hasTypo: false }
}

/**
 * 有効なメールアドレス形式かどうか判定
 */
export function isValidEmailFormat(email: string): boolean {
    const sanitized = sanitizeEmail(email)
    // 基本的なRFC適合のメール形式チェック
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/
    return emailRegex.test(sanitized)
}
