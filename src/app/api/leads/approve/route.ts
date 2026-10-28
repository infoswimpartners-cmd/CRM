import { NextRequest, NextResponse } from 'next/server'
import { approveAndDispatchLead } from '@/lib/lead-approval'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('id')

    if (!leadId) {
        return new NextResponse(
            renderHtmlResponse({
                status: 'error',
                title: 'パラメータエラー',
                message: '案件ID（id）が指定されていません。',
            }),
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    }

    try {
        const result = await approveAndDispatchLead(leadId)

        if (result.alreadyAssigned) {
            return new NextResponse(
                renderHtmlResponse({
                    status: 'info',
                    title: 'すでにアサイン済みです',
                    message: `この案件は既に <strong>${escapeHtml(result.assignedCoachName || 'コーチ')}</strong> にアサインされています。二重配信は行われませんでした。`,
                    leadName: result.leadName,
                }),
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
        }

        if (!result.success) {
            return new NextResponse(
                renderHtmlResponse({
                    status: 'error',
                    title: '承認配信エラー',
                    message: result.error || '案件の配信処理中にエラーが発生しました。',
                }),
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
        }

        return new NextResponse(
            renderHtmlResponse({
                status: 'success',
                title: 'コーチ陣への案内を配信しました',
                message: '事務局による承認が完了し、マッチング対象のコーチおよび全体スペースへ案件案内を送信しました。',
                leadName: result.leadName,
                location: result.location,
                detail: `個別スペース送信: ${result.sentIndividualCount}件 / 全体スペース送信: ${result.sentGeneralCount}件`,
            }),
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    } catch (err: any) {
        return new NextResponse(
            renderHtmlResponse({
                status: 'error',
                title: 'システムエラー',
                message: err.message || '予期せぬエラーが発生しました。',
            }),
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

interface HtmlProps {
    status: 'success' | 'info' | 'error'
    title: string
    message: string
    leadName?: string
    location?: string
    detail?: string
}

function renderHtmlResponse({ status, title, message, leadName, location, detail }: HtmlProps): string {
    const isSuccess = status === 'success'
    const isInfo = status === 'info'
    const icon = isSuccess ? '✅' : isInfo ? 'ℹ️' : '⚠️'
    const badgeColor = isSuccess ? '#10b981' : isInfo ? '#3b82f6' : '#ef4444'

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - スイムパートナーズ事務局</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      max-width: 480px;
      width: 100%;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 32px 24px;
      text-align: center;
      box-sizing: border-box;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
    }
    p {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .info-box {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font-size: 13px;
      color: #334155;
      margin-bottom: 24px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
    }
    .btn {
      display: inline-block;
      width: 100%;
      background: #0284c7;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 12px 0;
      border-radius: 10px;
      transition: background 0.2s;
      box-sizing: border-box;
    }
    .btn:hover {
      background: #0369a1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>

    ${leadName || location || detail ? `
    <div class="info-box">
      ${leadName ? `<div class="info-row"><span class="info-label">顧客名</span><span>${escapeHtml(leadName)} 様</span></div>` : ''}
      ${location ? `<div class="info-row"><span class="info-label">予定プール</span><span>${escapeHtml(location)}</span></div>` : ''}
      ${detail ? `<div class="info-row"><span class="info-label">配信実績</span><span>${escapeHtml(detail)}</span></div>` : ''}
    </div>` : ''}

    <a href="/admin/leads" class="btn">体験レッスン管理画面へ</a>
  </div>
</body>
</html>`
}
