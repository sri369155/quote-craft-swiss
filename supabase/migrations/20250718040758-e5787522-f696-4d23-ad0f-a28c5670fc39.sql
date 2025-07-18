-- Add bank details to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_ifsc_code text,
ADD COLUMN IF NOT EXISTS bank_branch text,
ADD COLUMN IF NOT EXISTS bank_account_type text;

-- Add additional invoice fields
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS order_number text,
ADD COLUMN IF NOT EXISTS order_date date,
ADD COLUMN IF NOT EXISTS delivery_number text,
ADD COLUMN IF NOT EXISTS delivery_date date,
ADD COLUMN IF NOT EXISTS consignee_name text,
ADD COLUMN IF NOT EXISTS consignee_address text,
ADD COLUMN IF NOT EXISTS consignee_gstin text,
ADD COLUMN IF NOT EXISTS consignee_email text,
ADD COLUMN IF NOT EXISTS consignee_phone text;