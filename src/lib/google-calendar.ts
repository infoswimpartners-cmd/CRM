export const GOOGLE_OAUTH_CONFIG = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/google/callback',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly offline'
};

export function getGoogleAuthURL(state?: string) {
    const params = new URLSearchParams({
        client_id: GOOGLE_OAUTH_CONFIG.clientId!,
        redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
        access_type: 'offline', // リフレッシュトークン取得に必須
        prompt: 'consent', // リフレッシュトークンが確実に返るよう強制
    });
    if (state) {
        params.set('state', state);
    }
    return `${GOOGLE_OAUTH_CONFIG.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
    const params = new URLSearchParams({
        code,
        client_id: GOOGLE_OAUTH_CONFIG.clientId!,
        client_secret: GOOGLE_OAUTH_CONFIG.clientSecret!,
        redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code',
    });

    const res = await fetch(GOOGLE_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error_description || 'Failed to exchange code');
    }
    return data;
}

export async function refreshAccessToken(refreshToken: string) {
    const params = new URLSearchParams({
        client_id: GOOGLE_OAUTH_CONFIG.clientId!,
        client_secret: GOOGLE_OAUTH_CONFIG.clientSecret!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    const res = await fetch(GOOGLE_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error_description || 'Failed to refresh token');
    }
    return data;
}

export async function getFreeBusy(refreshToken: string, timeMin: string, timeMax: string) {
    try {
        const tokenData = await refreshAccessToken(refreshToken);
        const accessToken = tokenData.access_token;

        const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timeMin,
                timeMax,
                items: [{ id: 'primary' }],
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error?.message || 'Failed to fetch freeBusy');
        }

        return data.calendars.primary.busy; // 空き時間リスト { start, end }[] を返す
    } catch (e) {
        console.error('getFreeBusy Error:', e);
        return [];
    }
}

// ─── カレンダーイベント CRUD ───────────────────────────────────────────────────

/** リフレッシュトークンを使って有効なアクセストークンを取得する内部ヘルパー */
async function getValidAccessToken(refreshToken: string): Promise<string> {
    const tokenData = await refreshAccessToken(refreshToken);
    if (!tokenData.access_token) {
        throw new Error('アクセストークンの取得に失敗しました');
    }
    return tokenData.access_token;
}

export interface CalendarEventPayload {
    summary: string;         // イベントタイトル
    description?: string;    // メモ・詳細
    location?: string;       // 場所
    start: string;           // ISO 8601 (例: 2026-03-15T10:00:00+09:00)
    end: string;             // ISO 8601
}

/**
 * Googleカレンダーにイベントを作成し、作成されたイベントIDを返す
 */
export async function createCalendarEvent(
    refreshToken: string,
    payload: CalendarEventPayload,
    calendarId: string = 'primary'
): Promise<string | null> {
    try {
        const accessToken = await getValidAccessToken(refreshToken);

        const body = {
            summary: payload.summary,
            description: payload.description || '',
            location: payload.location || '',
            start: { dateTime: payload.start, timeZone: 'Asia/Tokyo' },
            end: { dateTime: payload.end, timeZone: 'Asia/Tokyo' },
        };

        const targetCalId = encodeURIComponent(calendarId?.trim() || 'primary');
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        const data = await res.json();
        if (!res.ok) {
            console.error('[createCalendarEvent] API Error:', data.error?.message);
            return null;
        }

        console.log('[createCalendarEvent] 作成成功:', data.id);
        return data.id as string;
    } catch (e) {
        console.error('[createCalendarEvent] Error:', e);
        return null;
    }
}

/**
 * Googleカレンダーの既存イベントを更新する
 */
export async function updateCalendarEvent(
    refreshToken: string,
    eventId: string,
    payload: CalendarEventPayload,
    calendarId: string = 'primary'
): Promise<boolean> {
    try {
        const accessToken = await getValidAccessToken(refreshToken);

        const body = {
            summary: payload.summary,
            description: payload.description || '',
            location: payload.location || '',
            start: { dateTime: payload.start, timeZone: 'Asia/Tokyo' },
            end: { dateTime: payload.end, timeZone: 'Asia/Tokyo' },
        };

        const targetCalId = encodeURIComponent(calendarId?.trim() || 'primary');
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${eventId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!res.ok) {
            const data = await res.json();
            console.error('[updateCalendarEvent] API Error:', data.error?.message);
            return false;
        }

        console.log('[updateCalendarEvent] 更新成功:', eventId);
        return true;
    } catch (e) {
        console.error('[updateCalendarEvent] Error:', e);
        return false;
    }
}

/**
 * Googleカレンダーのイベントを削除する
 */
export async function deleteCalendarEvent(
    refreshToken: string,
    eventId: string,
    calendarId: string = 'primary'
): Promise<boolean> {
    try {
        const accessToken = await getValidAccessToken(refreshToken);

        const targetCalId = encodeURIComponent(calendarId?.trim() || 'primary');
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events/${eventId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        // 204 No Content が成功レスポンス
        if (res.status === 204 || res.ok) {
            console.log('[deleteCalendarEvent] 削除成功:', eventId);
            return true;
        }

        const data = await res.json().catch(() => ({}));
        console.error('[deleteCalendarEvent] API Error:', data.error?.message);
        return false;
    } catch (e) {
        console.error('[deleteCalendarEvent] Error:', e);
        return false;
    }
}

/**
 * 管理者のリフレッシュトークンをDBから取得するヘルパー
 * Server Actions 内で使用するため、supabaseAdminクライアントを引数で受け取る
 */
export async function getAdminRefreshToken(supabaseAdmin: any): Promise<string | null> {
    try {
        const { data } = await supabaseAdmin
            .from('profiles')
            .select('google_refresh_token')
            .eq('role', 'admin')
            .not('google_refresh_token', 'is', null)
            .limit(1)
            .single();

        return data?.google_refresh_token || null;
    } catch (e) {
        console.error('[getAdminRefreshToken] Error:', e);
        return null;
    }
}

/**
 * 指定されたコーチのリフレッシュトークンをDBから取得するヘルパー
 */
export async function getCoachRefreshToken(supabaseAdmin: any, coachId: string): Promise<string | null> {
    try {
        const { data } = await supabaseAdmin
            .from('profiles')
            .select('google_refresh_token')
            .eq('id', coachId)
            .single();

        return data?.google_refresh_token || null;
    } catch (e) {
        console.error('[getCoachRefreshToken] Error:', e);
        return null;
    }
}

/**
 * 指定されたコーチIDが新吉コーチ（代表・管理者ロールを含む）かどうかを判定する
 */
export async function isShinkichiOrAdminCoach(supabaseAdmin: any, coachId: string | null | undefined): Promise<boolean> {
    if (!coachId) return false;
    try {
        const { data: coach } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', coachId)
            .maybeSingle();

        if (!coach) return false;

        // 管理者ロール、または名前に「新吉」が含まれるコーチ
        const cleanName = (coach.full_name || '').replace(/[\s　]+/g, '');
        return coach.role === 'admin' || cleanName.includes('新吉');
    } catch (e) {
        console.error('[isShinkichiOrAdminCoach] Error:', e);
        return false;
    }
}

/**
 * 新吉コーチ（または管理者）専用の同期先GoogleカレンダーIDを取得する
 * 未設定の場合は null（呼び出し側で primary または通常同期へフォールバック）
 */
export async function getShinkichiCalendarId(supabaseAdmin: any): Promise<string | null> {
    try {
        const { data } = await supabaseAdmin
            .from('app_configs')
            .select('value')
            .eq('key', 'shinkichi_calendar_id')
            .maybeSingle();

        const val = data?.value?.trim();
        return val ? val : null;
    } catch (e) {
        console.error('[getShinkichiCalendarId] Error:', e);
        return null;
    }
}
