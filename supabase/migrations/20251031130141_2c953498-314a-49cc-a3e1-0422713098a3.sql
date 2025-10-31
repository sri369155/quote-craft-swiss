-- Create table for storing multiple custom images
CREATE TABLE public.custom_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_type TEXT NOT NULL CHECK (image_type IN ('header', 'footer', 'signature')),
  image_url TEXT NOT NULL,
  image_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own custom images" 
ON public.custom_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom images" 
ON public.custom_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom images" 
ON public.custom_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom images" 
ON public.custom_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_images_updated_at
BEFORE UPDATE ON public.custom_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_custom_images_user_type ON public.custom_images(user_id, image_type);