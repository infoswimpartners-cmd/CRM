import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function testNotification() {
  console.log('--- Testing Enrollment Notification Logic ---')

  // 1. テスト太郎のIDで直接取得
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff')
    .single()

  if (studentError || !student) {
    console.error('Failed to find Test Taro (0035):', studentError)
    return
  }

  console.log('Found Test Student:')
  console.log(`- ID: ${student.id}`)
  console.log(`- Name: "${student.full_name}"`)
  console.log(`- Email: ${student.contact_email}`)
  console.log(`- LINE User ID: ${student.line_user_id || 'Not Linked'}`)

  // 2. LINE連携の有無を判定 (email.ts のロジック)
  const hasLineLinked = !!student.line_user_id
  console.log(`LINE Linked status: ${hasLineLinked}`)

  // 3. email_triggers と email_templates を結合して読み込み (email.ts のロジック)
  const { data: trigger, error: triggerError } = await supabase
    .from('email_triggers')
    .select('template_id, is_enabled')
    .eq('id', 'enrollment_completed')
    .single()

  if (triggerError || !trigger) {
    console.error('Failed to load trigger "enrollment_completed":', triggerError)
    return
  }

  console.log('Trigger Info:')
  console.log(`- Enabled: ${trigger.is_enabled}`)
  console.log(`- Template ID: ${trigger.template_id}`)

  if (!trigger.template_id) {
    console.log('No template associated with trigger. Skipping.')
    return
  }

  // 4. テンプレートの取得
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', trigger.template_id)
    .single()

  if (templateError || !template) {
    console.error('Failed to load template:', templateError)
    return
  }

  console.log('Template Info:')
  console.log(`- Subject: ${template.subject}`)
  console.log(`- Auto Send: ${template.is_auto_send_enabled}`)
  console.log(`- Approval Req: ${template.is_approval_required}`)

  // 5. 変数の置換 (email.ts のロジック)
  const variables = {
    name: student.full_name,
    plan_name: 'パーソナル4回プラン',
    start_date: '2026年6月1日'
  }

  let renderedSubject = template.subject
  let renderedBody = template.body

  for (const [k, v] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g')
    renderedSubject = renderedSubject.replace(regex, v)
    renderedBody = renderedBody.replace(regex, v)
  }

  console.log('--- Rendered Subject ---')
  console.log(renderedSubject)
  console.log('--- Rendered Body ---')
  console.log(renderedBody)

  // 6. LINE優先配信の判定
  const isLineTargetTrigger = ['trial_lesson_reserved', 'trial_payment_completed', 'trio_trial_payment_completed', 'payment_success', 'enrollment_completed'].includes('enrollment_completed')
  const shouldSendToLine = hasLineLinked && isLineTargetTrigger && student.line_user_id

  console.log('--- Send Logic Determination ---')
  console.log(`- isLineTargetTrigger ("enrollment_completed" is in list): ${isLineTargetTrigger}`)
  console.log(`- shouldSendToLine (hasLineLinked && isLineTargetTrigger): ${!!shouldSendToLine}`)

  if (shouldSendToLine) {
    // LINE送信メッセージの作成
    const lineMessage = `🎉【本入会手続き完了】\n\n${renderedBody}`
    console.log('>>> Sending to LINE with message:')
    console.log(lineMessage)
    
    // 実際に lineService.pushMessage を呼ぶのと同等のモック出力
    console.log(`[Success] LINE push would be triggered for user ${student.line_user_id}`)
  } else {
    console.log('>>> Sending via Email...')
    console.log(`- To: ${student.contact_email}`)
    console.log(`- Subject: ${renderedSubject}`)
    console.log(`- Require Approval: ${template.is_approval_required}`)
  }
}

testNotification()
