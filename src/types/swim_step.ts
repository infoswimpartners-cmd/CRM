export interface SwimStepSlotSelection {
  sessionNumber: number; // 1 | 2 | 3 | 4
  date: string;          // '2026-10-02' 等
  dateLabel: string;     // '第1回：10月2日（金）'
  classType: 'water_familiarity' | 'crawl_breathing';
  className: string;     // '水慣れ〜キック基礎（17:00〜17:50）' 等
  timeRange: string;     // '17:00〜17:50' | '18:00〜18:50'
}

export interface SwimStepBookingPayload {
  // 保護者様情報
  parentName: string;
  parentKana: string;
  phone: string;
  email: string;

  // お子様情報
  childName: string;
  childKana: string;
  childAge: string;
  birthDate?: string;

  // プラン情報
  planType: 'single' | 'double' | 'full';

  // 選択スロット
  selectedSlots: SwimStepSlotSelection[];

  // 泳力・お悩み
  swimmingExperience?: string;

  // 利用規約同意
  termsAgreed: boolean;

  // LINE情報
  lineUserId?: string;
  lineDisplayName?: string;
}

// プランの価格・名称マスタ定義
export const SWIM_STEP_PLANS = {
  single: {
    name: '1回チケット',
    price: 6500,
    slotsCount: 1,
    description: 'スイムステップ 1回参加チケット（城東小学校プール）',
  },
  double: {
    name: '2回チケット',
    price: 12000,
    slotsCount: 2,
    description: 'スイムステップ 2回参加チケット（城東小学校プール）',
  },
  full: {
    name: '4回チケット（10月完走パック）',
    price: 22000,
    slotsCount: 4,
    description: 'スイムステップ 4回完走パック（城東小学校プール）',
  },
} as const;

export interface SwimStepAdminBooking {
  id: string;
  created_at: string;
  updated_at: string;
  line_user_id: string | null;
  line_display_name: string | null;
  parent_name: string;
  parent_kana: string;
  phone: string;
  email: string;
  child_name: string;
  child_kana: string;
  child_age: string | null;
  birth_date: string | null;
  plan_type: string;
  amount: number;
  payment_status: 'pending' | 'paid' | 'canceled';
  stripe_session_id: string | null;
  selected_slots: SwimStepSlotSelection[];
  swimming_experience: string | null;
  terms_agreed: boolean;
  admin_notes: string | null;
  status: 'confirmed' | 'attended' | 'cancelled';
}

export interface SwimStepSummary {
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  slotCounts: Record<string, number>;
}

// 規定の8スロットのキー定義
export const SWIM_STEP_SLOTS_DEF = [
  {
    sessionNumber: 1,
    date: '2026-10-02',
    dateLabel: '第1回：10月2日（金）',
    classes: [
      { type: 'water_familiarity' as const, label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing' as const, label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
  {
    sessionNumber: 2,
    date: '2026-10-09',
    dateLabel: '第2回：10月9日（金）',
    classes: [
      { type: 'water_familiarity' as const, label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing' as const, label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
  {
    sessionNumber: 3,
    date: '2026-10-16',
    dateLabel: '第3回：10月16日（金）',
    classes: [
      { type: 'water_familiarity' as const, label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing' as const, label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
  {
    sessionNumber: 4,
    date: '2026-10-23',
    dateLabel: '第4回：10月23日（金）',
    classes: [
      { type: 'water_familiarity' as const, label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing' as const, label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
];
