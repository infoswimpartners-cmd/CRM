/**
 * エラーオブジェクトや文字列からユーザーフレンドリーなエラーメッセージを抽出・整形するユーティリティ
 * Next.jsの本番ビルドでマスクされる「An error occurred in the Server Components render...」や
 * digest付きの内部エラー、未ハンドルの例外メッセージを検知し、適切な日本語メッセージに変換します。
 */
export function sanitizeErrorMessage(
    error: unknown,
    defaultMessage: string = '一時的な通信エラーまたはサーバー処理の遅延が発生しました。再度お試しください。'
): string {
    if (!error) {
        return defaultMessage;
    }

    let rawMessage = '';

    if (typeof error === 'string') {
        rawMessage = error;
    } else if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
        const anyErr = error as any;
        rawMessage = anyErr.message || anyErr.error || anyErr.statusText || '';
    }

    rawMessage = String(rawMessage || '').trim();

    // エラーオブジェクト自体に digest プロパティが存在するか確認
    const hasDigestProperty = typeof error === 'object' && error !== null && 'digest' in error;

    // Next.jsのServer Components render エラーやdigestメッセージ、Server Action内部エラーの包括的検知
    const isServerComponentRenderError =
        hasDigestProperty ||
        rawMessage.includes('Server Components render') ||
        rawMessage.includes('omitted in production builds') ||
        rawMessage.includes('digest property is included') ||
        rawMessage.includes('NEXT_RSC_ERR_') ||
        rawMessage.includes('Failed to find Server Action') ||
        /digest:\s*["']?[0-9a-zA-Z_-]+["']?/i.test(rawMessage) ||
        /^[0-9]{8,12}$/.test(rawMessage); // digest数値のみの場合

    if (isServerComponentRenderError) {
        return '一時的な通信エラーまたはサーバー処理の遅延が発生しました。再度お試しください。';
    }

    if (!rawMessage) {
        return defaultMessage;
    }

    // ネットワーク・Fetch関連エラーの検知
    if (
        rawMessage.includes('Failed to fetch') ||
        rawMessage.includes('NetworkError') ||
        rawMessage.includes('network request failed') ||
        rawMessage.includes('fetch failed') ||
        rawMessage.includes('Load failed')
    ) {
        return 'ネットワーク通信に失敗しました。接続環境をご確認のうえ、再度お試しください。';
    }

    return rawMessage;
}

/**
 * トースト通知用の統一エラーメッセージ生成
 * ユーザー向けに分かりやすい日本語メッセージを生成します。
 */
export function formatErrorToastMessage(
    error: unknown,
    prefix: string = 'エラーが発生しました: '
): string {
    const sanitized = sanitizeErrorMessage(error);

    // すでに自然な日本語文で構成されているメッセージ群はプレフィックスの二重付与を防止
    if (
        sanitized.startsWith('一時的な') ||
        sanitized.startsWith('サーバー処理') ||
        sanitized.startsWith('ネットワーク通信')
    ) {
        return sanitized;
    }

    return `${prefix}${sanitized}`;
}
