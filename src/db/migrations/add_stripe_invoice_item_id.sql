-- Add stripe_invoice_item_id to lessons table
ALTER TABLE lessons ADD COLUMN stripe_invoice_item_id TEXT;
