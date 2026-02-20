import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from '@/lib/email'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return new NextResponse('Invalid ID', { status: 400 })
    }

    try {
        const supabase = createAdminClient()

        // 1. Get the approval record
        const { data: approval, error: fetchError } = await supabase
            .from('email_approvals')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !approval) {
            console.error('Approval record not found:', fetchError)
            return new NextResponse('Record not found', { status: 404 })
        }

        if (approval.status !== 'pending') {
            return new NextResponse(`Email is already ${approval.status}`, { status: 400 })
        }

        // 2. Send the original email using _sendInternalEmail
        const sent = await emailService._sendInternalEmail({
            to: approval.to_email,
            bcc: approval.bcc_email || undefined,
            subject: approval.subject,
            text: approval.text_body,
            html: approval.html_body || undefined,
        })

        if (!sent) {
            return new NextResponse('Failed to send email', { status: 500 })
        }

        // 3. Update status to approved
        const { error: updateError } = await supabase
            .from('email_approvals')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) {
            console.error('Failed to update approval status:', updateError)
        }

        // Return a simple HTML success page
        const html = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>送信承認完了</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
                <div class="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
                    <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h1 class="text-xl font-bold text-slate-800 mb-2">送信を承認しました</h1>
                    <p class="text-slate-600 mb-6 text-sm">
                        宛先 <strong>${approval.to_email}</strong> へ<br>メールが送信されました。
                    </p>
                    <a href="/" class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                        サイトトップへ
                    </a>
                </div>
            </body>
            </html>
        `

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        })

    } catch (error) {
        console.error('Error in approve email route:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
