-- Update variables for trial_payment_request to match body usage
UPDATE email_templates
SET variables = ARRAY['name', 'lesson_date', 'amount', 'payment_link']
WHERE key = 'trial_payment_request';
