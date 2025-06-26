
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
