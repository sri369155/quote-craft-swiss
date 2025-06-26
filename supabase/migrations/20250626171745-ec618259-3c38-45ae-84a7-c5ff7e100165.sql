
-- First, let's drop the existing incomplete tables and recreate them properly
DROP TABLE IF EXISTS public.quotation_items;
DROP TABLE IF EXISTS public.quotations;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.profiles;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    quotation_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')) DEFAULT 'draft',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quotation_items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS quotations_user_id_idx ON quotations(user_id);
CREATE INDEX IF NOT EXISTS quotations_customer_id_idx ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS quotation_items_quotation_id_idx ON quotation_items(quotation_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at 
    BEFORE UPDATE ON quotations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Customers policies
CREATE POLICY "Users can view own customers" ON customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers" ON customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON customers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON customers
    FOR DELETE USING (auth.uid() = user_id);

-- Quotations policies
CREATE POLICY "Users can view own quotations" ON quotations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotations" ON quotations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotations" ON quotations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotations" ON quotations
    FOR DELETE USING (auth.uid() = user_id);

-- Quotation items policies
CREATE POLICY "Users can view quotation items for own quotations" ON quotation_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quotations 
            WHERE quotations.id = quotation_items.quotation_id 
            AND quotations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quotation items for own quotations" ON quotation_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quotations 
            WHERE quotations.id = quotation_items.quotation_id 
            AND quotations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update quotation items for own quotations" ON quotation_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM quotations 
            WHERE quotations.id = quotation_items.quotation_id 
            AND quotations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete quotation items for own quotations" ON quotation_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM quotations 
            WHERE quotations.id = quotation_items.quotation_id 
            AND quotations.user_id = auth.uid()
        )
    );
