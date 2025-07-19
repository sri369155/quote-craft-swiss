import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvoicePDFExport } from '@/hooks/useInvoicePDFExport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Edit2, ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { numberToWords } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Invoice, InvoiceItem, Customer } from '@/types/database'

interface InvoicePreviewProps {
  invoiceId?: string
  invoice?: Invoice | null
  onEdit?: () => void
  onBack?: () => void
}

function InvoicePreview({ invoiceId, invoice: passedInvoice, onEdit, onBack }: InvoicePreviewProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const { exportToPDF, loading: pdfLoading } = useInvoicePDFExport()
  
  const [invoice, setInvoice] = useState<Invoice | null>(passedInvoice || null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(false)
  
  // Editable bank details
  const [editableBankDetails, setEditableBankDetails] = useState('')
  const [termsConditions, setTermsConditions] = useState('Payment Terms: Net 30 days\nDelivery: As per schedule\nGST: As indicated')
  
  // Image preference controls
  const [imagePreferences, setImagePreferences] = useState({
    useCustomHeader: !!profile?.header_image_url,
    useCustomFooter: !!profile?.footer_image_url,
    useCustomSignature: !!profile?.signature_image_url
  })

  const updateImagePreference = (field: string, value: boolean) => {
    setImagePreferences(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (invoiceId && !passedInvoice) {
      fetchInvoice()
    } else if (passedInvoice) {
      setInvoice(passedInvoice)
      fetchCustomer(passedInvoice.customer_id)
      fetchItems(passedInvoice.id)
    }
    
    // Initialize bank details from profile
    if (profile) {
      const bankDetails = `Bank Name: ${profile.bank_name || ''}\nIFSC Code: ${profile.bank_ifsc_code || ''}\nAccount No: ${profile.bank_account_number || ''}\nBranch: ${profile.bank_branch || ''}`
      setEditableBankDetails(bankDetails)
    }
  }, [invoiceId, passedInvoice, profile])

  const fetchInvoice = async () => {
    if (!invoiceId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()
      if (error) throw error
      setInvoice(data as Invoice)
      await fetchCustomer(data.customer_id)
      await fetchItems(data.id)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast({ title: 'Error', description: 'Failed to fetch invoice', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single()
      if (error) throw error
      setCustomer(data)
    } catch (error) {
      console.error('Error fetching customer:', error)
    }
  }

  const fetchItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('created_at')
      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const handleExportPDF = async () => {
    if (!invoice || !customer || !items.length) {
      toast({ title: 'Error', description: 'Invoice data not ready for export', variant: 'destructive' })
      return
    }
    
    // Create modified profile with image preferences and bank details
    const modifiedProfile = profile ? {
      ...profile,
      header_image_url: imagePreferences.useCustomHeader ? profile.header_image_url : null,
      footer_image_url: imagePreferences.useCustomFooter ? profile.footer_image_url : null,
      signature_image_url: imagePreferences.useCustomSignature ? profile.signature_image_url : null
    } : undefined
    
    await exportToPDF(invoice, customer, items, modifiedProfile)
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate tax amount for display
  const taxAmount = invoice ? invoice.tax_amount : 0

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>
  if (!invoice || !customer) return <div className="text-center text-gray-500">Invoice not found</div>

  return (
    <div className="max-w-6xl mx-auto bg-white print:shadow-none">
      {/* Controls Section */}
      <div className="flex justify-between items-start mb-8 print:hidden bg-gray-50 p-4 rounded-lg">
        <h1 className="text-3xl font-bold text-primary">Invoice Preview</h1>
        <div className="flex space-x-2">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {onEdit && (
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={pdfLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="w-4 h-4 mr-2" />
            {pdfLoading ? 'Exporting...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Image Selection Controls */}
      <div className="print:hidden bg-gray-50 p-4 rounded-lg mb-6">
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

      {/* Editable Terms and Bank Details */}
      <div className="print:hidden bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
        <div>
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea
            id="terms"
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            className="font-mono text-sm"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="bankDetails">Bank Details</Label>
          <Textarea
            id="bankDetails"
            value={editableBankDetails}
            onChange={(e) => setEditableBankDetails(e.target.value)}
            className="font-mono text-sm"
            rows={4}
          />
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white p-8 border border-gray-200 print:border-0"
           style={{ color: '#000000', backgroundColor: '#ffffff' }}>
        
        {/* Header Section */}
        {imagePreferences.useCustomHeader && profile?.header_image_url ? (
          <div className="mb-8 text-center">
            <img src={profile.header_image_url} alt="Header" className="w-full max-h-32 object-contain" />
          </div>
        ) : (
          <div className="mb-8 p-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-center rounded-lg">
            <h1 className="text-3xl font-bold mb-2">{profile?.company_name || 'BHAIRAVNEX'}</h1>
            {profile?.company_slogan && <p className="text-orange-100 mb-2">"{profile.company_slogan}"</p>}
            <div className="text-sm text-orange-100">
              {profile?.company_address && <p>{profile.company_address}</p>}
              <div className="flex justify-center space-x-4 mt-2">
                {profile?.company_phone && <span>Ph: {profile.company_phone}</span>}
                {profile?.company_email && <span>Email: {profile.company_email}</span>}
                {profile?.gst_number && <span className="bg-orange-700 px-2 py-1 rounded text-xs">GST: {profile.gst_number}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-black text-white py-2 px-4 inline-block">TAX INVOICE</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6 border-2 border-black">
          <div className="p-4 border-r-2 border-black">
            <h3 className="font-bold mb-3 text-lg bg-gray-100 p-2 border-b border-black">Buyer</h3>
            <div className="space-y-1">
              <p className="font-semibold">{customer.name}</p>
              {customer.address && <p className="text-sm">{customer.address}</p>}
              {customer.email && <p className="text-sm">Email: {customer.email}</p>}
              {customer.phone && <p className="text-sm">Contact No.: {customer.phone}</p>}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <div><strong>Seller GSTIN:</strong> {profile?.gst_number || 'N/A'}</div>
              <div><strong>Invoice No:</strong> {invoice.invoice_number}</div>
              <div><strong>Dated:</strong> {invoice.issue_date ? format(new Date(invoice.issue_date), 'dd/MM/yyyy') : 'N/A'}</div>
              <div><strong>Due Date:</strong> {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-2 border-black p-3 text-left font-bold">S.No</th>
                <th className="border-2 border-black p-3 text-left font-bold">Description & HSN Code</th>
                <th className="border-2 border-black p-3 text-center font-bold">Qty</th>
                <th className="border-2 border-black p-3 text-right font-bold">Rate(₹)</th>
                <th className="border-2 border-black p-3 text-right font-bold">GST Amount(₹)</th>
                <th className="border-2 border-black p-3 text-right font-bold">Total(₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const itemSubtotal = item.quantity * item.unit_price
                const itemGst = (itemSubtotal * invoice.tax_rate) / 100
                const itemTotal = itemSubtotal + itemGst
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-black p-3 text-center font-medium">{index + 1}</td>
                    <td className="border border-black p-3">
                      <div className="font-medium">{item.description}</div>
                      {item.hsn_code && <div className="text-xs text-gray-600 mt-1">HSN: {item.hsn_code}</div>}
                    </td>
                    <td className="border border-black p-3 text-center font-medium">{item.quantity}</td>
                    <td className="border border-black p-3 text-right font-medium">{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border border-black p-3 text-right font-medium">{itemGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border border-black p-3 text-right font-bold">{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )
              })}
              
              {/* Subtotal Row */}
              <tr className="bg-gray-100">
                <td className="border-2 border-black p-3 font-bold" colSpan={5}>Sub Total</td>
                <td className="border-2 border-black p-3 text-right font-bold">{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              
              {/* GST Row */}
              {invoice.tax_rate > 0 && (
                <tr className="bg-gray-100">
                  <td className="border-2 border-black p-3 font-bold" colSpan={5}>Total GST @ {invoice.tax_rate}%</td>
                  <td className="border-2 border-black p-3 text-right font-bold">{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              
              {/* Grand Total Row */}
              <tr className="bg-black text-white">
                <td className="border-2 border-black p-3 font-bold text-lg" colSpan={5}>
                  GRAND TOTAL: {numberToWords(invoice.total_amount)} only
                </td>
                <td className="border-2 border-black p-3 text-right font-bold text-lg">
                  ₹{invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms and Bank Details Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Terms of Payment */}
          <div className="border-2 border-black p-4">
            <h3 className="font-bold mb-2 bg-gray-100 p-2 -m-4 mb-2 border-b border-black">Terms & Conditions:</h3>
            <div className="text-sm whitespace-pre-wrap mb-4">{termsConditions}</div>
            
            <h4 className="font-bold mb-2 border-t border-black pt-2">Bank Details:</h4>
            <div className="text-sm whitespace-pre-wrap font-mono">{editableBankDetails}</div>
          </div>
          
          {/* Signature Block */}
          <div className="border-2 border-black p-4 text-center">
            <h3 className="font-bold mb-2 bg-gray-100 p-2 -m-4 mb-4 border-b border-black">For {profile?.company_name || 'BHAIRAVNEX'}</h3>
            <div className="mb-8">
              {imagePreferences.useCustomSignature && profile?.signature_image_url ? (
                <img src={profile.signature_image_url} alt="Signature" className="w-32 h-16 object-contain mx-auto" />
              ) : (
                <div className="h-16 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
                  [Signature Space]
                </div>
              )}
            </div>
            <div className="border-t-2 border-black pt-2">
              <p className="font-bold">Seal & Signature</p>
              <p className="text-sm mt-1">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        {imagePreferences.useCustomFooter && profile?.footer_image_url ? (
          <div className="mt-8">
            <img src={profile.footer_image_url} alt="Footer" className="w-full max-h-20 object-contain" />
          </div>
        ) : (
          <div className="mt-8 pt-4 border-t-2 border-orange-500">
            <div className="text-center text-sm bg-gradient-to-r from-orange-500 to-amber-600 text-white p-3 rounded">
              <p className="font-bold mb-1">Thank you for your business!</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center">
                  <span className="mr-2">📍</span>
                  <span>{profile?.company_address || 'Company Address'}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📞</span>
                  <div>
                    <span>{profile?.company_phone || 'Phone'}</span>
                    <br />
                    <span>Email: {profile?.company_email || 'email@company.com'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvoicePreview