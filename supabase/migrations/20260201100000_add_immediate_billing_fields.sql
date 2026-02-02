-- Migration: Add Immediate Billing Fields
-- Date: 2026-02-01

-- 1. Add new columns for Refund and Payment Intent
ALTER TABLE public.lesson_schedules
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS refund_id TEXT,
ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'pending';

-- Add check constraint for refund_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lesson_schedules_refund_status_check'
    ) THEN
        ALTER TABLE public.lesson_schedules
        ADD CONSTRAINT lesson_schedules_refund_status_check
        CHECK (refund_status IN ('none', 'full', 'partial'));
    END IF;
END $$;


-- 2. Update billing_status check constraint
-- We need to support new statuses: 'awaiting_payment', 'paid', 'refunded', 'partially_refunded', 'cancelled'

DO $$
BEGIN
    -- Drop old constraint if exists (assuming standard naming or trial naming)
    -- We try to catch common names. If checking constraint names is hard, we can just look up the table constraints.
    -- For now, we assume 'lesson_schedules_billing_status_check' is the likely name.
    -- If it was created inline without name, it might be 'lesson_schedules_billing_status_check1' etc.
    -- To be safe, we will just ADD the new values if it was an ENUM? No, user code treats it as string.
    
    -- Let's try to drop the specific constraint name.
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lesson_schedules_billing_status_check'
    ) THEN
        ALTER TABLE public.lesson_schedules DROP CONSTRAINT lesson_schedules_billing_status_check;
    END IF;
END $$;

-- Add the new/updated constraint
-- Note: we include OLD statuses too to preserve data integrity.
ALTER TABLE public.lesson_schedules
ADD CONSTRAINT lesson_schedules_billing_status_check
CHECK (billing_status IN (
    -- Old Statuses
    'pending',
    'future_billing',
    'awaiting_approval',
    'approved',
    'ready_to_invoice',
    'invoiced',
    'skipped',
    'error',
    -- New Statuses
    'awaiting_payment',
    'paid',
    'refunded',
    'partially_refunded',
    'cancelled'
));

-- 3. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_schedules_payment_intent_id ON public.lesson_schedules(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_lesson_schedules_billing_status ON public.lesson_schedules(billing_status);
