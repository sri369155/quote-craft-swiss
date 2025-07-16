import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Printer, Download, Edit, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { cn, numberToWords } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { Invoice, Customer, InvoiceItem } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

interface InvoicePreviewProps {
  invoiceId: string | null
  invoice?: Invoice
  onEdit?: () => void
  onBack?: () => void
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoiceId, invoice: propInvoice, onEdit, onBack }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(propInvoice || null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  // Editable text states similar to quotation preview
  const [editableText, setEditableText] = useState({
    companyName: profile?.company_name || '',
    tagline: profile?.company_slogan || '"Engineering Tomorrow\'s Technologies, Today"',
    gstNumber: profile?.gst_number ? `GST: ${profile.gst_number}` : 'GST: 37ABDFB9225A1Z5',
    termsTitle: 'Payment Terms',
    paymentTerm: 'Payment Due: As per due date',
    gstTerm: 'GST: As indicated',
    transportTerm: 'Transport: NA',
    signatureText: 'Thank you for your business',
    signatureRole1: 'Authorized Signatory',
    signatureRole2: 'Company Name',
    footerAddress1: profile?.company_address?.split(',')[0]?.trim() || '',
    footerAddress2: profile?.company_address?.split(',').slice(1).join(',').trim() || '',
    footerPhone: profile?.company_phone || '',
    footerEmail: profile?.company_email ? `Email: ${profile.company_email}` : '',
    grandTotalText: 'Total Amount (in words):',
    grandTotalDescription: 'As per calculation above',
    roundedText: 'Rounded',
    totalText: 'Total Amount'
  })

  // Spacing controls
  const [spacing, setSpacing] = useState({
    headerSpacing: 6,
    invoiceLabelSpacing: 4,
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
    if (invoiceId && !propInvoice) {
      fetchInvoice()
    } else if (propInvoice) {
      setInvoice(propInvoice)
      fetchCustomer(propInvoice.customer_id)
    }
  }, [invoiceId, propInvoice])

  useEffect(() => {
    if (profile && invoice) {
      setEditableText(prev => ({
        ...prev,
        companyName: profile.company_name || 'Your Company',
        tagline: profile.company_slogan || '"Engineering Tomorrow\'s Technologies, Today"',
        gstNumber: profile.gst_number ? `GST: ${profile.gst_number}` : 'GST: 37ABDFB9225A1Z5',
        footerAddress1: profile.company_address?.split(',')[0]?.trim() || '',
        footerAddress2: profile.company_address?.split(',').slice(1).join(',').trim() || '',
        footerPhone: profile.company_phone || '',
        footerEmail: profile.company_email ? `Email: ${profile.company_email}` : ''
      }))
    }
  }, [profile, invoice])

  const fetchInvoice = async () => {
    if (!invoiceId) return

    setIsLoading(true)
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (invoiceError) throw invoiceError

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at')

      if (itemsError) throw itemsError

      setInvoice(invoiceData as Invoice)
      setItems(itemsData)
      fetchCustomer(invoiceData.customer_id)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast({
        title: "Error",
        description: "Failed to fetch invoice",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (error) throw error
      setCustomer(data)
    } catch (error) {
      console.error('Error fetching customer:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    try {
      const element = document.getElementById('invoice-preview')
      if (!element) return

      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`invoice-${invoice?.invoice_number || 'preview'}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      })
    }
  }

  const updateEditableText = (field: string, value: string) => {
    setEditableText(prev => ({ ...prev, [field]: value }))
  }

  const updateSpacing = (field: string, value: number) => {
    setSpacing(prev => ({ ...prev, [field]: value }))
  }

  const updateImagePreference = (field: string, value: boolean) => {
    setImagePreferences(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  if (!invoice) {
    return <div className="text-center text-gray-500">No invoice data available</div>
  }

  const totalInWords = numberToWords(Number(invoice.total_amount))

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex justify-between items-center print:hidden">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex space-x-2">
          <Button onClick={onEdit} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Image and Spacing Controls */}
      <div className="print:hidden border rounded-lg p-4 space-y-4">
        <div className="text-sm font-medium">Customization Options:</div>
        
        {/* Image Selection Controls */}
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
        
        {/* Spacing Controls */}
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
              value={spacing.invoiceLabelSpacing}
              onChange={(e) => updateSpacing('invoiceLabelSpacing', parseInt(e.target.value))}
              className="w-12"
            />
            <span>{spacing.invoiceLabelSpacing}</span>
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
        </div>
      </div>

      {/* Invoice Preview */}
      <Card>
        <CardContent className="p-0">
          <div id="invoice-preview" className="min-h-[297mm] bg-white p-8" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: `${spacing.headerSpacing * 0.25}rem` 
          }}>
            {/* Header Section */}
            <div className="relative">
              {imagePreferences.useCustomHeader && profile?.header_image_url ? (
                <div className="w-full rounded-lg overflow-hidden mb-6">
                  <img 
                    src={profile.header_image_url} 
                    alt="Header" 
                    className="w-full h-auto max-h-32 object-contain"
                  />
                </div>
              ) : (
                <div className="bg-orange-600 text-foreground p-4 rounded-lg relative mb-6">
                  {/* GST Number - Top Right */}
                  <div className="absolute top-2 right-4">
                    <Input
                      value={editableText.gstNumber}
                      onChange={(e) => updateEditableText('gstNumber', e.target.value)}
                      className="font-bold bg-transparent border-0 p-0 text-foreground placeholder-foreground/70 text-right print:hidden"
                    />
                    <p className="hidden print:block font-bold">{editableText.gstNumber}</p>
                  </div>

                  {/* Company Name and Logo - Center */}
                  <div className="flex flex-col items-center justify-center pt-6 pb-4">
                    <div className="flex items-center gap-4">
                      {/* Company Logo */}
                      {profile?.company_logo_url && (
                        <img 
                          src={profile.company_logo_url} 
                          alt="Company Logo" 
                          className="h-16 w-16 object-contain"
                        />
                      )}
                      
                      {/* Company Name */}
                      <div className="text-center">
                        <Input
                          value={editableText.companyName || profile?.company_name || 'Your Company'}
                          onChange={(e) => updateEditableText('companyName', e.target.value)}
                          className="text-3xl font-bold bg-transparent border-0 p-0 text-center text-foreground placeholder-foreground/70 print:hidden"
                        />
                        <h1 className="hidden print:block text-3xl font-bold">{editableText.companyName}</h1>
                        
                        <Input
                          value={editableText.tagline}
                          onChange={(e) => updateEditableText('tagline', e.target.value)}
                          className="text-sm bg-transparent border-0 p-0 text-center text-foreground/80 placeholder-foreground/70 print:hidden mt-1"
                        />
                        <p className="hidden print:block text-sm text-foreground/80 mt-1">{editableText.tagline}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Title - Bold and Underlined */}
            <div className="text-center" style={{ marginBottom: `${spacing.invoiceLabelSpacing * 0.25}rem` }}>
              <h2 className="text-4xl font-bold underline decoration-2 text-gray-800 mb-2">INVOICE</h2>
              <p className="text-lg font-semibold text-primary">
                #{invoice.invoice_number}
              </p>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-2 gap-8 mb-6" style={{ marginBottom: `${spacing.detailsSpacing * 0.25}rem` }}>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">From:</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{profile?.company_name || 'Your Company'}</p>
                  {profile?.company_address && (
                    <p className="whitespace-pre-line">{profile.company_address}</p>
                  )}
                  {profile?.company_email && <p>Email: {profile.company_email}</p>}
                  {profile?.company_phone && <p>Phone: {profile.company_phone}</p>}
                  {profile?.gst_number && <p>GST: {profile.gst_number}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Bill To:</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{customer?.name}</p>
                  {customer?.address && (
                    <p className="whitespace-pre-line">{customer.address}</p>
                  )}
                  {customer?.email && <p>Email: {customer.email}</p>}
                  {customer?.phone && <p>Phone: {customer.phone}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Invoice Details:</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-lg">{invoice.title}</p>
                  {invoice.description && (
                    <p className="text-sm text-gray-600">{invoice.description}</p>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Issue Date:</span>
                    <span>{format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Due Date:</span>
                    <span>{invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      invoice.status === 'paid' && "bg-green-100 text-green-800",
                      invoice.status === 'sent' && "bg-blue-100 text-blue-800",
                      invoice.status === 'draft' && "bg-gray-100 text-gray-800",
                      invoice.status === 'overdue' && "bg-red-100 text-red-800",
                      invoice.status === 'cancelled' && "bg-gray-100 text-gray-600"
                    )}>
                      {invoice.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-6" style={{ marginBottom: `${spacing.tableSpacing * 0.25}rem` }}>
              <h3 className="font-semibold text-gray-800 mb-4">Invoice Items</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left font-semibold">Description</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold w-20">HSN Code</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold w-20">Qty</th>
                      <th className="border border-gray-300 p-3 text-right font-semibold w-24">Unit Price</th>
                      <th className="border border-gray-300 p-3 text-right font-semibold w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3">
                          <div className="text-sm">{item.description}</div>
                        </td>
                        <td className="border border-gray-300 p-3 text-center text-sm">
                          {(item as any).hsn_code || '-'}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {item.quantity}
                        </td>
                        <td className="border border-gray-300 p-3 text-right">
                          ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border border-gray-300 p-3 text-right font-medium">
                          ₹{Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-6" style={{ marginBottom: `${spacing.totalSpacing * 0.25}rem` }}>
              <div className="w-80">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span>Subtotal:</span>
                    <span>₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {invoice.tax_rate > 0 && (
                    <div className="flex justify-between py-1">
                      <span>Tax ({invoice.tax_rate}%):</span>
                      <span>₹{Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-lg">
                    <Input
                      value={editableText.roundedText}
                      onChange={(e) => updateEditableText('roundedText', e.target.value)}
                      className="border-0 p-0 bg-transparent text-lg font-bold print:hidden"
                    />
                    <span className="hidden print:block">{editableText.roundedText}</span>
                    <span>₹{Math.round(Number(invoice.total_amount)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>GST ({Number(invoice.tax_rate)}%):</span>
                    <span>₹{Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>{editableText.totalText}:</span>
                      <span>₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <strong>{editableText.grandTotalText}</strong><br />
                    {totalInWords} only
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mb-6" style={{ marginBottom: `${spacing.termsSpacing * 0.25}rem` }}>
              <Input
                value={editableText.termsTitle}
                onChange={(e) => updateEditableText('termsTitle', e.target.value)}
                className="font-semibold text-gray-800 mb-3 bg-transparent border-0 p-0 print:hidden"
              />
              <h3 className="hidden print:block font-semibold text-gray-800 mb-3">{editableText.termsTitle}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <Input
                    value={editableText.paymentTerm}
                    onChange={(e) => updateEditableText('paymentTerm', e.target.value)}
                    className="bg-transparent border-0 p-0 text-sm print:hidden"
                  />
                  <p className="hidden print:block">{editableText.paymentTerm}</p>
                </div>
                <div>
                  <Input
                    value={editableText.gstTerm}
                    onChange={(e) => updateEditableText('gstTerm', e.target.value)}
                    className="bg-transparent border-0 p-0 text-sm print:hidden"
                  />
                  <p className="hidden print:block">{editableText.gstTerm}</p>
                </div>
                <div>
                  <Input
                    value={editableText.transportTerm}
                    onChange={(e) => updateEditableText('transportTerm', e.target.value)}
                    className="bg-transparent border-0 p-0 text-sm print:hidden"
                  />
                  <p className="hidden print:block">{editableText.transportTerm}</p>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="flex justify-end">
              <div className="text-center">
                {imagePreferences.useCustomSignature && profile?.signature_image_url ? (
                  <img 
                    src={profile.signature_image_url} 
                    alt="Signature" 
                    className="h-16 w-auto mx-auto mb-2"
                  />
                ) : (
                  <div className="h-16 w-32 border-b border-gray-300 mb-2"></div>
                )}
                
                <Input
                  value={editableText.signatureRole1}
                  onChange={(e) => updateEditableText('signatureRole1', e.target.value)}
                  className="text-sm font-medium bg-transparent border-0 p-0 text-center print:hidden"
                />
                <p className="hidden print:block text-sm font-medium">{editableText.signatureRole1}</p>
                
                <Input
                  value={editableText.signatureRole2}
                  onChange={(e) => updateEditableText('signatureRole2', e.target.value)}
                  className="text-xs text-gray-600 bg-transparent border-0 p-0 text-center print:hidden"
                />
                <p className="hidden print:block text-xs text-gray-600">{editableText.signatureRole2}</p>
              </div>
            </div>

            {/* Footer */}
            {imagePreferences.useCustomFooter && profile?.footer_image_url && (
              <div className="mt-8 text-center" style={{ marginTop: `${spacing.footerSpacing * 0.25}rem` }}>
                <img 
                  src={profile.footer_image_url} 
                  alt="Footer" 
                  className="w-full h-auto max-h-24 object-contain"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InvoicePreview