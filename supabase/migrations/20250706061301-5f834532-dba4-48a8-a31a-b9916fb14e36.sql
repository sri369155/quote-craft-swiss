-- Add company details fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_slogan TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo_url TEXT;