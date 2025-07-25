
-- Add new columns to invoices table for the requested changes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_challan_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_challan_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS eway_lr_number TEXT;

-- Update existing columns to match new requirements
-- delivery_number and delivery_date will be renamed to order_number and order_date
-- This is handled in the application layer since we already have order_number and order_date columns
