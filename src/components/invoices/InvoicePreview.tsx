import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvoicePDFExport } from '@/hooks/useInvoicePDFExport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  const [frequentAddresses, setFrequentAddresses] = useState<any[]>([])
  
  // Editable fields
  const [editableBankDetails, setEditableBankDetails] = useState('')
  const [termsConditions, setTermsConditions] = useState('1. Subject to Ahmedabad Jurisdiction.\n2. Our responsibility ceases as soon as the goods leave our premises.\n3. Goods once sold will not be taken back.\n4. Delivery ex-premises.')
  const [editableInvoiceData, setEditableInvoiceData] = useState({
    challanNumber: '',
    lrNumber: '',
    ewayNumber: '',
    reverseCharge: 'No',
    placeOfSupply: '',
    senderAddress: '',
    senderGstin: '',
    senderPhone: '',
    poNumber: ''
  })
  
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
      const bankDetails = `Bank Name: ${profile.bank_name || 'State Bank of India'}\nBranch Name: ${profile.bank_branch || 'RAF CAMP'}\nBank Account Number: ${profile.bank_account_number || '20000000004512'}\nBank Branch IFSC: ${profile.bank_ifsc_code || 'SBIN0000488'}`
      setEditableBankDetails(bankDetails)
    }

    fetchFrequentAddresses()
  }, [invoiceId, passedInvoice, profile])

  const fetchFrequentAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('frequent_addresses')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(5)
      
      if (error) throw error
      setFrequentAddresses(data || [])
    } catch (error) {
      console.error('Error fetching frequent addresses:', error)
    }
  }

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

      // Set editable invoice data
      setEditableInvoiceData({
        challanNumber: data.challan_number || '',
        lrNumber: data.lr_number || '',
        ewayNumber: data.eway_number || '',
        reverseCharge: data.reverse_charge ? 'Yes' : 'No',
        placeOfSupply: data.place_of_supply || '',
        senderAddress: data.sender_address || '',
        senderGstin: data.sender_gstin || '',
        senderPhone: data.sender_phone || '',
        poNumber: data.po_number || ''
      })
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
    
    // Create modified profile with image preferences and editable data
    const modifiedProfile = profile ? {
      ...profile,
      header_image_url: imagePreferences.useCustomHeader ? profile.header_image_url : null,
      footer_image_url: imagePreferences.useCustomFooter ? profile.footer_image_url : null,
      signature_image_url: imagePreferences.useCustomSignature ? profile.signature_image_url : null
    } : undefined
    
    const modifiedInvoice = {
      ...invoice,
      ...editableInvoiceData,
      reverse_charge: editableInvoiceData.reverseCharge === 'Yes'
    }
    
    await exportToPDF(modifiedInvoice as Invoice, customer, items, modifiedProfile, { 
      bankDetails: editableBankDetails, 
      termsConditions 
    })
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
  const taxAmount = invoice ? invoice.tax_amount : 0
  const grandTotal = invoice ? invoice.total_amount : 0

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>
  if (!invoice || !customer) return <div className="text-center text-gray-500">Invoice not found</div>

  return (
    <div className="max-w-6xl mx-auto print:shadow-none" style={{ backgroundColor: '#ffffff' }}>
      {/* Controls Section */}
      <div className="flex justify-between items-start mb-8 print:hidden bg-gray-50 p-4 rounded-lg">
        <h1 className="text-3xl font-bold text-primary">Invoice Preview</h1>
        <div className="flex space-x-2">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {onEdit && (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExportPDF} disabled={pdfLoading} size="sm" className="bg-primary hover:bg-primary/90">
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

      {/* Editable Fields */}
      <div className="print:hidden bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              className="font-mono text-sm"
              rows={4}
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

        {/* Additional Invoice Fields */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="challanNumber">Challan No.</Label>
            <Input
              id="challanNumber"
              value={editableInvoiceData.challanNumber}
              onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, challanNumber: e.target.value }))}
              placeholder="865"
            />
          </div>
          <div>
            <Label htmlFor="lrNumber">L.R. No.</Label>
            <Input
              id="lrNumber"
              value={editableInvoiceData.lrNumber}
              onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, lrNumber: e.target.value }))}
              placeholder="958"
            />
          </div>
          <div>
            <Label htmlFor="ewayNumber">E-Way No.</Label>
            <Input
              id="ewayNumber"
              value={editableInvoiceData.ewayNumber}
              onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, ewayNumber: e.target.value }))}
              placeholder="EWB54864584"
            />
          </div>
        </div>
      </div>

      {/* Invoice Content - Exact match to uploaded image */}
      <div className="bg-white border border-gray-300 print:border-0" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
        
        {/* Header Section */}
        {imagePreferences.useCustomHeader && profile?.header_image_url ? (
          <div className="text-center border-b-2 border-black">
            <img src={profile.header_image_url} alt="Header" className="w-full max-h-32 object-contain" />
          </div>
        ) : (
          <div className="bg-blue-800 text-white p-4 text-center">
            <div className="flex justify-between items-center">
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white">{profile?.company_name || 'GUJARAT FREIGHT TOOLS'}</h1>
                <p className="text-sm text-blue-100">Manufacturing & Supply of Precision Press Tool & Room Component</p>
                <div className="text-xs mt-2">
                  <p>64, Akshoy Industrial Estate</p>
                  <p>Near New Cloth Market,</p>
                  <p>Ahmedabad - 38562</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p>Tel : {profile?.company_phone || '079-25820309'}</p>
                <p>Web : {profile?.company_email || 'www.gftools.com'}</p>
                <p>Email : info@gftools.com</p>
              </div>
              <div className="w-20 h-20 bg-teal-600 flex items-center justify-center">
                <div className="text-white font-bold text-xs">LOGOTEXT</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* GST and Invoice Header */}
          <div className="grid grid-cols-3 mb-4">
            <div className="text-left">
              <p className="font-bold">GSTIN : {profile?.gst_number || '24HDE7487RE5RT4'}</p>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold bg-black text-white py-1 px-4 inline-block">TAX INVOICE</h2>
            </div>
            <div className="text-right">
              <p className="font-bold">ORIGINAL FOR RECIPIENT</p>
            </div>
          </div>

          {/* Customer and Invoice Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Customer Detail */}
            <div className="border-2 border-black">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="bg-gray-200 border-b border-black p-2 text-left font-bold" colSpan={2}>Customer Detail</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-gray-300 p-2 font-semibold w-20">M/S</td>
                    <td className="border-b border-gray-300 p-2">{customer.name}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-gray-300 p-2 font-semibold">Address</td>
                    <td className="border-b border-gray-300 p-2">{customer.address}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-gray-300 p-2 font-semibold">PHONE</td>
                    <td className="border-b border-gray-300 p-2">{customer.phone}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-gray-300 p-2 font-semibold">GSTIN</td>
                    <td className="border-b border-gray-300 p-2">07AQLCC1206D1ZG</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Place of Supply</td>
                    <td className="p-2">{editableInvoiceData.placeOfSupply || 'Delhi ( 07 )'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Details */}
            <div>
              <table className="w-full border-2 border-black">
                <tbody>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">Invoice No.</td>
                    <td className="border-b border-black p-2">{invoice.invoice_number}</td>
                    <td className="border-b border-black p-2 font-semibold">Invoice Date</td>
                    <td className="border-b border-black p-2">{format(new Date(invoice.issue_date), 'dd-MMM-yyyy')}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">Challan No.</td>
                    <td className="border-b border-black p-2">{editableInvoiceData.challanNumber}</td>
                    <td className="border-b border-black p-2 font-semibold">Challan Date</td>
                    <td className="border-b border-black p-2">{invoice.delivery_date ? format(new Date(invoice.delivery_date), 'dd-MMM-yyyy') : ''}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">P.O. No.</td>
                    <td className="border-b border-black p-2">{editableInvoiceData.poNumber}</td>
                    <td className="border-b border-black p-2 font-semibold">Reverse Charge</td>
                    <td className="border-b border-black p-2">{editableInvoiceData.reverseCharge}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">DELIVERY DATE</td>
                    <td className="border-b border-black p-2">{invoice.delivery_date ? format(new Date(invoice.delivery_date), 'dd-MMM-yyyy') : ''}</td>
                    <td className="border-b border-black p-2 font-semibold">Due Date</td>
                    <td className="border-b border-black p-2">{format(new Date(invoice.due_date), 'dd-MMM-yyyy')}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">L.R. No.</td>
                    <td className="border-b border-black p-2">{editableInvoiceData.lrNumber}</td>
                    <td className="p-2 font-semibold">E-Way No.</td>
                    <td className="p-2">{editableInvoiceData.ewayNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border-2 border-black border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 text-left font-bold">Sr. No.</th>
                  <th className="border border-black p-2 text-left font-bold">Name of Product / Service</th>
                  <th className="border border-black p-2 text-center font-bold">HSN / SAC</th>
                  <th className="border border-black p-2 text-center font-bold">Qty</th>
                  <th className="border border-black p-2 text-right font-bold">Rate</th>
                  <th className="border border-black p-2 text-right font-bold">Taxable Value</th>
                  <th className="border border-black p-2 text-center font-bold" colSpan={2}>IGST</th>
                  <th className="border border-black p-2 text-right font-bold">Total</th>
                </tr>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1"></th>
                  <th className="border border-black p-1"></th>
                  <th className="border border-black p-1"></th>
                  <th className="border border-black p-1"></th>
                  <th className="border border-black p-1"></th>
                  <th className="border border-black p-1"></th>
                  <th className="border border-black p-1 text-center font-bold">%</th>
                  <th className="border border-black p-1 text-center font-bold">Amount</th>
                  <th className="border border-black p-1"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const itemSubtotal = item.quantity * item.unit_price
                  const itemGst = (itemSubtotal * invoice.tax_rate) / 100
                  const itemTotal = itemSubtotal + itemGst
                  
                  return (
                    <tr key={item.id}>
                      <td className="border border-black p-2 text-center">{index + 1}</td>
                      <td className="border border-black p-2">
                        <div className="font-medium">{item.description}</div>
                      </td>
                      <td className="border border-black p-2 text-center">{item.hsn_code || '8202'}</td>
                      <td className="border border-black p-2 text-center">{item.quantity.toFixed(2)} PCS</td>
                      <td className="border border-black p-2 text-right">{item.unit_price.toFixed(2)}</td>
                      <td className="border border-black p-2 text-right">{itemSubtotal.toFixed(2)}</td>
                      <td className="border border-black p-2 text-center">{invoice.tax_rate.toFixed(1)}</td>
                      <td className="border border-black p-2 text-right">{itemGst.toFixed(2)}</td>
                      <td className="border border-black p-2 text-right font-bold">{itemTotal.toFixed(2)}</td>
                    </tr>
                  )
                })}
                
                {/* Empty rows for spacing */}
                {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, index) => (
                  <tr key={`empty-${index}`}>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                    <td className="border border-black p-4">&nbsp;</td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="font-bold">
                  <td className="border border-black p-2 text-center" colSpan={3}>Total</td>
                  <td className="border border-black p-2 text-center">{items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}</td>
                  <td className="border border-black p-2">&nbsp;</td>
                  <td className="border border-black p-2 text-right">{subtotal.toFixed(2)}</td>
                  <td className="border border-black p-2">&nbsp;</td>
                  <td className="border border-black p-2 text-right">{taxAmount.toFixed(2)}</td>
                  <td className="border border-black p-2 text-right">{grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Total in words */}
            <div className="border-2 border-black p-4">
              <h3 className="font-bold mb-2">Total in words</h3>
              <p className="font-bold text-lg">{numberToWords(grandTotal).toUpperCase()} ONLY</p>
            </div>
            
            {/* Amount breakdown */}
            <div>
              <table className="w-full border-2 border-black">
                <tbody>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">Taxable Amount</td>
                    <td className="border-b border-black p-2 text-right">{subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">Add : IGST</td>
                    <td className="border-b border-black p-2 text-right">{taxAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">Total Tax</td>
                    <td className="border-b border-black p-2 text-right">{taxAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-bold text-lg">Total Amount After Tax</td>
                    <td className="border-b border-black p-2 text-right font-bold text-lg">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold"></td>
                    <td className="p-2 text-right text-sm">(E & O.E.)</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-2 font-semibold">GST Payable on Reverse Charge</td>
                    <td className="border-b border-black p-2 text-right">N.A.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Details and Terms */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Bank Details */}
            <div className="border-2 border-black">
              <h3 className="font-bold bg-gray-200 p-2 border-b border-black">Bank Details</h3>
              <div className="p-4">
                <div className="whitespace-pre-wrap text-sm">{editableBankDetails}</div>
              </div>
            </div>

            {/* Signature */}
            <div className="border-2 border-black">
              <h3 className="font-bold bg-gray-200 p-2 border-b border-black">For {profile?.company_name || 'Gujarat Freight Tools'}</h3>
              <div className="p-4 text-center h-32 flex flex-col justify-between">
                {imagePreferences.useCustomSignature && profile?.signature_image_url ? (
                  <img src={profile.signature_image_url} alt="Signature" className="w-32 h-16 object-contain mx-auto" />
                ) : (
                  <div className="text-center text-gray-500 text-xs">
                    This is computer generated<br/>
                    invoice no signature required.
                  </div>
                )}
                <div className="border-t border-black pt-2 mt-4">
                  <p className="font-bold">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border-2 border-black">
            <h3 className="font-bold bg-gray-200 p-2 border-b border-black">Terms and Conditions</h3>
            <div className="p-4">
              <div className="whitespace-pre-wrap text-sm">{termsConditions}</div>
              <div className="mt-4 text-center text-sm font-semibold">
                Certified that the particulars given above are true and correct.
              </div>
            </div>
          </div>

          {/* Footer */}
          {imagePreferences.useCustomFooter && profile?.footer_image_url ? (
            <div className="mt-6 border-t-2 border-black pt-4">
              <img src={profile.footer_image_url} alt="Footer" className="w-full max-h-20 object-contain" />
            </div>
          ) : (
            <div className="mt-6 text-center text-xs text-gray-600 border-t border-gray-300 pt-2">
              Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')} | Thank you for your business
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvoicePreview