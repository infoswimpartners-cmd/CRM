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
