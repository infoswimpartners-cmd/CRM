import { createClient } from '@supabase/supabase-js'
import { calculateHistoricalPayments } from '../src/lib/rewards'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin queries if needed

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
    const coachId = '1b51677f-2efe-465d-a660-2eabb8c8f147' // 三浦コーチ
    const payments = await calculateHistoricalPayments(supabase, coachId, 12)
    const may = payments.find(p => p.month.includes('2026年5月') || p.month.includes('05') || p.month === '2026年5月分')
    console.log('May Payments for Miura:', JSON.stringify(may, null, 2))

    const coachId2 = 'ac6b826e-75e6-42ee-aadc-dae862adff3a' // 高橋コーチ
    const payments2 = await calculateHistoricalPayments(supabase, coachId2, 12)
    const may2 = payments2.find(p => p.month.includes('2026年5月') || p.month.includes('05') || p.month === '2026年5月分')
    console.log('May Payments for Takahashi:', JSON.stringify(may2, null, 2))

    const coachId3 = 'cded4d65-32bf-40fc-86e8-cd76e1218e17' // 佐藤初音コーチ
    const payments3 = await calculateHistoricalPayments(supabase, coachId3, 12)
    const may3 = payments3.find(p => p.month.includes('2026年5月') || p.month.includes('05') || p.month === '2026年5月分')
    console.log('May Payments for Satou:', JSON.stringify(may3, null, 2))

    const coachId4 = 'ed580c47-5307-426a-a6d4-70af16e97ef9' // 岡野洸太コーチ
    const payments4 = await calculateHistoricalPayments(supabase, coachId4, 12)
    const may4 = payments4.find(p => p.month.includes('2026年5月') || p.month.includes('05') || p.month === '2026年5月分')
    console.log('May Payments for Okano:', JSON.stringify(may4, null, 2))
}

test()
