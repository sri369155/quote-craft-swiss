-- Add preference field for quote generation method
ALTER TABLE profiles 
ADD COLUMN use_image_design boolean DEFAULT false,
ADD COLUMN sample_quote_image_url text;