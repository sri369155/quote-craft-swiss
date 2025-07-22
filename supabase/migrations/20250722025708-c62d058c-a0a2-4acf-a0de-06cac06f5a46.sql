-- Add scope_of_work column to quotations table to replace description
ALTER TABLE public.quotations 
ADD COLUMN scope_of_work TEXT;