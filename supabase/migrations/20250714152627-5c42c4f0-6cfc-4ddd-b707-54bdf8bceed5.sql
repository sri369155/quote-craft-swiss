-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  issue_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Users can view own invoices" 
ON public.invoices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" 
ON public.invoices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" 
ON public.invoices 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for invoice_items
CREATE POLICY "Users can view invoice items for own invoices" 
ON public.invoice_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM invoices 
  WHERE invoices.id = invoice_items.invoice_id 
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can insert invoice items for own invoices" 
ON public.invoice_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM invoices 
  WHERE invoices.id = invoice_items.invoice_id 
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can update invoice items for own invoices" 
ON public.invoice_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM invoices 
  WHERE invoices.id = invoice_items.invoice_id 
  AND invoices.user_id = auth.uid()
));

CREATE POLICY "Users can delete invoice items for own invoices" 
ON public.invoice_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM invoices 
  WHERE invoices.id = invoice_items.invoice_id 
  AND invoices.user_id = auth.uid()
));

-- Add foreign key constraint
ALTER TABLE public.invoice_items 
ADD CONSTRAINT invoice_items_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();