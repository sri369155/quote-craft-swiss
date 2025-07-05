import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePDFExport } from '@/hooks/usePDFExport'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Quotation, Customer, QuotationItem } from '@/types/database'
import { useToast } from '@/hooks/use-toast'

interface QuotationPreviewProps {
  quotationId: string | null
  open: boolean
  onClose: () => void
}

export default function QuotationPreview({ quotationId, open, onClose }: QuotationPreviewProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const { exportToPDF, loading: pdfLoading } = usePDFExport()
  
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (quotationId && open) {
      loadQuotationData()
    }
  }, [quotationId, open])

  const loadQuotationData = async () => {
    if (!quotationId) return
    
    setLoading(true)
    try {
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single()

      if (quotationError) throw quotationError

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', quotationData.customer_id)
        .single()

      if (customerError) throw customerError

      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at')

      if (itemsError) throw itemsError

      setQuotation(quotationData as Quotation)
      setCustomer(customerData as Customer)
      setItems(itemsData || [])
    } catch (error: any) {
      toast({
        title: 'Error loading quotation',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPreview = async () => {
    if (!quotation || !customer) return
    
    try {
      await exportToPDF(quotation, customer, items, profile || undefined)
    } catch (error: any) {
      toast({
        title: 'Export Error',
        description: error.message || 'Failed to export PDF. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const updateQuotationField = (field: keyof Quotation, value: any) => {
    if (!quotation) return
    setQuotation({ ...quotation, [field]: value })
  }

  const updateItemField = (index: number, field: keyof QuotationItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate totals
    const quantity = field === 'quantity' ? value : updatedItems[index].quantity
    const unitPrice = field === 'unit_price' ? value : updatedItems[index].unit_price
    updatedItems[index].line_total = quantity * unitPrice
    
    setItems(updatedItems)
    
    // Update quotation totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.line_total, 0)
    const taxAmount = (subtotal * (quotation?.tax_rate || 0)) / 100
    const totalAmount = subtotal + taxAmount
    
    setQuotation(prev => prev ? {
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    } : null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!quotation || !customer) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Preview & Edit Quotation</DialogTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadPreview}
                disabled={pdfLoading}
                className="btn-primary"
              >
                <Download className={`w-4 h-4 mr-2 ${pdfLoading ? 'animate-spin' : ''}`} />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quotation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={quotation.title}
                    onChange={(e) => updateQuotationField('title', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="quotation_number">Quotation Number</Label>
                  <Input
                    id="quotation_number"
                    value={quotation.quotation_number}
                    onChange={(e) => updateQuotationField('quotation_number', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quotation.description || ''}
                  onChange={(e) => updateQuotationField('description', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer: {customer.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {customer.email && <div>Email: {customer.email}</div>}
                {customer.phone && <div>Phone: {customer.phone}</div>}
                {customer.address && <div>Address: {customer.address}</div>}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border rounded-lg">
                    <div className="col-span-6">
                      <Label>Description</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateItemField(index, 'description', e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemField(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItemField(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <div className="mt-2 font-medium">
                        {formatCurrency(item.line_total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(quotation.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({quotation.tax_rate}%):</span>
                  <span>{formatCurrency(quotation.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(quotation.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}