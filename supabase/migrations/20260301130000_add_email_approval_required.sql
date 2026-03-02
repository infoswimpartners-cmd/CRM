ALTER TABLE public.email_templates ADD COLUMN is_approval_required BOOLEAN DEFAULT false;
ALTER TABLE public.email_templates ADD COLUMN approver_group_id INTEGER;

-- Set typical payment and important emails to require approval
UPDATE public.email_templates
SET is_approval_required = true
WHERE key IN (
    'trial_payment_request',
    'enrollment_complete',
    'billing_summary',
    'billing_approval_request',
    'immediate_payment_request'
);
