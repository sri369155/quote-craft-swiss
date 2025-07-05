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
import { Download, Printer } from 'lucide-react'
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

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto print:max-w-none print:h-auto print:overflow-visible">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle>Quotation Preview</DialogTitle>
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
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

        {/* PDF-like Content */}
        <div className="bg-white p-8 space-y-6 print:p-0 print:space-y-4">
          {/* Header Section */}
          <div className="relative">
            {profile?.header_image_url ? (
              <img 
                src={profile.header_image_url} 
                alt="Header" 
                className="w-full h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="bg-orange-600 text-white p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold">{profile?.company_name || 'BHAIRAVNEX'}</h1>
                    <p className="text-sm italic">"Engineering Tomorrow's Technologies, Today"</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">GST: 37ABDFB9225A1Z5</p>
                    <div className="bg-orange-400 w-8 h-8 flex items-center justify-center rounded text-xs mt-2">
                      LOGO
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QUOTATION Label */}
          <div className="text-center">
            <div className="bg-black text-white px-6 py-2 inline-block font-bold text-lg">
              QUOTATION
            </div>
          </div>

          {/* Quotation Details */}
          <div className="flex justify-between text-sm mb-4">
            <span>Quotation No.: <strong>{quotation.quotation_number}</strong></span>
            <span>Date: <strong>{new Date(quotation.created_at).toLocaleDateString('en-GB')}</strong></span>
          </div>

          {/* Salutation and Introduction */}
          <div className="space-y-3 text-sm">
            <p>Dear Sir,</p>
            <p>We would like to submit our lowest budgetary quote for the supply and installation of the following items:</p>
            <p><strong>Sub: {quotation.title}</strong></p>
          </div>

          {/* Items Table */}
          <div className="border border-gray-300">
            {/* Table Header */}
            <div className="bg-gray-100 grid grid-cols-12 border-b font-bold text-sm p-3">
              <div className="col-span-5">Description</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-center">Rate (₹)</div>
              <div className="col-span-2 text-center">GST Amount</div>
              <div className="col-span-2 text-center">Total (₹)</div>
            </div>
            
            {/* Table Rows */}
            {items.map((item, index) => {
              const itemSubtotal = item.quantity * item.unit_price
              const gstAmount = (itemSubtotal * quotation.tax_rate) / 100
              const itemTotal = itemSubtotal + gstAmount
              
              return (
                <div key={item.id} className={`grid grid-cols-12 border-b text-sm p-3 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <div className="col-span-5 pr-2">
                    <div className="whitespace-pre-wrap">{item.description}</div>
                  </div>
                  <div className="col-span-1 text-center">{item.quantity}</div>
                  <div className="col-span-2 text-center">{item.unit_price.toFixed(2)}</div>
                  <div className="col-span-2 text-center">
                    <div>₹{gstAmount.toFixed(2)}</div>
                    <div>({quotation.tax_rate}%)</div>
                  </div>
                  <div className="col-span-2 text-center">{itemTotal.toFixed(2)}</div>
                </div>
              )
            })}

            {/* Total GST Row */}
            <div className="bg-gray-100 grid grid-cols-12 border-b font-bold text-sm p-3">
              <div className="col-span-7"></div>
              <div className="col-span-2 text-center">Total GST:</div>
              <div className="col-span-2 text-center">₹{quotation.total_amount.toFixed(2)}</div>
            </div>
          </div>

          {/* Grand Total Section */}
          <div className="grid grid-cols-2 border border-gray-300 text-sm">
            <div className="p-3 border-r">
              <div className="font-bold">Grand Total (in words):</div>
              <div>As per calculation above</div>
            </div>
            <div className="p-3">
              <div className="flex justify-between">
                <span>Rounded</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{quotation.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions and Signature */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="border p-4">
              <h3 className="font-bold text-base mb-3">Terms & Conditions</h3>
              <div className="text-sm space-y-1">
                <div>Completion: 90 Days</div>
                <div>GST: As indicated</div>
                <div>Transport: NA</div>
              </div>
            </div>
            
            <div className="border p-4">
              <div className="text-sm space-y-3">
                <div>With regards</div>
                <div className="font-bold text-blue-600">
                  For {profile?.company_name || 'BHAIRAVNEX'}
                </div>
                
                {profile?.signature_image_url && (
                  <img 
                    src={profile.signature_image_url} 
                    alt="Signature" 
                    className="h-16 w-auto"
                  />
                )}
                
                <div className="mt-8">
                  <div>Managing Partner</div>
                  <div>Authorised Signature</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8">
            {profile?.footer_image_url ? (
              <img 
                src={profile.footer_image_url} 
                alt="Footer" 
                className="w-full h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="bg-orange-600 text-white p-3 rounded-lg text-xs">
                <div className="flex justify-between">
                  <div>
                    <div>Door No: 5-5, Vivekananda Nagar,</div>
                    <div>Old Dairy Farm Post, Vishakhapatnam 530040 AP</div>
                  </div>
                  <div className="text-right">
                    <div>+91 96032 79555</div>
                    <div>Email: bhairavnex@gmail.com</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}