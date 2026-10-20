import { NextRequest, NextResponse } from 'next/server';
import { processLeaveManagement } from '@/actions/leave';
import { processWithdrawalManagement } from '@/actions/withdrawal';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // CRON_SECRET による認証チェック（設定されている場合）
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dryRun = searchParams.get('dry_run') === 'true';
  const targetDate = searchParams.get('target_date') || undefined; // YYYY-MM-DD 指定テスト用
  const targetStudentId = searchParams.get('student_id') || undefined;

  try {
    const [leaveResult, withdrawalResult] = await Promise.all([
      processLeaveManagement({
        dryRun,
        targetDate,
        targetStudentId,
      }),
      processWithdrawalManagement({
        dryRun,
        targetDate,
        targetStudentId,
      }),
    ]);

    return NextResponse.json({
      leave: leaveResult,
      withdrawal: withdrawalResult,
    }, { status: (leaveResult.success && withdrawalResult.success) ? 200 : 500 });
  } catch (error: any) {
    console.error('[Cron:LeaveManagement] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
