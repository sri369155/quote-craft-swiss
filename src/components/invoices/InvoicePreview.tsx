import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Invoice, InvoiceItem, Customer, Profile } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Download, Edit, Trash2, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useInvoicePDFExport } from '@/hooks/useInvoicePDFExport'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface InvoicePreviewProps {
  invoiceId?: string
  invoice?: Invoice
  onEdit: () => void
  onBack: () => void
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoiceId, invoice, onEdit, onBack }) => {
  const [editableInvoice, setEditableInvoice] = useState<Invoice | null>(null)
  const [editableItems, setEditableItems] = useState<InvoiceItem[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [newItem, setNewItem] = useState({ description: '', hsn_code: '', quantity: 1, unit_price: 0 })
  const [includeHeader, setIncludeHeader] = useState(true)
  const [includeFooter, setIncludeFooter] = useState(true)
  const [includeSignature, setIncludeSignature] = useState(true)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { exportToPDF, loading: pdfLoading } = useInvoicePDFExport()

  // Fetch invoice data
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return invoice
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!invoiceId,
  })

  // Fetch invoice items
  const { data: items = [] } = useQuery({
    queryKey: ['invoice-items', invoiceId || invoice?.id],
    queryFn: async () => {
      const id = invoiceId || invoice?.id
      if (!id) return []
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!(invoiceId || invoice?.id),
  })

  // Fetch customer data
  const { data: customer } = useQuery({
    queryKey: ['customer', (invoiceData || invoice)?.customer_id],
    queryFn: async () => {
      const customerId = (invoiceData || invoice)?.customer_id
      if (!customerId) return null
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!((invoiceData || invoice)?.customer_id),
  })

  // Fetch user profile
  const { data: userProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data
    },
  })

  const currentInvoice = invoiceData || invoice

  useEffect(() => {
    if (currentInvoice) {
      // Properly type the invoice to match our Invoice interface
      const typedInvoice: Invoice = {
        id: currentInvoice.id,
        user_id: currentInvoice.user_id,
        customer_id: currentInvoice.customer_id,
        invoice_number: currentInvoice.invoice_number,
        title: currentInvoice.title,
        description: currentInvoice.description,
        status: (currentInvoice.status || 'draft') as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
        subtotal: currentInvoice.subtotal,
        tax_rate: currentInvoice.tax_rate,
        tax_amount: currentInvoice.tax_amount,
        total_amount: currentInvoice.total_amount,
        issue_date: currentInvoice.issue_date,
        due_date: currentInvoice.due_date,
        order_number: currentInvoice.order_number,
        order_date: currentInvoice.order_date,
        delivery_number: currentInvoice.delivery_number,
        delivery_date: currentInvoice.delivery_date,
        delivery_challan_number: currentInvoice.delivery_challan_number,
        delivery_challan_date: currentInvoice.delivery_challan_date,
        eway_lr_number: currentInvoice.eway_lr_number,
        consignee_name: currentInvoice.consignee_name,
        consignee_address: currentInvoice.consignee_address,
        consignee_gstin: currentInvoice.consignee_gstin,
        consignee_email: currentInvoice.consignee_email,
        consignee_phone: currentInvoice.consignee_phone,
        created_at: currentInvoice.created_at,
        updated_at: currentInvoice.updated_at
      }
      setEditableInvoice(typedInvoice)
    }
  }, [currentInvoice])

  useEffect(() => {
    if (items) {
      setEditableItems(items)
    }
  }, [items])

  // Auto-generate invoice number
  useEffect(() => {
    if (currentInvoice && !currentInvoice.invoice_number) {
      generateInvoiceNumber()
    }
  }, [currentInvoice])

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      let nextNumber = 1
      if (data && data.length > 0) {
        const lastNumber = data[0].invoice_number
        const numericPart = lastNumber.match(/\d+/)
        if (numericPart) {
          nextNumber = parseInt(numericPart[0]) + 1
        }
      }

      const newInvoiceNumber = `INV-${nextNumber.toString().padStart(4, '0')}`
      
      if (currentInvoice) {
        await supabase
          .from('invoices')
          .update({ invoice_number: newInvoiceNumber })
          .eq('id', currentInvoice.id)
        
        setEditableInvoice(prev => prev ? { ...prev, invoice_number: newInvoiceNumber } : null)
      }
    } catch (error) {
      console.error('Error generating invoice number:', error)
    }
  }

  const handleInputChange = (field: keyof Invoice, value: string) => {
    setEditableInvoice(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...editableItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = typeof value === 'number' && field === 'quantity' ? value : updatedItems[index].quantity
      const unitPrice = typeof value === 'number' && field === 'unit_price' ? value : updatedItems[index].unit_price
      updatedItems[index].line_total = quantity * unitPrice
    }
    
    setEditableItems(updatedItems)
  }

  const handleAddItem = () => {
    if (newItem.description.trim()) {
      const item: InvoiceItem = {
        id: crypto.randomUUID(),
        invoice_id: currentInvoice?.id || '',
        description: newItem.description,
        hsn_code: newItem.hsn_code || null,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        line_total: newItem.quantity * newItem.unit_price,
        created_at: new Date().toISOString()
      }
      setEditableItems([...editableItems, item])
      setNewItem({ description: '', hsn_code: '', quantity: 1, unit_price: 0 })
    }
  }

  const handleRemoveItem = (index: number) => {
    setEditableItems(editableItems.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!editableInvoice) return

    try {
      // Calculate totals
      const subtotal = editableItems.reduce((sum, item) => sum + item.line_total, 0)
      const taxAmount = (subtotal * editableInvoice.tax_rate) / 100
      const totalAmount = subtotal + taxAmount

      // Update invoice - ensure status is properly typed
      const updateData = {
        ...editableInvoice,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
        status: editableInvoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
      }

      await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', editableInvoice.id)

      // Update items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', editableInvoice.id)

      for (const item of editableItems) {
        await supabase
          .from('invoice_items')
          .insert({
            invoice_id: editableInvoice.id,
            description: item.description,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total
          })
      }

      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoice-items', invoiceId] })
      
      setIsEditing(false)
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      })
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast({
        title: 'Error',
        description: 'Failed to save invoice',
        variant: 'destructive',
      })
    }
  }

  const handleExportPDF = async () => {
    if (!editableInvoice || !customer || !editableItems.length) return

    await exportToPDF(editableInvoice, customer, editableItems, userProfile || undefined)
  }

  if (invoiceLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading invoice...</div>
  }

  if (!currentInvoice) {
    return <div className="flex justify-center items-center min-h-screen">Invoice not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onEdit} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button 
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {pdfLoading ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>

        {/* PDF Export Options */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">PDF Export Options</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-header" 
                  checked={includeHeader}
                  onCheckedChange={(checked) => setIncludeHeader(checked === true)}
                />
                <label htmlFor="include-header" className="text-sm font-medium">
                  Include Header Image
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-footer" 
                  checked={includeFooter}
                  onCheckedChange={(checked) => setIncludeFooter(checked === true)}
                />
                <label htmlFor="include-footer" className="text-sm font-medium">
                  Include Footer Image
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-signature" 
                  checked={includeSignature}
                  onCheckedChange={(checked) => setIncludeSignature(checked === true)}
                />
                <label htmlFor="include-signature" className="text-sm font-medium">
                  Include Signature Image
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Preview */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6 sm:p-8">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="text-sm font-medium mb-2 text-gray-600">
                GSTIN: {userProfile?.gst_number || 'Not Available'}
              </div>
              
              {/* TAX INVOICE with navy blue color and border */}
              <div className="inline-block border-2 border-blue-800 px-6 py-3 mb-3">
                <h1 className="text-xl sm:text-2xl font-bold text-blue-800">
                  <span className="underline">TAX INVOICE</span>
                </h1>
              </div>
              
              <div className="text-sm text-gray-600">
                ORIGINAL FOR RECIPIENT
              </div>
            </div>

            {/* Customer and Invoice Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Customer Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 bg-gray-200 p-3 rounded">Customer Detail</h3>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row">
                    <span className="font-medium w-full sm:w-20 mb-1 sm:mb-0">M/S:</span>
                    <Input
                      value={customer?.name || ''}
                      className="bg-pink-50 border-pink-200 text-sm"
                      disabled
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="font-medium w-full sm:w-20 mb-1 sm:mb-0">Address:</span>
                    <Textarea
                      value={customer?.address || ''}
                      className="bg-pink-50 border-pink-200 text-sm min-h-[80px]"
                      disabled
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="font-medium w-full sm:w-20 mb-1 sm:mb-0">Phone:</span>
                    <Input
                      value={customer?.phone || ''}
                      className="bg-pink-50 border-pink-200 text-sm"
                      disabled
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="font-medium w-full sm:w-20 mb-1 sm:mb-0">GSTIN:</span>
                    <Input
                      value={editableInvoice?.consignee_gstin || ''}
                      onChange={(e) => handleInputChange('consignee_gstin', e.target.value)}
                      className="bg-pink-50 border-pink-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Invoice No.:</span>
                      <Input
                        value={editableInvoice?.invoice_number || ''}
                        className="bg-pink-50 border-pink-200 text-sm"
                        disabled
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Invoice Date:</span>
                      <Input
                        type="date"
                        value={editableInvoice?.issue_date || ''}
                        onChange={(e) => handleInputChange('issue_date', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Delivery Challan No.:</span>
                      <Input
                        value={editableInvoice?.delivery_challan_number || ''}
                        onChange={(e) => handleInputChange('delivery_challan_number', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Delivery Date:</span>
                      <Input
                        type="date"
                        value={editableInvoice?.delivery_challan_date || ''}
                        onChange={(e) => handleInputChange('delivery_challan_date', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Order No.:</span>
                      <Input
                        value={editableInvoice?.order_number || ''}
                        onChange={(e) => handleInputChange('order_number', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Order Date:</span>
                      <Input
                        type="date"
                        value={editableInvoice?.order_date || ''}
                        onChange={(e) => handleInputChange('order_date', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">E-Way/LR No.:</span>
                      <Input
                        value={editableInvoice?.eway_lr_number || ''}
                        onChange={(e) => handleInputChange('eway_lr_number', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Due Date:</span>
                      <Input
                        type="date"
                        value={editableInvoice?.due_date || ''}
                        onChange={(e) => handleInputChange('due_date', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8 overflow-x-auto">
              <div className="min-w-full border border-gray-300">
                <div className="grid grid-cols-12 bg-gray-200 font-medium text-sm min-w-full">
                  <div className="col-span-1 p-3 border-r text-center">Sr.No.</div>
                  <div className="col-span-4 p-3 border-r">Name of Product/Service</div>
                  <div className="col-span-1 p-3 border-r text-center">HSN/SAC</div>
                  <div className="col-span-1 p-3 border-r text-center">Qty</div>
                  <div className="col-span-1 p-3 border-r text-center">Rate</div>
                  <div className="col-span-2 p-3 border-r text-center">Taxable Value</div>
                  <div className="col-span-1 p-3 border-r text-center">IGST %</div>
                  <div className="col-span-1 p-3 text-center">Total</div>
                </div>
                
                {editableItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 text-sm border-t min-w-full">
                    <div className="col-span-1 p-3 border-r text-center">{index + 1}</div>
                    <div className="col-span-4 p-3 border-r">
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="cursor-pointer hover:bg-pink-50 p-2 rounded min-h-[40px] text-sm">
                            {item.description}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Item Description</DialogTitle>
                          </DialogHeader>
                          <Textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="min-h-[100px]"
                            placeholder="Enter item description..."
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="col-span-1 p-3 border-r text-center">
                      <Input
                        value={item.hsn_code || ''}
                        onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                        className="bg-pink-50 border-pink-200 text-center text-sm"
                      />
                    </div>
                    <div className="col-span-1 p-3 border-r text-center">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="bg-pink-50 border-pink-200 text-center text-sm"
                      />
                    </div>
                    <div className="col-span-1 p-3 border-r text-center">
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="bg-pink-50 border-pink-200 text-center text-sm"
                      />
                    </div>
                    <div className="col-span-2 p-3 border-r text-center flex items-center justify-center">
                      ₹{item.line_total.toFixed(2)}
                    </div>
                    <div className="col-span-1 p-3 border-r text-center flex items-center justify-center">
                      {editableInvoice?.tax_rate}%
                    </div>
                    <div className="col-span-1 p-3 text-center flex items-center justify-center">
                      ₹{(item.line_total + (item.line_total * (editableInvoice?.tax_rate || 0)) / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
                
                {/* Add New Item Row */}
                <div className="grid grid-cols-12 text-sm border-t bg-gray-50 min-w-full">
                  <div className="col-span-1 p-3 border-r text-center">
                    <Button
                      onClick={handleAddItem}
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="col-span-4 p-3 border-r">
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Add new item..."
                      className="bg-white border-gray-300 text-sm"
                    />
                  </div>
                  <div className="col-span-1 p-3 border-r">
                    <Input
                      value={newItem.hsn_code}
                      onChange={(e) => setNewItem({ ...newItem, hsn_code: e.target.value })}
                      className="bg-white border-gray-300 text-center text-sm"
                    />
                  </div>
                  <div className="col-span-1 p-3 border-r">
                    <Input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                      className="bg-white border-gray-300 text-center text-sm"
                    />
                  </div>
                  <div className="col-span-1 p-3 border-r">
                    <Input
                      type="number"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                      className="bg-white border-gray-300 text-center text-sm"
                    />
                  </div>
                  <div className="col-span-4 p-3"></div>
                </div>
              </div>
            </div>

            {/* Bank Details and Signature */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold mb-3">Bank Details</h3>
                <div className="space-y-2 text-sm">
                  <div>Bank Name: {userProfile?.bank_name || 'Not Available'}</div>
                  <div>Branch: {userProfile?.bank_branch || 'Not Available'}</div>
                  <div>Account No: {userProfile?.bank_account_number || 'Not Available'}</div>
                  <div>IFSC: {userProfile?.bank_ifsc_code || 'Not Available'}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="mb-4">
                  <div className="text-sm mb-2">For {userProfile?.company_name || 'Company Name'}</div>
                  {userProfile?.signature_image_url && includeSignature && (
                    <img 
                      src={userProfile.signature_image_url} 
                      alt="Signature" 
                      className="h-16 ml-auto mt-2 max-w-full"
                    />
                  )}
                  <div className="text-sm mt-4">Authorised Signatory</div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mb-8">
              <h3 className="font-semibold mb-3">Terms & Conditions</h3>
              <Textarea
                value={editableInvoice?.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="bg-pink-50 border-pink-200 min-h-[100px] text-sm"
                placeholder="Enter terms and conditions..."
              />
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{editableInvoice?.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IGST ({editableInvoice?.tax_rate}%):</span>
                  <span>₹{editableInvoice?.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>₹{editableInvoice?.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Certification line at bottom */}
            <div className="text-center text-xs text-gray-600 mt-8">
              Certified that the particulars given above are true and correct.
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-center">
            <Button onClick={handleSave} className="px-8">
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvoicePreview
