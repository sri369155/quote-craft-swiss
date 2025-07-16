-- Add HSN code column to quotation_items table
ALTER TABLE quotation_items ADD COLUMN hsn_code TEXT;

-- Add HSN code column to invoice_items table  
ALTER TABLE invoice_items ADD COLUMN hsn_code TEXT;

-- Add comment for clarity
COMMENT ON COLUMN quotation_items.hsn_code IS 'HSN (Harmonized System of Nomenclature) code for taxation purposes';
COMMENT ON COLUMN invoice_items.hsn_code IS 'HSN (Harmonized System of Nomenclature) code for taxation purposes';