export type TrioSlotStatus = 'entry' | 'matching' | 'confirmed' | 'closed';
export type TrioEntryPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface TrioSlot {
  id: string;
  created_at: string;
  updated_at: string;
  start_at: string;
  end_at: string;
  status: TrioSlotStatus;
  reserved_count: number;
  is_facility_booked: boolean;
  location?: string;
}

export interface TrioEntry {
  id: string;
  created_at: string;
  slot_id: string;
  student_id: string; // user_idから変更
  payment_status: TrioEntryPaymentStatus;
}
