import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvoicePDFExport } from '@/hooks/useInvoicePDFExport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, Download, Edit2, Save, ArrowLeft, Printer, Image } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
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

export default function InvoicePreview({ invoiceId, invoice: passedInvoice, onEdit, onBack }: InvoicePreviewProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const { exportToPDF, loading: pdfLoading } = useInvoicePDFExport()
  
  const [invoice, setInvoice] = useState<Invoice | null>(passedInvoice || null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(false)
  
  const [showSignature, setShowSignature] = useState(true)
  const [lineSpacing, setLineSpacing] = useState([1.2])
  const [isEditing, setIsEditing] = useState(false)
  const [useHeaderImage, setUseHeaderImage] = useState(false)
  const [useFooterImage, setUseFooterImage] = useState(false)
  const [termsConditions, setTermsConditions] = useState('Terms of Payment: As Per Order')
  const [showTerms, setShowTerms] = useState(true)
  
  const [editableInvoice, setEditableInvoice] = useState({
    orderNumber: '',
    orderDate: null as Date | null,
    deliveryNumber: '',
    deliveryDate: null as Date | null,
    consigneeName: '',
    consigneeAddress: '',
    consigneeGstin: '',
    consigneeEmail: '',
    consigneePhone: ''
  })

  useEffect(() => {
    if (invoiceId && !passedInvoice) {
      fetchInvoice()
    } else if (passedInvoice) {
      setInvoice(passedInvoice)
      fetchCustomer(passedInvoice.customer_id)
      fetchItems(passedInvoice.id)
      loadEditableData(passedInvoice)
    }
  }, [invoiceId, passedInvoice])

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
      loadEditableData(data as Invoice)
      await fetchCustomer(data.customer_id)
      await fetchItems(data.id)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast({ title: 'Error', description: 'Failed to fetch invoice', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadEditableData = (invoiceData: Invoice) => {
    setEditableInvoice({
      orderNumber: invoiceData.order_number || '',
      orderDate: invoiceData.order_date ? new Date(invoiceData.order_date) : null,
      deliveryNumber: invoiceData.delivery_number || '',
      deliveryDate: invoiceData.delivery_date ? new Date(invoiceData.delivery_date) : null,
      consigneeName: invoiceData.consignee_name || '',
      consigneeAddress: invoiceData.consignee_address || '',
      consigneeGstin: invoiceData.consignee_gstin || '',
      consigneeEmail: invoiceData.consignee_email || '',
      consigneePhone: invoiceData.consignee_phone || ''
    })
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
    await exportToPDF(invoice, customer, items, profile, { showSignature, lineSpacing: lineSpacing[0] })
  }

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  // Calculate tax amount for display
  const taxAmount = invoice ? invoice.tax_amount : 0

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>
  if (!invoice || !customer) return <div className="text-center text-gray-500">Invoice not found</div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back
            </Button>
          )}
          <h2 className="text-2xl font-bold">Invoice Preview</h2>
        </div>
        <div className="flex items-center space-x-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />Edit
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
          <Button onClick={handleExportPDF} disabled={pdfLoading}>
            <Download className="w-4 h-4 mr-2" />
            {pdfLoading ? 'Exporting...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Export Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="signature" checked={showSignature} onCheckedChange={(checked) => setShowSignature(checked === true)} />
                <Label htmlFor="signature">Include signature block</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={showTerms} onCheckedChange={(checked) => setShowTerms(checked === true)} />
                <Label htmlFor="terms">Include terms & conditions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="headerImg" checked={useHeaderImage} onCheckedChange={(checked) => setUseHeaderImage(checked === true)} />
                <Label htmlFor="headerImg">Use profile header image</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="footerImg" checked={useFooterImage} onCheckedChange={(checked) => setUseFooterImage(checked === true)} />
                <Label htmlFor="footerImg">Use profile footer image</Label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Line Spacing: {lineSpacing[0].toFixed(1)}</Label>
                <Slider value={lineSpacing} onValueChange={setLineSpacing} max={2} min={0.8} step={0.1} className="w-32" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms-input">Terms & Conditions</Label>
                <Textarea
                  id="terms-input"
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  placeholder="Enter terms and conditions..."
                  className="h-20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="p-8 bg-white text-black print:shadow-none" style={{ lineHeight: lineSpacing[0] }}>
        {/* Header Section */}
        {useHeaderImage && profile?.header_image_url ? (
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

        <div className="grid grid-cols-2 gap-8 mb-6 border border-black">
          <div className="p-4 border-r border-black">
            <h3 className="font-bold mb-3 text-lg">Buyer</h3>
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
            </div>
            {(invoice.order_number || invoice.order_date) && (
              <div className="space-y-1">
                {invoice.order_number && <div><strong>Order No:</strong> {invoice.order_number}</div>}
                {invoice.order_date && <div><strong>Dated:</strong> {format(new Date(invoice.order_date), 'dd/MM/yyyy')}</div>}
              </div>
            )}
          </div>
        </div>


        <div className="mb-6">
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-3 text-left font-bold">Item (a)</th>
                <th className="border border-black p-3 text-left font-bold">Description</th>
                <th className="border border-black p-3 text-center font-bold">Unit</th>
                <th className="border border-black p-3 text-center font-bold">Qty</th>
                <th className="border border-black p-3 text-right font-bold">Rate(Rs)</th>
                <th className="border border-black p-3 text-right font-bold">Total(Rs)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-black p-3 text-center font-medium">({String.fromCharCode(97 + index)})</td>
                  <td className="border border-black p-3">
                    <div className="font-medium">{item.description}</div>
                    {item.hsn_code && <div className="text-xs text-gray-600 mt-1">HSN: {item.hsn_code}</div>}
                  </td>
                  <td className="border border-black p-3 text-center">Nos</td>
                  <td className="border border-black p-3 text-center font-medium">{item.quantity.toString().padStart(2, '0')}</td>
                  <td className="border border-black p-3 text-right font-medium">{item.unit_price.toLocaleString('en-IN')}</td>
                  <td className="border border-black p-3 text-right font-bold">{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              
              {/* GST Row */}
              {invoice.tax_rate > 0 && (
                <tr className="bg-gray-50">
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3 font-bold">GST@ {invoice.tax_rate}%</td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3 text-right font-bold">{invoice.tax_rate}%</td>
                  <td className="border border-black p-3 text-right font-bold">{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              
              {/* Total Row */}
              <tr className="bg-gray-100">
                <td className="border border-black p-3"></td>
                <td className="border border-black p-3 font-bold text-lg">TOTAL: {numberToWords(invoice.total_amount)} only</td>
                <td className="border border-black p-3"></td>
                <td className="border border-black p-3"></td>
                <td className="border border-black p-3 text-right font-bold">Rounded to</td>
                <td className="border border-black p-3 text-right font-bold text-lg">{Math.round(invoice.total_amount).toLocaleString('en-IN')}.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms and Bank Details Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Terms of Payment */}
          {showTerms && (
            <div className="border border-black p-4">
              <h3 className="font-bold mb-2">Terms of Payment:</h3>
              <p className="text-sm whitespace-pre-wrap">{termsConditions}</p>
              
              {(profile?.bank_name || profile?.bank_account_number) && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">Account Details:</h4>
                  <div className="text-sm space-y-1">
                    {profile?.company_name && <p className="font-medium">{profile.company_name}</p>}
                    {profile?.bank_account_number && <p>A/C No. {profile.bank_account_number}</p>}
                    {profile?.bank_ifsc_code && <p>IFSC: {profile.bank_ifsc_code}</p>}
                    {profile?.bank_branch && <p>Branch: {profile.bank_branch}</p>}
                    {profile?.bank_name && <p>Bank: {profile.bank_name}</p>}
                    {profile?.gst_number && <p>GST: {profile.gst_number}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Signature Block */}
          {showSignature && (
            <div className="border border-black p-4 text-center">
              <div className="mb-12">
                {profile?.signature_image_url ? (
                  <img src={profile.signature_image_url} alt="Signature" className="w-32 h-16 object-contain mx-auto" />
                ) : (
                  <div className="h-16 flex items-center justify-center text-gray-400">
                    [Signature Space]
                  </div>
                )}
              </div>
              <div className="border-t border-black pt-2">
                <p className="font-bold">Seal</p>
                <p className="text-sm mt-1">Authorized Signatory</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Section */}
        {useFooterImage && profile?.footer_image_url ? (
          <div className="mt-8">
            <img src={profile.footer_image_url} alt="Footer" className="w-full max-h-20 object-contain" />
          </div>
        ) : (
          <div className="mt-8 pt-4 border-t-2 border-orange-500">
            <div className="text-center text-sm bg-gradient-to-r from-orange-500 to-amber-600 text-white p-3 rounded">
              <p className="font-bold mb-1">We look forward to associate with your organization.</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center">
                  <span className="mr-2">📍</span>
                  <span>{profile?.company_address || 'Door No: 5-5, Vivekananda Nagar, Old Diary Form Post, Vishakaptnam 530040 AP.'}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📞</span>
                  <div>
                    <span>{profile?.company_phone || '+91 96032 79555'}</span>
                    <br />
                    <span>Email: {profile?.company_email || 'bhairavnex@gmail.com'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}