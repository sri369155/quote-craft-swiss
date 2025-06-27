
-- Create storage bucket for user images
INSERT INTO storage.buckets (id, name, public) VALUES ('user-images', 'user-images', true);

-- Create storage policies for user images
CREATE POLICY "Users can upload their own images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'user-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'user-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'user-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image fields to profiles table
ALTER TABLE profiles ADD COLUMN header_image_url TEXT;
ALTER TABLE profiles ADD COLUMN footer_image_url TEXT;
ALTER TABLE profiles ADD COLUMN signature_image_url TEXT;
