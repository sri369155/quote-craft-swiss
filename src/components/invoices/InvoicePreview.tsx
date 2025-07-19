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
import { CalendarIcon, Download, Edit2, Save, ArrowLeft } from 'lucide-react'
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

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
          <Button onClick={handleExportPDF} disabled={pdfLoading}>
            <Download className="w-4 h-4 mr-2" />
            {pdfLoading ? 'Exporting...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Export Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="signature" checked={showSignature} onCheckedChange={(checked) => setShowSignature(checked === true)} />
            <Label htmlFor="signature">Include signature block</Label>
          </div>
          <div className="space-y-2">
            <Label>Line Spacing: {lineSpacing[0].toFixed(1)}</Label>
            <Slider value={lineSpacing} onValueChange={setLineSpacing} max={2} min={0.8} step={0.1} className="w-32" />
          </div>
        </CardContent>
      </Card>

      <Card className="p-8" style={{ lineHeight: lineSpacing[0] }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{profile?.company_name || 'Your Company'}</h1>
          {profile?.company_slogan && <p className="text-gray-600 mb-2">{profile.company_slogan}</p>}
          <div className="text-sm text-gray-600">
            {profile?.company_address && <p>{profile.company_address}</p>}
            <div className="flex justify-center space-x-4 mt-1">
              {profile?.company_phone && <span>Ph: {profile.company_phone}</span>}
              {profile?.company_email && <span>Email: {profile.company_email}</span>}
              {profile?.gst_number && <span>GST: {profile.gst_number}</span>}
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">INVOICE</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="space-y-3">
            <div><strong>Invoice No:</strong> {invoice.invoice_number}</div>
            <div><strong>Issue Date:</strong> {invoice.issue_date ? format(new Date(invoice.issue_date), 'dd/MM/yyyy') : 'N/A'}</div>
            {invoice.due_date && <div><strong>Due Date:</strong> {format(new Date(invoice.due_date), 'dd/MM/yyyy')}</div>}
          </div>
          <div className="space-y-3">
            {invoice.order_number && <div><strong>Order No:</strong> {invoice.order_number}</div>}
            {invoice.order_date && <div><strong>Order Date:</strong> {format(new Date(invoice.order_date), 'dd/MM/yyyy')}</div>}
            {invoice.delivery_number && <div><strong>Delivery No:</strong> {invoice.delivery_number}</div>}
            {invoice.delivery_date && <div><strong>Delivery Date:</strong> {format(new Date(invoice.delivery_date), 'dd/MM/yyyy')}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="font-bold mb-2">Bill To:</h3>
            <div className="text-sm">
              <p className="font-medium">{customer.name}</p>
              {customer.address && <p>{customer.address}</p>}
              {customer.email && <p>Email: {customer.email}</p>}
              {customer.phone && <p>Phone: {customer.phone}</p>}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">Ship To:</h3>
            <div className="text-sm">
              {invoice.consignee_name ? (
                <>
                  <p className="font-medium">{invoice.consignee_name}</p>
                  {invoice.consignee_address && <p>{invoice.consignee_address}</p>}
                  {invoice.consignee_gstin && <p>GSTIN: {invoice.consignee_gstin}</p>}
                  {invoice.consignee_email && <p>Email: {invoice.consignee_email}</p>}
                  {invoice.consignee_phone && <p>Phone: {invoice.consignee_phone}</p>}
                </>
              ) : (
                <p className="text-gray-500 italic">Same as billing address</p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">S.No</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-left">HSN</th>
                <th className="border p-2 text-center">Qty</th>
                <th className="border p-2 text-right">Rate</th>
                <th className="border p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{item.description}</td>
                  <td className="border p-2">{item.hsn_code || '-'}</td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="border p-2 text-right">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between mb-2">
                <span>GST ({invoice.tax_rate}%):</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p><strong>Amount in words:</strong> {numberToWords(invoice.total_amount)} Rupees Only</p>
        </div>

        {showSignature && (
          <div className="flex justify-end mt-12">
            <div className="text-center">
              <div className="mb-16"></div>
              <div className="border-t border-gray-300 pt-2">
                <p className="text-sm font-medium">Authorized Signature</p>
                <p className="text-xs text-gray-600">{profile?.company_name || 'Company Name'}</p>
              </div>
            </div>
          </div>
        )}

        {(profile?.bank_name || profile?.bank_account_number) && (
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs">
            <p className="font-medium mb-1">Bank Details</p>
            <div className="text-gray-600 space-x-4">
              {profile?.bank_name && <span>Bank: {profile.bank_name}</span>}
              {profile?.bank_account_number && <span>A/c: {profile.bank_account_number}</span>}
              {profile?.bank_ifsc_code && <span>IFSC: {profile.bank_ifsc_code}</span>}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}