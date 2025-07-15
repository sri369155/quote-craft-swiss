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
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (invoiceId && !propInvoice) {
      fetchInvoice()
    } else if (propInvoice) {
      setInvoice(propInvoice)
      fetchCustomer(propInvoice.customer_id)
    }
    fetchProfile()
  }, [invoiceId, propInvoice])

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

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const updateItemField = async (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].line_total = newItems[index].quantity * Number(newItems[index].unit_price)
    }
    
    setItems(newItems)

    // Auto-save the item
    if (invoiceId && newItems[index].id) {
      try {
        const { error } = await supabase
          .from('invoice_items')
          .update({
            [field]: value,
            line_total: newItems[index].line_total
          })
          .eq('id', newItems[index].id)

        if (error) throw error

        // Update invoice totals
        await updateInvoiceTotals(newItems)
      } catch (error) {
        console.error('Error updating item:', error)
      }
    }
  }

  const updateInvoiceTotals = async (updatedItems: InvoiceItem[]) => {
    if (!invoice || !invoiceId) return

    const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.line_total), 0)
    const taxAmount = subtotal * (Number(invoice.tax_rate) / 100)
    const total = subtotal + taxAmount

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          subtotal,
          tax_amount: taxAmount,
          total_amount: total
        })
        .eq('id', invoiceId)

      if (error) throw error

      setInvoice(prev => prev ? { ...prev, subtotal, tax_amount: taxAmount, total_amount: total } : null)
    } catch (error) {
      console.error('Error updating invoice totals:', error)
    }
  }

  const updateInvoiceField = async (field: keyof Invoice, value: string) => {
    if (!invoice || !invoiceId) return

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ [field]: value })
        .eq('id', invoiceId)

      if (error) throw error

      setInvoice(prev => prev ? { ...prev, [field]: value } : null)
    } catch (error) {
      console.error('Error updating invoice:', error)
    }
  }

  const updateDueDate = async (date: Date) => {
    if (!invoice || !invoiceId) return

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ due_date: date.toISOString().split('T')[0] })
        .eq('id', invoiceId)

      if (error) throw error

      setInvoice(prev => prev ? { ...prev, due_date: date.toISOString().split('T')[0] } : null)
    } catch (error) {
      console.error('Error updating due date:', error)
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

      {/* Invoice Preview */}
      <Card>
        <CardContent className="p-0">
          <div id="invoice-preview" className="min-h-[297mm] bg-white">
            {/* Header Section with Company Logo/Info */}
            <div className="p-8 border-b">
              {profile?.header_image_url && (
                <div className="mb-6">
                  <img 
                    src={profile.header_image_url} 
                    alt="Header" 
                    className="w-full h-24 object-contain"
                  />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                  {profile?.company_logo_url && (
                    <img 
                      src={profile.company_logo_url} 
                      alt="Company Logo" 
                      className="w-16 h-16 object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-primary">
                      {profile?.company_name || 'Your Company'}
                    </h1>
                    {profile?.company_slogan && (
                      <p className="text-gray-600 mt-1">{profile.company_slogan}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
                  <p className="text-lg font-semibold text-primary mt-1">
                    #{invoice.invoice_number}
                  </p>
                </div>
              </div>

              {/* Company and Customer Info */}
              <div className="grid grid-cols-2 gap-8">
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
              <div className="mt-6 grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Invoice Details:</h3>
                  <div className="space-y-1 text-sm">
                    {isEditing ? (
                      <Input
                        value={invoice.title}
                        onChange={(e) => updateInvoiceField('title', e.target.value)}
                        className="font-medium text-lg print:border-0 print:p-0 print:bg-transparent"
                        onBlur={() => setIsEditing(false)}
                        autoFocus
                      />
                    ) : (
                      <p 
                        className="font-medium text-lg cursor-pointer hover:bg-gray-50 p-1 print:p-0 print:hover:bg-transparent"
                        onClick={() => setIsEditing(true)}
                      >
                        {invoice.title}
                      </p>
                    )}
                    {invoice.description && (
                      <Textarea
                        value={invoice.description}
                        onChange={(e) => updateInvoiceField('description', e.target.value)}
                        className="text-sm border-0 p-1 print:border-0 print:p-0 print:bg-transparent resize-none"
                        rows={2}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Issue Date:</span>
                      <span>{format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Due Date:</span>
                      <div className="print:hidden">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="p-0 h-auto font-normal text-sm hover:bg-gray-50"
                            >
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'Not set'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={invoice.due_date ? new Date(invoice.due_date) : undefined}
                              onSelect={(date) => date && updateDueDate(date)}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <span className="hidden print:inline">
                        {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'Not set'}
                      </span>
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
            </div>

            {/* Items Section */}
            <div className="p-8 pb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Invoice Items</h3>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left font-semibold">Description</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold w-20">Qty</th>
                      <th className="border border-gray-300 p-3 text-right font-semibold w-24">Unit Price</th>
                      <th className="border border-gray-300 p-3 text-right font-semibold w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3">
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Textarea
                                value={item.description}
                                onChange={(e) => updateItemField(index, 'description', e.target.value)}
                                className="border-0 p-0 bg-transparent text-sm resize-none min-h-[40px] print:hidden cursor-pointer"
                              />
                            </HoverCardTrigger>
                            {item.description && (
                              <HoverCardContent className="w-80 max-w-sm">
                                <div className="text-sm">
                                  <p className="font-medium mb-2">Full Description:</p>
                                  <p className="whitespace-pre-wrap break-words">{item.description}</p>
                                </div>
                              </HoverCardContent>
                            )}
                          </HoverCard>
                          <div className="hidden print:block whitespace-pre-wrap">{item.description}</div>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemField(index, 'quantity', Number(e.target.value))}
                            className="w-16 text-center border-0 print:border-0 print:bg-transparent"
                            min="1"
                          />
                        </td>
                        <td className="border border-gray-300 p-3 text-right">
                          <Input
                            type="number"
                            value={Number(item.unit_price)}
                            onChange={(e) => updateItemField(index, 'unit_price', Number(e.target.value))}
                            className="w-20 text-right border-0 print:border-0 print:bg-transparent"
                            step="0.01"
                          />
                        </td>
                        <td className="border border-gray-300 p-3 text-right font-medium">
                          ${Number(item.line_total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden space-y-4">
                {items.map((item, index) => {
                  return (
                    <div key={item.id} className={`grid grid-cols-12 border-b text-sm p-3 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <div className="col-span-5 pr-2">
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Textarea
                              value={item.description}
                              onChange={(e) => updateItemField(index, 'description', e.target.value)}
                              className="border-0 p-0 bg-transparent text-sm resize-none min-h-[40px] print:hidden cursor-pointer"
                            />
                          </HoverCardTrigger>
                          {item.description && (
                            <HoverCardContent className="w-80 max-w-sm">
                              <div className="text-sm">
                                <p className="font-medium mb-2">Full Description:</p>
                                <p className="whitespace-pre-wrap break-words">{item.description}</p>
                              </div>
                            </HoverCardContent>
                          )}
                        </HoverCard>
                        <div className="hidden print:block whitespace-pre-wrap">{item.description}</div>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemField(index, 'quantity', Number(e.target.value))}
                          className="text-center text-sm border-0 print:border-0 print:bg-transparent"
                          min="1"
                        />
                      </div>
                      <div className="col-span-2 px-1">
                        <Input
                          type="number"
                          value={Number(item.unit_price)}
                          onChange={(e) => updateItemField(index, 'unit_price', Number(e.target.value))}
                          className="text-right text-sm border-0 print:border-0 print:bg-transparent"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-3 text-right font-medium self-center">
                        ${Number(item.line_total).toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Totals Section */}
            <div className="px-8 pb-8">
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between pb-2">
                    <span className="font-medium">Subtotal:</span>
                    <span>${Number(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="font-medium">Tax ({Number(invoice.tax_rate)}%):</span>
                    <span>${Number(invoice.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-gray-300 pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold">Total Amount:</span>
                      <span className="text-lg font-bold">${Number(invoice.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Amount in words: </span>
                    <span className="italic">{totalInWords} dollars only</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            {(profile?.footer_image_url || profile?.signature_image_url) && (
              <div className="border-t p-8 space-y-4">
                {profile?.signature_image_url && (
                  <div className="flex justify-end">
                    <div className="text-center">
                      <img 
                        src={profile.signature_image_url} 
                        alt="Signature" 
                        className="h-16 mx-auto mb-2"
                      />
                      <div className="border-t border-gray-400 w-32 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-1">Authorized Signature</p>
                    </div>
                  </div>
                )}
                {profile?.footer_image_url && (
                  <div className="mt-6">
                    <img 
                      src={profile.footer_image_url} 
                      alt="Footer" 
                      className="w-full h-16 object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InvoicePreview