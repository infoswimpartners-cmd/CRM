import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state') || '/admin/settings'; // Default redirect

    if (error) {
        return NextResponse.redirect(new URL(`${state}?error=google_auth_failed`, req.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL(`${state}?error=no_code`, req.url));
    }

    try {
        const tokens = await exchangeCodeForTokens(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
            console.warn('No refresh token returned from Google');
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        if (refreshToken) {
            // Store refresh token
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    google_refresh_token: refreshToken
                })
                .eq('id', user.id);

            if (updateError) {
                console.error('Failed to update profile tokens:', updateError);
                return NextResponse.redirect(new URL(`${state}?error=db_update_failed`, req.url));
            }
        } else {
             // If they already linked and clicked again without prompt=consent forcing a new one, 
             // we just consider it success as it's already linked.
             console.log('No refresh token to update (already linked).')
        }

        return NextResponse.redirect(new URL(`${state}?success=google_connected`, req.url));

    } catch (err) {
        console.error('Google Auth Callback Error:', err);
        return NextResponse.redirect(new URL(`${state}?error=exception`, req.url));
    }
}
