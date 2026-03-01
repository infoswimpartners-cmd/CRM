import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { linkStudentData } from '@/actions/member/auth'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Attempt to link student data immediately after login (Best effort)
            try {
                await linkStudentData();
            } catch (err) {
                console.error('Linking error (ignored):', err);
            }

            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Auth callback code exchange error:', error);
        }
    } else {
        console.error('Auth callback missing code parameter');
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
