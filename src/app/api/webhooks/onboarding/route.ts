
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { emailService } from '@/lib/email'

// Validation Schema
const onboardingSchema = z.object({
    name: z.string().min(1, "Name is required"),
    kana: z.string().optional(),
    second_name: z.string().optional(),
    second_name_kana: z.string().optional(),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    message: z.string().optional(),
    type: z.enum(['trial', 'inquiry']).default('trial'),
}).passthrough()

export async function POST(req: NextRequest) {
    let rawBody: any
    try {
        const contentType = req.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            rawBody = await req.json()
        } else {
            // Default to form data (GAS often sends x-www-form-urlencoded without explicit JSON header, or multipart)
            const formData = await req.formData()
            rawBody = Object.fromEntries(formData.entries())
        }
    } catch (e) {
        console.error('Body Parse Error:', e)
        return NextResponse.json({ error: 'Invalid Body Format' }, { status: 400 })
    }


    try {
        console.log('[Onboarding] Raw Body:', rawBody)

        // Normalize Keys (Map Japanese to English)
        const body: any = { ...rawBody }
        const keyMap: Record<string, string> = {
            'お名前': 'name',
            '氏名': 'name',
            '名前': 'name',
            'フリガナ': 'kana',
            'カナ': 'kana',
            'お名前（2人目）': 'second_name',
            '2人目のお名前': 'second_name',
            'お名前2': 'second_name',
            'フリガナ（2人目）': 'second_name_kana',
            '2人目のフリガナ': 'second_name_kana',
            'フリガナ2': 'second_name_kana',
            'メールアドレス': 'email',
            'メール': 'email',
            '電話番号': 'phone',
            '電話': 'phone',
            'メッセージ': 'message',
            'お問い合わせ内容': 'message',
            '種別': 'type'
        }

        Object.keys(rawBody).forEach(k => {
            const mapped = keyMap[k]
            if (mapped) body[mapped] = rawBody[k]
        })

        // 1. Validate Input
        const result = onboardingSchema.safeParse(body)
        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation Failed', details: result.error.flatten() },
                { status: 400 }
            )
        }

        const { name, kana, email, phone, message, second_name, second_name_kana } = result.data as any // Type assertion for dynamic second_name
        const supabaseAdmin = createAdminClient()

        console.log(`[Onboarding] New Lead: ${name} (${email})`)

        // 2. Extract Extra Fields for Notes
        const standardKeys = ['name', 'kana', 'email', 'phone', 'message', 'type', 'second_name', 'second_name_kana']
        const extraInfo = Object.entries(result.data)
            .filter(([key]) => !standardKeys.includes(key))
            .map(([key, value]) => `【${key}】: ${value}`)
            .join('\n')

        let notes = message ? `[メッセージ]\n${message}` : ''
        if (extraInfo) {
            notes = notes ? `${notes}\n\n[追加情報]\n${extraInfo}` : `[追加情報]\n${extraInfo}`
        }

        // 3. Check for Duplicate Student (Exact Match)
        const { data: exactDuplicate } = await supabaseAdmin
            .from('students')
            .select('id')
            .eq('contact_email', email)
            .eq('full_name', name)
            .single()

        if (exactDuplicate) {
            console.log(`[Onboarding] Exact Duplicate (Email+Name): ${email} / ${name}`)
            return NextResponse.json({ message: 'Student already registered' }, { status: 200 })
        }

        // 4. Create Student in Supabase (CMS) - NO STRIPE YET
        console.log(`[Onboarding] Creating Student Record (Status: inquiry)...`)
        const { data: newStudent, error: dbError } = await supabaseAdmin
            .from('students')
            .insert({
                full_name: name,
                full_name_kana: kana,
                second_student_name: second_name || null,
                second_student_name_kana: second_name_kana || null,
                contact_email: email,
                contact_phone: phone,
                notes: notes || null,
                status: 'inquiry',
                stripe_customer_id: null
            })
            .select()
            .single()

        if (dbError) {
            console.error('[Onboarding] DB Insert Error:', dbError)
            return NextResponse.json({ error: 'Database Insert Failed' }, { status: 500 })
        }

        // 4. Notify Admin (Optional - Logging for now, could send email to Admin)
        console.log(`[Onboarding] Success! Lead Created: ${newStudent.id}`)

        // 5. Send Receipt Email (Using Template)
        // Convert all received data to string variables for the template
        const variables: Record<string, string> = {}
        const inputLines: string[] = []

        for (const [key, value] of Object.entries(result.data)) {
            if (value !== undefined && value !== null) {
                const strValue = String(value)
                variables[key] = strValue

                // Format for all_inputs listing
                // Translate standard keys for better readability if needed, or just use keys
                const label = translateKey(key) || key
                inputLines.push(`【${label}】: ${strValue}`)
            }
        }

        variables['all_inputs'] = inputLines.join('\n')

        // Format Name for Email
        const formattedName = second_name ? `${name}・${second_name}` : name
        variables['name'] = formattedName

        await emailService.sendTemplateEmail('inquiry_received', email, variables)

        return NextResponse.json({
            success: true,
            studentId: newStudent.id
        }, { status: 200 })

    } catch (error) {
        console.error('[Onboarding] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

function translateKey(key: string): string {
    const map: Record<string, string> = {
        name: 'お名前',
        kana: 'フリガナ',
        email: 'メールアドレス',
        phone: '電話番号',
        message: 'メッセージ',
        type: '種別',
        second_name: 'お名前（2人目）',
        second_name_kana: 'フリガナ（2人目）'
    }
    return map[key] || key
}
