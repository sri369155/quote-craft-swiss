-- Add missing fields to invoices table for delivery details
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS challan_number text,
ADD COLUMN IF NOT EXISTS lr_number text,
ADD COLUMN IF NOT EXISTS eway_number text,
ADD COLUMN IF NOT EXISTS reverse_charge boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS place_of_supply text,
ADD COLUMN IF NOT EXISTS sender_address text,
ADD COLUMN IF NOT EXISTS sender_gstin text,
ADD COLUMN IF NOT EXISTS sender_phone text,
ADD COLUMN IF NOT EXISTS po_number text;

-- Create table for frequently used addresses
CREATE TABLE IF NOT EXISTS public.frequent_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  address_type text NOT NULL CHECK (address_type IN ('sender', 'consignee')),
  name text NOT NULL,
  address text NOT NULL,
  gstin text,
  phone text,
  email text,
  usage_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on frequent_addresses
ALTER TABLE public.frequent_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies for frequent_addresses
CREATE POLICY "Users can view own frequent addresses" 
ON public.frequent_addresses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own frequent addresses" 
ON public.frequent_addresses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own frequent addresses" 
ON public.frequent_addresses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own frequent addresses" 
ON public.frequent_addresses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_frequent_addresses_updated_at
BEFORE UPDATE ON public.frequent_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();