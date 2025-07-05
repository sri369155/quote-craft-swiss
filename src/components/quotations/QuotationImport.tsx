import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import mammoth from 'mammoth'

export function QuotationImport({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(event.target.files)
  }

  const parseWordDocument = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const parsePDFDocument = async (file: File): Promise<string> => {
    // For PDF parsing, we'll use a simple text extraction
    // In a production app, you might want to use a more sophisticated PDF parser
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await import('pdf-parse')
    const data = await pdf.default(arrayBuffer)
    return data.text
  }

  const extractQuotationData = (text: string) => {
    // Simple parsing logic - in production, you'd want more sophisticated parsing
    const lines = text.split('\n').filter(line => line.trim())
    
    // Try to extract basic quotation information
    const quotationNumber = lines.find(line => 
      line.toLowerCase().includes('quotation') || 
      line.toLowerCase().includes('quote')
    )?.replace(/[^0-9]/g, '') || `IMP-${Date.now()}`
    
    const title = lines.find(line => 
      line.length > 10 && 
      !line.toLowerCase().includes('total') &&
      !line.toLowerCase().includes('amount')
    ) || 'Imported Quotation'
    
    // Extract items (very basic pattern matching)
    const items: Array<{
      description: string
      quantity: number
      unit_price: number
      line_total: number
    }> = []
    
    // Look for patterns like "Item description - Qty: X - Price: Y"
    const itemPattern = /(.+?)\s*[-\s]*(?:qty|quantity)?\s*:?\s*(\d+)\s*[-\s]*(?:price|rate)?\s*:?\s*(\d+(?:\.\d{2})?)/gi
    let match
    while ((match = itemPattern.exec(text)) !== null) {
      const description = match[1].trim()
      const quantity = parseInt(match[2])
      const unit_price = parseFloat(match[3])
      const line_total = quantity * unit_price
      
      if (description && quantity > 0 && unit_price > 0) {
        items.push({
          description,
          quantity,
          unit_price,
          line_total
        })
      }
    }
    
    // If no items found using pattern, try to extract from table-like structure
    if (items.length === 0) {
      const potentialItems = lines.filter(line => {
        const numbers = line.match(/\d+/g)
        return numbers && numbers.length >= 2 && line.length > 10
      })
      
      potentialItems.forEach(line => {
        const parts = line.split(/\s+/)
        const numbers = parts.filter(part => /^\d+(\.\d{2})?$/.test(part))
        if (numbers.length >= 2) {
          items.push({
            description: parts.filter(part => !/^\d+(\.\d{2})?$/.test(part)).join(' ') || 'Imported Item',
            quantity: parseInt(numbers[0]) || 1,
            unit_price: parseFloat(numbers[1]) || 0,
            line_total: (parseInt(numbers[0]) || 1) * (parseFloat(numbers[1]) || 0)
          })
        }
      })
    }
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    const tax_rate = 18 // Default GST rate
    const tax_amount = (subtotal * tax_rate) / 100
    const total_amount = subtotal + tax_amount
    
    return {
      quotation_number: quotationNumber,
      title,
      description: 'Imported from file',
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      items
    }
  }

  const createCustomer = async (name: string) => {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        user_id: user!.id,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@imported.com`
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  const saveQuotationToDatabase = async (quotationData: any, customerId: string) => {
    // Insert quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .insert({
        user_id: user!.id,
        customer_id: customerId,
        quotation_number: quotationData.quotation_number,
        title: quotationData.title,
        description: quotationData.description,
        subtotal: quotationData.subtotal,
        tax_rate: quotationData.tax_rate,
        tax_amount: quotationData.tax_amount,
        total_amount: quotationData.total_amount,
        status: 'draft'
      })
      .select()
      .single()
    
    if (quotationError) throw quotationError
    
    // Insert quotation items
    if (quotationData.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(
          quotationData.items.map((item: any) => ({
            quotation_id: quotation.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total
          }))
        )
      
      if (itemsError) throw itemsError
    }
  }

  const handleImport = async () => {
    if (!files || files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select Word or PDF files to import.',
        variant: 'destructive'
      })
      return
    }

    setIsImporting(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        try {
          let text = ''
          
          if (file.type.includes('word') || file.name.endsWith('.docx')) {
            text = await parseWordDocument(file)
          } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            text = await parsePDFDocument(file)
          } else {
            throw new Error('Unsupported file type')
          }
          
          const quotationData = extractQuotationData(text)
          
          // Create a customer for this import
          const customer = await createCustomer(`Imported Customer ${i + 1}`)
          
          // Save to database
          await saveQuotationToDatabase(quotationData, customer.id)
          
          successCount++
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
          errorCount++
        }
      }
      
      toast({
        title: 'Import completed',
        description: `Successfully imported ${successCount} quotations. ${errorCount > 0 ? `${errorCount} files failed.` : ''}`,
        variant: successCount > 0 ? 'default' : 'destructive'
      })
      
      // Reset file input
      setFiles(null)
      const input = document.getElementById('file-input') as HTMLInputElement
      if (input) input.value = ''
      
      // Notify parent component to refresh data
      if (successCount > 0 && onImportSuccess) {
        onImportSuccess()
      }
      
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import Quotations
        </CardTitle>
        <CardDescription>
          Upload Word or PDF files containing quotations to import them into the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-input">Select Files</Label>
          <Input
            id="file-input"
            type="file"
            multiple
            accept=".docx,.doc,.pdf"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: Word (.docx, .doc) and PDF files
          </p>
        </div>
        
        {files && files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({files.length})</Label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {Array.from(files).map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Button 
          onClick={handleImport} 
          disabled={!files || files.length === 0 || isImporting}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import Quotations
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}