-- Insert profile record for the current user if it doesn't exist
INSERT INTO public.profiles (id, email, full_name, company_name)
SELECT 'c845d1cf-6453-40b0-aa9b-429aad655748', 'bhairavnex@gmail.com', 'Laxman', 'BhairavNex'
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = 'c845d1cf-6453-40b0-aa9b-429aad655748'
);

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();