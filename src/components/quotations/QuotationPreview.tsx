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
import { Textarea } from '@/components/ui/textarea'
import { Download, Printer } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Quotation, Customer, QuotationItem } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { numberToWords } from '@/lib/utils'

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
  
  // Editable text states
  const [editableText, setEditableText] = useState({
    salutation: 'Dear Sir,',
    introText: 'We would like to submit our lowest budgetary quote for the supply and installation of the following items:',
    companyName: '',
    tagline: '"Engineering Tomorrow\'s Technologies, Today"',
    gstNumber: 'GST: 37ABDFB9225A1Z5',
    termsTitle: 'Terms & Conditions',
    completionTerm: 'Completion: 90 Days',
    gstTerm: 'GST: As indicated',
    transportTerm: 'Transport: NA',
    signatureText: 'With regards',
    signatureRole1: 'Managing Partner',
    signatureRole2: 'Authorised Signature',
    footerAddress1: 'Door No: 5-5, Vivekananda Nagar,',
    footerAddress2: 'Old Dairy Farm Post, Vishakhapatnam 530040 AP',
    footerPhone: '+91 96032 79555',
    footerEmail: 'Email: bhairavnex@gmail.com',
    grandTotalText: 'Grand Total (in words):',
    grandTotalDescription: 'As per calculation above',
    roundedText: 'Rounded',
    totalText: 'Total'
  })

  // Spacing controls
  const [spacing, setSpacing] = useState({
    headerSpacing: 6,
    quotationLabelSpacing: 4,
    detailsSpacing: 4,
    introSpacing: 6,
    tableSpacing: 6,
    totalSpacing: 6,
    termsSpacing: 8,
    footerSpacing: 8
  })

  // Image preference controls
  const [imagePreferences, setImagePreferences] = useState({
    useCustomHeader: !!profile?.header_image_url,
    useCustomFooter: !!profile?.footer_image_url,
    useCustomSignature: !!profile?.signature_image_url
  })

  useEffect(() => {
    if (quotationId && open) {
      loadQuotationData()
    }
  }, [quotationId, open])

  useEffect(() => {
    if (profile && quotation) {
      setEditableText(prev => ({
        ...prev,
        companyName: profile.company_name || 'BHAIRAVNEX'
      }))
    }
  }, [profile, quotation])

  const updateEditableText = (field: string, value: string) => {
    setEditableText(prev => ({ ...prev, [field]: value }))
  }

  const updateSpacing = (field: string, value: number) => {
    setSpacing(prev => ({ ...prev, [field]: value }))
  }

  const updateImagePreference = (field: string, value: boolean) => {
    setImagePreferences(prev => ({ ...prev, [field]: value }))
  }

  const loadQuotationData = async () => {
    if (!quotationId) return
    
    setLoading(true)
    try {
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .maybeSingle()

      if (quotationError) throw quotationError
      if (!quotationData) {
        toast({
          title: 'Quotation not found',
          description: 'The requested quotation could not be found.',
          variant: 'destructive',
        })
        return
      }

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', quotationData.customer_id)
        .maybeSingle()

      if (customerError) throw customerError
      if (!customerData) {
        toast({
          title: 'Customer not found',
          description: 'The customer associated with this quotation could not be found.',
          variant: 'destructive',
        })
        return
      }

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
      // Create a modified profile object based on image preferences
      const modifiedProfile = profile ? {
        ...profile,
        header_image_url: imagePreferences.useCustomHeader ? profile.header_image_url : null,
        footer_image_url: imagePreferences.useCustomFooter ? profile.footer_image_url : null,
        signature_image_url: imagePreferences.useCustomSignature ? profile.signature_image_url : null
      } : undefined
      
      await exportToPDF(quotation, customer, items, modifiedProfile)
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
          
          {/* Image Selection Controls */}
          <div className="print:hidden border-t pt-4 mt-4">
            <div className="text-sm font-medium mb-2">Image Options:</div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomHeader"
                  checked={imagePreferences.useCustomHeader}
                  onChange={(e) => updateImagePreference('useCustomHeader', e.target.checked)}
                  disabled={!profile?.header_image_url}
                />
                <label htmlFor="useCustomHeader" className={!profile?.header_image_url ? 'text-gray-400' : ''}>
                  Use Custom Header {!profile?.header_image_url && '(Not uploaded)'}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomFooter"
                  checked={imagePreferences.useCustomFooter}
                  onChange={(e) => updateImagePreference('useCustomFooter', e.target.checked)}
                  disabled={!profile?.footer_image_url}
                />
                <label htmlFor="useCustomFooter" className={!profile?.footer_image_url ? 'text-gray-400' : ''}>
                  Use Custom Footer {!profile?.footer_image_url && '(Not uploaded)'}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomSignature"
                  checked={imagePreferences.useCustomSignature}
                  onChange={(e) => updateImagePreference('useCustomSignature', e.target.checked)}
                  disabled={!profile?.signature_image_url}
                />
                <label htmlFor="useCustomSignature" className={!profile?.signature_image_url ? 'text-gray-400' : ''}>
                  Use Custom Signature {!profile?.signature_image_url && '(Not uploaded)'}
                </label>
              </div>
            </div>
          </div>
          
          {/* Spacing Controls */}
          <div className="print:hidden border-t pt-4 mt-4">
            <div className="text-sm font-medium mb-2">Adjust Spacing:</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <label>Header:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.headerSpacing}
                  onChange={(e) => updateSpacing('headerSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.headerSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Label:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.quotationLabelSpacing}
                  onChange={(e) => updateSpacing('quotationLabelSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.quotationLabelSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Details:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.detailsSpacing}
                  onChange={(e) => updateSpacing('detailsSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.detailsSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Intro:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.introSpacing}
                  onChange={(e) => updateSpacing('introSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.introSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Table:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.tableSpacing}
                  onChange={(e) => updateSpacing('tableSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.tableSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Total:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.totalSpacing}
                  onChange={(e) => updateSpacing('totalSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.totalSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Terms:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.termsSpacing}
                  onChange={(e) => updateSpacing('termsSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.termsSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Footer:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.footerSpacing}
                  onChange={(e) => updateSpacing('footerSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.footerSpacing}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* PDF-like Content */}
        <div className="bg-white p-8 print:p-0" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: `${spacing.headerSpacing * 0.25}rem` 
        }}>
          {/* Header Section */}
          <div className="relative">
            {imagePreferences.useCustomHeader && profile?.header_image_url ? (
              <img 
                src={profile.header_image_url} 
                alt="Header" 
                className="w-full h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="bg-orange-600 text-white p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    {/* Editable company name */}
                    <Input
                      value={editableText.companyName || profile?.company_name || 'BHAIRAVNEX'}
                      onChange={(e) => updateEditableText('companyName', e.target.value)}
                      className="text-2xl font-bold bg-transparent border-0 p-0 text-white placeholder-white/70 print:hidden"
                    />
                    <h1 className="hidden print:block text-2xl font-bold">{editableText.companyName || profile?.company_name || 'BHAIRAVNEX'}</h1>
                    
                    {/* Editable tagline */}
                    <Textarea
                      value={editableText.tagline}
                      onChange={(e) => updateEditableText('tagline', e.target.value)}
                      className="text-sm italic bg-transparent border-0 p-0 text-white placeholder-white/70 resize-none min-h-[20px] print:hidden"
                    />
                    <p className="hidden print:block text-sm italic">{editableText.tagline}</p>
                  </div>
                  <div className="text-right">
                    {/* Editable GST number */}
                    <Input
                      value={editableText.gstNumber}
                      onChange={(e) => updateEditableText('gstNumber', e.target.value)}
                      className="font-bold bg-transparent border-0 p-0 text-white placeholder-white/70 text-right print:hidden"
                    />
                    <p className="hidden print:block font-bold">{editableText.gstNumber}</p>
                    <div className="bg-orange-400 w-8 h-8 flex items-center justify-center rounded text-xs mt-2">
                      LOGO
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QUOTATION Label */}
          <div className="text-center" style={{ marginTop: `${spacing.quotationLabelSpacing * 0.25}rem` }}>
            <div className="bg-black text-white px-6 py-2 inline-block font-bold text-lg">
              QUOTATION
            </div>
          </div>

          {/* Quotation Details */}
          <div className="flex justify-between text-sm print:hidden" style={{ marginTop: `${spacing.detailsSpacing * 0.25}rem`, marginBottom: `${spacing.detailsSpacing * 0.25}rem` }}>
            <div className="flex items-center gap-2">
              <span>Quotation No.:</span>
              <Input
                value={quotation.quotation_number}
                onChange={(e) => updateQuotationField('quotation_number', e.target.value)}
                className="h-6 text-sm font-bold border-0 p-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Date:</span>
              <Input
                type="date"
                value={new Date(quotation.created_at).toISOString().split('T')[0]}
                onChange={(e) => updateQuotationField('created_at', e.target.value)}
                className="h-6 text-sm font-bold border-0 p-0 bg-transparent"
              />
            </div>
          </div>
          
          {/* Print version - non-editable */}
          <div className="hidden print:flex justify-between text-sm" style={{ marginTop: `${spacing.detailsSpacing * 0.25}rem`, marginBottom: `${spacing.detailsSpacing * 0.25}rem` }}>
            <span>Quotation No.: <strong>{quotation.quotation_number}</strong></span>
            <span>Date: <strong>{new Date(quotation.created_at).toLocaleDateString('en-GB')}</strong></span>
          </div>

          {/* Salutation and Introduction */}
          <div className="text-sm" style={{ marginTop: `${spacing.introSpacing * 0.25}rem`, marginBottom: `${spacing.introSpacing * 0.25}rem` }}>
            <div className="space-y-3">
            {/* Editable salutation */}
            <Input
              value={editableText.salutation}
              onChange={(e) => updateEditableText('salutation', e.target.value)}
              className="border-0 p-0 bg-transparent text-sm print:hidden"
            />
            <p className="hidden print:block">{editableText.salutation}</p>
            
            {/* Editable intro text */}
            <Textarea
              value={editableText.introText}
              onChange={(e) => updateEditableText('introText', e.target.value)}
              className="border-0 p-0 bg-transparent text-sm resize-none min-h-[40px] print:hidden"
            />
            <p className="hidden print:block">{editableText.introText}</p>
            
            <div className="flex items-center gap-2 print:hidden">
              <span><strong>Sub:</strong></span>
              <Input
                value={quotation.title}
                onChange={(e) => updateQuotationField('title', e.target.value)}
                className="h-6 text-sm font-bold border-0 p-0 bg-transparent flex-1"
              />
            </div>
            <p className="hidden print:block"><strong>Sub: {quotation.title}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-300" style={{ marginTop: `${spacing.tableSpacing * 0.25}rem` }}>
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
                    {/* Editable description */}
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItemField(index, 'description', e.target.value)}
                      className="border-0 p-0 bg-transparent text-sm resize-none min-h-[40px] print:hidden"
                    />
                    {/* Print version */}
                    <div className="hidden print:block whitespace-pre-wrap">{item.description}</div>
                  </div>
                  
                  <div className="col-span-1 text-center">
                    {/* Editable quantity */}
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 text-center border-0 p-0 bg-transparent text-sm print:hidden"
                    />
                    {/* Print version */}
                    <div className="hidden print:block">{item.quantity}</div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    {/* Editable unit price */}
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItemField(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-8 text-center border-0 p-0 bg-transparent text-sm print:hidden"
                    />
                    {/* Print version */}
                    <div className="hidden print:block">{item.unit_price.toFixed(2)}</div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <div>₹{gstAmount.toFixed(2)}</div>
                    <div>({quotation.tax_rate}%)</div>
                  </div>
                  <div className="col-span-2 text-center">{itemTotal.toFixed(2)}</div>
                </div>
              )
            })}

            {/* Subtotal Row */}
            <div className="bg-gray-100 grid grid-cols-12 border-b font-bold text-sm p-3">
              <div className="col-span-5 flex items-center">Sub Total</div>
              <div className="col-span-1"></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 text-center">₹{quotation.tax_amount.toFixed(2)}</div>
              <div className="col-span-2 text-center">₹{quotation.subtotal.toFixed(2)}</div>
            </div>
          </div>

          {/* Grand Total Section */}
          <div className="grid grid-cols-2 border border-gray-300 text-sm" style={{ marginTop: `${spacing.totalSpacing * 0.25}rem` }}>
            <div className="p-3 border-r">
              {/* Editable grand total text */}
              <Input
                value={editableText.grandTotalText}
                onChange={(e) => updateEditableText('grandTotalText', e.target.value)}
                className="font-bold border-0 p-0 bg-transparent text-sm print:hidden"
              />
              <div className="hidden print:block font-bold">{editableText.grandTotalText}</div>
              
              <div className="text-sm">{numberToWords(quotation.total_amount)}</div>
            </div>
            <div className="p-3">
              <div className="flex justify-between">
                <Input
                  value={editableText.roundedText}
                  onChange={(e) => updateEditableText('roundedText', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <span className="hidden print:block">{editableText.roundedText}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <Input
                  value={editableText.totalText}
                  onChange={(e) => updateEditableText('totalText', e.target.value)}
                  className="font-bold text-lg border-0 p-0 bg-transparent print:hidden"
                />
                <span className="hidden print:block">{editableText.totalText}</span>
                <span>₹{quotation.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions and Signature */}
          <div className="grid grid-cols-2 gap-6" style={{ marginTop: `${spacing.termsSpacing * 0.25}rem` }}>
            <div className="border p-4">
              {/* Editable terms title */}
              <Input
                value={editableText.termsTitle}
                onChange={(e) => updateEditableText('termsTitle', e.target.value)}
                className="font-bold text-base mb-3 border-0 p-0 bg-transparent print:hidden"
              />
              <h3 className="hidden print:block font-bold text-base mb-3">{editableText.termsTitle}</h3>
              
              <div className="text-sm space-y-1">
                {/* Editable terms */}
                <Input
                  value={editableText.completionTerm}
                  onChange={(e) => updateEditableText('completionTerm', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.completionTerm}</div>
                
                <Input
                  value={editableText.gstTerm}
                  onChange={(e) => updateEditableText('gstTerm', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.gstTerm}</div>
                
                <Input
                  value={editableText.transportTerm}
                  onChange={(e) => updateEditableText('transportTerm', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.transportTerm}</div>
              </div>
            </div>
            
            <div className="border p-4">
              <div className="text-sm space-y-3">
                {/* Editable signature text */}
                <Input
                  value={editableText.signatureText}
                  onChange={(e) => updateEditableText('signatureText', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.signatureText}</div>
                
                <div className="font-bold text-blue-600">
                  For {editableText.companyName || profile?.company_name || 'BHAIRAVNEX'}
                </div>
                
                {imagePreferences.useCustomSignature && profile?.signature_image_url ? (
                  <img 
                    src={profile.signature_image_url} 
                    alt="Signature" 
                    className="h-16 w-auto"
                  />
                ) : (
                  <div className="h-16 border-b border-gray-300 mt-4 mb-2">
                    <div className="text-xs text-gray-500 pt-12">Signature</div>
                  </div>
                )}
                
                <div className="mt-8">
                  <Input
                    value={editableText.signatureRole1}
                    onChange={(e) => updateEditableText('signatureRole1', e.target.value)}
                    className="border-0 p-0 bg-transparent text-sm print:hidden"
                  />
                  <div className="hidden print:block">{editableText.signatureRole1}</div>
                  
                  <Input
                    value={editableText.signatureRole2}
                    onChange={(e) => updateEditableText('signatureRole2', e.target.value)}
                    className="border-0 p-0 bg-transparent text-sm print:hidden"
                  />
                  <div className="hidden print:block">{editableText.signatureRole2}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: `${spacing.footerSpacing * 0.25}rem` }}>
            {imagePreferences.useCustomFooter && profile?.footer_image_url ? (
              <img 
                src={profile.footer_image_url} 
                alt="Footer" 
                className="w-full h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="bg-orange-600 text-white p-3 rounded-lg text-xs">
                <div className="flex justify-between">
                  <div>
                    {/* Editable footer address */}
                    <Input
                      value={editableText.footerAddress1}
                      onChange={(e) => updateEditableText('footerAddress1', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-white placeholder-white/70 print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerAddress1}</div>
                    
                    <Input
                      value={editableText.footerAddress2}
                      onChange={(e) => updateEditableText('footerAddress2', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-white placeholder-white/70 print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerAddress2}</div>
                  </div>
                  <div className="text-right">
                    {/* Editable footer contact */}
                    <Input
                      value={editableText.footerPhone}
                      onChange={(e) => updateEditableText('footerPhone', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-white placeholder-white/70 text-right print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerPhone}</div>
                    
                    <Input
                      value={editableText.footerEmail}
                      onChange={(e) => updateEditableText('footerEmail', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-white placeholder-white/70 text-right print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerEmail}</div>
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