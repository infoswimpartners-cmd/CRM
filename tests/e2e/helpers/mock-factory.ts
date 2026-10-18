/**
 * モックデータファクトリ & 顧客保護ガード
 * 顧客テスト制約: 会員番号0035、テスト太郎以外のデータ保護を厳格に施行する
 */

export interface TestCustomerRecord {
  id: string;
  student_number: string;
  full_name: string;
  full_name_kana: string;
  gender: string;
  status: 'active' | 'trial' | 'suspended' | 'withdrawn';
  membership_type_id: string;
  membership_name: string;
  coach_id: string;
  coach_name: string;
  created_at: string;
}

export interface TestLessonRecord {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  student_number: string;
  student_name: string;
  coach_name: string;
  pool_name: string;
}

export interface TestKpiData {
  totalStudents: number;
  todayLessonsCount: number;
  activeCoachesCount: number;
  totalSales: number;
  uncollectedAmount: number;
}

/**
 * 顧客データ保護ガード
 * 会員番号0035 / テスト太郎 以外のデータ変更・テスト投入を遮断する
 */
export function assertCustomerProtection(customer: {
  student_number?: string | null;
  full_name?: string | null;
  id?: string | null;
}): void {
  const number = (customer.student_number || '').trim();
  const name = (customer.full_name || '').trim();

  // 許可されるのは会員番号0035、またはテスト太郎のみ
  const isAllowedNumber = number === '0035' || number === '#0035';
  const isAllowedName = name.includes('テスト太郎');

  if (!isAllowedNumber && !isAllowedName) {
    throw new Error(
      `[SECURITY_VIOLATION] 顧客テスト制約違反: 会員番号0035、テスト太郎以外の顧客データ操作は厳格に禁止されています。(検知番号: "${number}", 氏名: "${name}")`
    );
  }
}

/**
 * 許可された唯一の安全なテスト顧客データ
 */
export const ALLOWED_TEST_CUSTOMER: TestCustomerRecord = {
  id: 'cust-0035-taro-uuid',
  student_number: '0035',
  full_name: 'テスト太郎',
  full_name_kana: 'テストタロウ',
  gender: 'male',
  status: 'active',
  membership_type_id: 'membership-weekly-1',
  membership_name: '週1回コース',
  coach_id: 'coach-tanaka-uuid',
  coach_name: '田中コーチ',
  created_at: '2026-01-10T10:00:00Z',
};

/**
 * モックレッスンの安全な生成（会員番号0035のみ）
 */
export function createMockLessons(count: number = 3): TestLessonRecord[] {
  if (count <= 0) return [];
  const lessons: TestLessonRecord[] = [];
  const times = [
    { start: '10:00', end: '11:00' },
    { start: '13:00', end: '14:00' },
    { start: '15:30', end: '16:30' },
    { start: '17:00', end: '18:00' },
  ];

  for (let i = 0; i < count; i++) {
    const time = times[i % times.length];
    lessons.push({
      id: `lesson-0035-${i + 1}`,
      title: `個人水泳レッスン #${i + 1}`,
      start_time: `2026-10-17T${time.start}:00Z`,
      end_time: `2026-10-17T${time.end}:00Z`,
      status: i === 0 ? 'completed' : 'scheduled',
      student_number: ALLOWED_TEST_CUSTOMER.student_number,
      student_name: ALLOWED_TEST_CUSTOMER.full_name,
      coach_name: ALLOWED_TEST_CUSTOMER.coach_name,
      pool_name: '目黒区民センタープール',
    });
  }
  return lessons;
}

/**
 * 4大KPIの計算ロジックモック
 */
export function calculateSchoolHubKpis(
  students: TestCustomerRecord[],
  todayLessons: TestLessonRecord[],
  activeCoaches: string[],
  invoices: { amount: number; status: 'paid' | 'unpaid' }[]
): TestKpiData {
  const activeStudents = students.filter((s) => s.status === 'active' || s.status === 'trial');
  const paidSales = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const uncollected = invoices
    .filter((inv) => inv.status === 'unpaid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return {
    totalStudents: activeStudents.length,
    todayLessonsCount: todayLessons.length,
    activeCoachesCount: activeCoaches.length,
    totalSales: paidSales,
    uncollectedAmount: uncollected,
  };
}
