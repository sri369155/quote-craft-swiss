import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvoicePDFExport } from '@/hooks/useInvoicePDFExport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Download, Edit2, ArrowLeft, Printer, Edit3 } from 'lucide-react'
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
        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="lrNumber">Delivery No & Date</Label>
            <Input
              id="lrNumber"
              value={editableInvoiceData.lrNumber}
              onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, lrNumber: e.target.value }))}
              placeholder="958"
            />
          </div>
        </div>

        {/* Additional Data Fields with Checkbox */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="showAdditionalFields" />
            <Label htmlFor="showAdditionalFields">Add Additional Invoice Data Fields</Label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="poNumber">P.O. Number</Label>
              <Input
                id="poNumber"
                value={editableInvoiceData.poNumber}
                onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, poNumber: e.target.value }))}
                placeholder="PO-123"
              />
            </div>
            <div>
              <Label htmlFor="senderGstin">Sender GSTIN</Label>
              <Input
                id="senderGstin"
                value={editableInvoiceData.senderGstin}
                onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, senderGstin: e.target.value }))}
                placeholder="24AABCG1234H1Z5"
              />
            </div>
            <div>
              <Label htmlFor="senderPhone">Sender Phone</Label>
              <Input
                id="senderPhone"
                value={editableInvoiceData.senderPhone}
                onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, senderPhone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content - Optimized layout with editable fields */}
      <div className="bg-white border border-gray-300 print:border-0 leading-tight" style={{ 
        color: '#000000', 
        backgroundColor: '#ffffff',
        fontSize: '12px',
        lineHeight: '1.2'
      }}>
        
        {/* Header Section - Full width image */}
        {imagePreferences.useCustomHeader && profile?.header_image_url ? (
          <div className="border-b-2 border-black" style={{ margin: '0 -100vw', width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw' }}>
            <img src={profile.header_image_url} alt="Header" className="w-full max-h-24 object-cover" style={{ width: '100%', maxWidth: 'none' }} />
          </div>
        ) : (
          <div className="bg-blue-800 text-white p-3" style={{ margin: '0 -100vw', width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw' }}>
            <div className="flex justify-between items-center" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
              <div className="text-left">
                <h1 className="text-lg font-bold text-white leading-tight">{profile?.company_name || 'GUJARAT FREIGHT TOOLS'}</h1>
                <p className="text-xs text-blue-100 leading-tight">Manufacturing & Supply of Precision Press Tool & Room Component</p>
                <div className="text-xs mt-1 leading-tight">
                  <p>64, Akshoy Industrial Estate</p>
                  <p>Near New Cloth Market, Ahmedabad - 38562</p>
                </div>
              </div>
              <div className="text-right text-xs leading-tight">
                <p>Tel : {profile?.company_phone || '079-25820309'}</p>
                <p>Web : {profile?.company_email || 'www.gftools.com'}</p>
                <p>Email : info@gftools.com</p>
              </div>
              <div className="w-16 h-16 bg-teal-600 flex items-center justify-center">
                <div className="text-white font-bold text-xs">LOGO</div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-2">
          {/* GST and Invoice Header */}
          <div className="grid grid-cols-3 mb-2 items-center">
            <div className="text-left">
              <p className="font-bold text-xs">GSTIN : {profile?.gst_number || '24HDE7487RE5RT4'}</p>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-blue-900 py-1 px-3 inline-block border border-blue-900">TAX INVOICE</h2>
            </div>
            <div className="text-right">
              <p className="font-bold text-xs">ORIGINAL FOR RECIPIENT</p>
            </div>
          </div>

          {/* Customer and Invoice Details - Editable */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Customer Detail - Editable */}
            <div className="border border-black">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="bg-gray-200 border-b border-black p-1 text-left font-bold text-xs" colSpan={2}>Customer Detail</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-gray-300 p-1 font-semibold w-16 text-xs">M/S</td>
                    <td className="border-b border-gray-300 p-1 text-xs">
                      <Input 
                        value={customer.name} 
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-gray-300 p-1 font-semibold text-xs">Address</td>
                    <td className="border-b border-gray-300 p-1 text-xs">
                      <Textarea 
                        value={customer.address || ''} 
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30 resize-none min-h-0"
                        style={{ fontSize: '12px' }}
                        rows={2}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-gray-300 p-1 font-semibold text-xs">PHONE</td>
                    <td className="border-b border-gray-300 p-1 text-xs">
                      <Input 
                        value={customer.phone || ''} 
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-gray-300 p-1 font-semibold text-xs">GSTIN</td>
                    <td className="border-b border-gray-300 p-1 text-xs">
                      <Input 
                        value="07AQLCC1206D1ZG" 
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1 font-semibold text-xs">Place of Supply</td>
                    <td className="p-1 text-xs">
                      <Input 
                        value={editableInvoiceData.placeOfSupply || 'Delhi ( 07 )'} 
                        onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, placeOfSupply: e.target.value }))}
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Details - Editable */}
            <div>
              <table className="w-full border border-black text-xs">
                <tbody>
                  <tr>
                    <td className="border-b border-black p-1 font-semibold text-xs">Invoice No.</td>
                    <td className="border-b border-black p-1 text-xs">
                      <Input 
                        value={invoice.invoice_number} 
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                    <td className="border-b border-black p-1 font-semibold text-xs">Invoice Date</td>
                    <td className="border-b border-black p-1 text-xs">{format(new Date(invoice.issue_date), 'dd-MMM-yyyy')}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-1 font-semibold text-xs">Challan No.</td>
                    <td className="border-b border-black p-1 text-xs">
                      <Input 
                        value={editableInvoiceData.challanNumber} 
                        onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, challanNumber: e.target.value }))}
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                    <td className="border-b border-black p-1 font-semibold text-xs">Challan Date</td>
                    <td className="border-b border-black p-1 text-xs">{invoice.delivery_date ? format(new Date(invoice.delivery_date), 'dd-MMM-yyyy') : ''}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-1 font-semibold text-xs">P.O. No.</td>
                    <td className="border-b border-black p-1 text-xs">
                      <Input 
                        value={editableInvoiceData.poNumber} 
                        onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, poNumber: e.target.value }))}
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                    <td className="border-b border-black p-1 font-semibold text-xs">Reverse Charge</td>
                    <td className="border-b border-black p-1 text-xs">
                      <select 
                        value={editableInvoiceData.reverseCharge} 
                        onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, reverseCharge: e.target.value }))}
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30 w-full"
                        style={{ fontSize: '12px' }}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-1 font-semibold text-xs">DELIVERY DATE</td>
                    <td className="border-b border-black p-1 text-xs">{invoice.delivery_date ? format(new Date(invoice.delivery_date), 'dd-MMM-yyyy') : ''}</td>
                    <td className="border-b border-black p-1 font-semibold text-xs">Due Date</td>
                    <td className="border-b border-black p-1 text-xs">{format(new Date(invoice.due_date), 'dd-MMM-yyyy')}</td>
                  </tr>
                  <tr>
                    <td className="p-1 font-semibold text-xs" colSpan={2}>Delivery No & Date</td>
                    <td className="p-1 text-xs" colSpan={2}>
                      <Input 
                        value={editableInvoiceData.lrNumber} 
                        onChange={(e) => setEditableInvoiceData(prev => ({ ...prev, lrNumber: e.target.value }))}
                        className="border-0 p-0 h-auto text-xs bg-pink-50/30"
                        style={{ fontSize: '12px' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table - Compact and Optimized */}
          <div className="mb-3" style={{ pageBreakInside: 'avoid' }}>
            <table className="w-full border border-black border-collapse text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 text-left font-bold text-xs">Sr. No.</th>
                  <th className="border border-black p-1 text-left font-bold text-xs">Name of Product / Service</th>
                  <th className="border border-black p-1 text-center font-bold text-xs">HSN / SAC</th>
                  <th className="border border-black p-1 text-center font-bold text-xs">Qty</th>
                  <th className="border border-black p-1 text-right font-bold text-xs">Rate</th>
                  <th className="border border-black p-1 text-right font-bold text-xs">Taxable Value</th>
                  <th className="border border-black p-1 text-center font-bold text-xs" colSpan={2}>IGST</th>
                  <th className="border border-black p-1 text-right font-bold text-xs">Total</th>
                </tr>
                <tr className="bg-gray-200">
                  <th className="border border-black py-0 px-1"></th>
                  <th className="border border-black py-0 px-1"></th>
                  <th className="border border-black py-0 px-1"></th>
                  <th className="border border-black py-0 px-1"></th>
                  <th className="border border-black py-0 px-1"></th>
                  <th className="border border-black py-0 px-1"></th>
                  <th className="border border-black py-0 px-1 text-center font-bold text-xs">%</th>
                  <th className="border border-black py-0 px-1 text-center font-bold text-xs">Amount</th>
                  <th className="border border-black py-0 px-1"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const itemSubtotal = item.quantity * item.unit_price
                  const itemGst = (itemSubtotal * invoice.tax_rate) / 100
                  const itemTotal = itemSubtotal + itemGst
                  
                  return (
                    <tr key={item.id} className="leading-tight">
                      <td className="border border-black p-1 text-center text-xs">{index + 1}</td>
                      <td className="border border-black p-1 text-xs">
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="flex items-center space-x-1 cursor-pointer">
                              <Input 
                                value={item.description} 
                                className="border-0 p-0 h-auto text-xs bg-pink-50/30 font-medium"
                                style={{ fontSize: '11px' }}
                                readOnly
                              />
                              <Edit3 className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <Label htmlFor="description">Edit Item Description</Label>
                              <Textarea
                                id="description"
                                defaultValue={item.description}
                                className="min-h-[100px]"
                                placeholder="Enter detailed item description..."
                              />
                              <Button size="sm" className="w-full">Update Description</Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="border border-black p-1 text-center text-xs">
                        <Input 
                          value={item.hsn_code || '8202'} 
                          className="border-0 p-0 h-auto text-xs bg-pink-50/30 text-center"
                          style={{ fontSize: '11px' }}
                        />
                      </td>
                      <td className="border border-black p-1 text-center text-xs">{item.quantity.toFixed(2)} PCS</td>
                      <td className="border border-black p-1 text-right text-xs">{item.unit_price.toFixed(2)}</td>
                      <td className="border border-black p-1 text-right text-xs">{itemSubtotal.toFixed(2)}</td>
                      <td className="border border-black p-1 text-center text-xs">{invoice.tax_rate.toFixed(1)}</td>
                      <td className="border border-black p-1 text-right text-xs">{itemGst.toFixed(2)}</td>
                      <td className="border border-black p-1 text-right font-bold text-xs">{itemTotal.toFixed(2)}</td>
                    </tr>
                  )
                })}

                {/* Total Row */}
                <tr className="font-bold leading-tight">
                  <td className="border border-black p-1 text-center text-xs" colSpan={3}>Total</td>
                  <td className="border border-black p-1 text-center text-xs">{items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1 text-right text-xs">{subtotal.toFixed(2)}</td>
                  <td className="border border-black p-1">&nbsp;</td>
                  <td className="border border-black p-1 text-right text-xs">{taxAmount.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right text-xs">{grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section - Compact */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Total in words */}
            <div className="border border-black p-2">
              <h3 className="font-bold mb-1 text-xs">Total in words</h3>
              <p className="font-bold text-sm leading-tight">{numberToWords(grandTotal).toUpperCase()} ONLY</p>
              
              {/* Terms and Conditions moved here */}
              <div className="mt-3 border-t border-gray-300 pt-2">
                <h4 className="font-bold mb-1 text-xs">Terms and Conditions</h4>
                <div className="space-y-1">
                  <Textarea 
                    value={termsConditions}
                    onChange={(e) => setTermsConditions(e.target.value)}
                    className="border-0 p-0 h-auto text-xs bg-pink-50/30 resize-none min-h-0 w-full"
                    style={{ fontSize: '9px' }}
                    rows={4}
                  />
                </div>
              </div>
            </div>
            
            {/* Amount breakdown */}
            <div>
              <table className="w-full border border-black text-xs">
                <tbody>
                  <tr>
                    <td className="border-b border-black p-1 font-semibold text-xs">Taxable Amount</td>
                    <td className="border-b border-black p-1 text-right text-xs">{subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-1 font-semibold text-xs">Add : IGST</td>
                    <td className="border-b border-black p-1 text-right text-xs">{taxAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-1 font-semibold text-xs">Total Tax</td>
                    <td className="border-b border-black p-1 text-right text-xs">{taxAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border-b border-black p-1 font-bold text-sm">Total Amount After Tax</td>
                    <td className="border-b border-black p-1 text-right font-bold text-sm">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Details and Terms - Compact with page break control */}
          <div className="grid grid-cols-2 gap-3 mb-3" style={{ pageBreakInside: 'avoid' }}>
            {/* Bank Details - Editable */}
            <div className="border border-black">
              <h3 className="font-bold bg-gray-200 p-1 border-b border-black text-xs">Bank Details</h3>
              <div className="p-2">
                <Textarea 
                  value={editableBankDetails}
                  onChange={(e) => setEditableBankDetails(e.target.value)}
                  className="border-0 p-0 h-auto text-xs bg-pink-50/30 resize-none min-h-0 w-full"
                  style={{ fontSize: '10px' }}
                  rows={4}
                />
              </div>
            </div>

            {/* Signature */}
            <div className="border border-black">
              <h3 className="font-bold bg-gray-200 p-1 border-b border-black text-xs">For {profile?.company_name || 'Gujarat Freight Tools'}</h3>
              <div className="p-2 text-center h-20 flex flex-col justify-between">
                {imagePreferences.useCustomSignature && profile?.signature_image_url ? (
                  <img src={profile.signature_image_url} alt="Signature" className="w-24 h-12 object-contain mx-auto" />
                ) : (
                  <div className="text-center text-gray-500 text-xs leading-tight">
                    This is computer generated<br/>
                    invoice no signature required.
                  </div>
                )}
                <div className="border-t border-black pt-1 mt-2">
                  <p className="font-bold text-xs">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>


          {/* Certification Statement */}
          <div className="text-center text-xs font-semibold pt-2 border-t border-gray-200 mb-2">
            Certified that the particulars given above are true and correct.
          </div>

          {/* Footer - Full width image with page break control at 0.5 inch above */}
          <div style={{ marginTop: '0.5in', pageBreakInside: 'avoid' }}>
            {imagePreferences.useCustomFooter && profile?.footer_image_url ? (
              <div className="border-t-2 border-black pt-2 -mx-4" style={{ width: '100vw', maxWidth: 'none', marginLeft: '-1rem', marginRight: '-1rem' }}>
                <img src={profile.footer_image_url} alt="Footer" className="w-full max-h-16 object-cover" style={{ width: '100vw', maxWidth: 'none', marginTop: '0', marginBottom: '0' }} />
              </div>
            ) : (
              <div className="text-center text-xs text-gray-600 border-t border-gray-300 pt-1">
                Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')} | Thank you for your business
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoicePreview