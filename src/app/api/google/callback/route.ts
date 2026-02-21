import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar';
import { redirect } from 'next/navigation';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(new URL('/settings?error=google_auth_failed', req.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/settings?error=no_code', req.url));
    }

    try {
        const tokens = await exchangeCodeForTokens(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
            // If the user has already authorized, Google doesn't send refresh_token again unless we revoke access or use prompt=consent.
            // My helper uses prompt='consent', so it should be there.
            console.warn('No refresh token returned from Google');
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        // Store refresh token
        // Use service role if RLS prevents update, but user should be able to update own profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                google_refresh_token: refreshToken || undefined, // Only update if we got one, or handle logic
                // We might want to store email too if available in id_token, but let's keep it simple
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Failed to update profile tokens:', updateError);
            return NextResponse.redirect(new URL('/settings?error=db_update_failed', req.url));
        }

        return NextResponse.redirect(new URL('/settings?success=google_connected', req.url));

    } catch (err) {
        console.error('Google Auth Callback Error:', err);
        return NextResponse.redirect(new URL('/settings?error=exception', req.url));
    }
}
