import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Plus, Trash2, Save, Eye, FileText, Edit, Smartphone } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Customer, Invoice, InvoiceItem } from '@/types/database'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import CustomerForm from '../quotations/CustomerForm'

interface InvoiceItemForm {
  description: string
  hsn_code: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface InvoiceBuilderProps {
  invoiceId?: string
  quotationData?: {
    quotation: any
    customer: any
    items: any[]
  }
  onSave?: (invoice: Invoice) => void
  onPreview?: (invoice: Invoice) => void
  onCancel?: () => void
}

const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({ invoiceId, quotationData, onSave, onPreview, onCancel }) => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [useSignature, setUseSignature] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState('')
  const { toast } = useToast()

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    title: '',
    description: '',
    customerId: '',
    issueDate: new Date(),
    dueDate: new Date(),
    orderDate: null as Date | null,
    deliveryDate: null as Date | null,
    taxRate: 0,
    bankDetails: '',
    challanNumber: '',
    lrNumber: '',
    reverseCharge: false,
    placeOfSupply: '',
    senderAddress: '',
    senderGstin: '',
    senderPhone: '',
    poNumber: '',
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  })

  const [items, setItems] = useState<InvoiceItemForm[]>([
    { description: '', hsn_code: '', quantity: 1, unitPrice: 0, lineTotal: 0 }
  ])

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const taxAmount = subtotal * (invoiceData.taxRate / 100)
  const total = subtotal + taxAmount

  useEffect(() => {
    fetchCustomers()
    if (invoiceId) {
      fetchInvoice()
    } else if (quotationData) {
      loadFromQuotation()
    } else {
      generateInvoiceNumber()
    }
  }, [invoiceId, quotationData])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      })
    }
  }

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
        const match = lastNumber.match(/INV-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: `INV-${nextNumber.toString().padStart(4, '0')}`
      }))
    } catch (error) {
      console.error('Error generating invoice number:', error)
    }
  }

  const fetchInvoice = async () => {
    if (!invoiceId) return

    setIsLoading(true)
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (invoiceError) throw invoiceError

      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at')

      if (itemsError) throw itemsError

      setInvoiceData({
        invoiceNumber: invoice.invoice_number,
        title: invoice.title,
        description: invoice.description || '',
        customerId: invoice.customer_id,
        issueDate: new Date(invoice.issue_date),
        dueDate: new Date(invoice.due_date),
        orderDate: invoice.order_date ? new Date(invoice.order_date) : null,
        deliveryDate: invoice.delivery_date ? new Date(invoice.delivery_date) : null,
        taxRate: Number(invoice.tax_rate),
        bankDetails: '',
        challanNumber: invoice.challan_number || '',
        lrNumber: invoice.lr_number || '',
        reverseCharge: invoice.reverse_charge || false,
        placeOfSupply: invoice.place_of_supply || '',
        senderAddress: invoice.sender_address || '',
        senderGstin: invoice.sender_gstin || '',
        senderPhone: invoice.sender_phone || '',
        poNumber: invoice.po_number || '',
        status: (invoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled') || 'draft'
      })

      setItems(invoiceItems.map(item => ({
        description: item.description,
        hsn_code: item.hsn_code || '',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total)
      })))

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

  const loadFromQuotation = async () => {
    if (!quotationData) return

    try {
      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (lastInvoice && lastInvoice.length > 0) {
        const lastNumber = lastInvoice[0].invoice_number
        const match = lastNumber.match(/INV-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      setInvoiceData({
        invoiceNumber: `INV-${nextNumber.toString().padStart(4, '0')}`,
        title: quotationData.quotation.title,
        description: quotationData.quotation.description || '',
        customerId: quotationData.quotation.customer_id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        orderDate: null,
        deliveryDate: null,
        taxRate: Number(quotationData.quotation.tax_rate),
        bankDetails: '',
        challanNumber: '',
        lrNumber: '',
        reverseCharge: false,
        placeOfSupply: '',
        senderAddress: '',
        senderGstin: '',
        senderPhone: '',
        poNumber: '',
        status: 'draft'
      })

      setItems(quotationData.items.map((item: any) => ({
        description: item.description,
        hsn_code: item.hsn_code || '',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total)
      })))

      toast({
        title: "Success",
        description: "Invoice pre-filled with quotation data",
      })
    } catch (error) {
      console.error('Error loading quotation data:', error)
    }
  }

  const addItem = () => {
    setItems([...items, { description: '', hsn_code: '', quantity: 1, unitPrice: 0, lineTotal: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].lineTotal = newItems[index].quantity * newItems[index].unitPrice
    }
    
    setItems(newItems)
  }

  const generateHSNCode = async (description: string) => {
    if (!description.trim()) return ''
    
    try {
      const { data, error } = await supabase.functions.invoke('openai-autofill', {
        body: {
          prompt: `Generate a 6-digit HSN (Harmonized System of Nomenclature) code for the product/service: "${description}". Return only the 6-digit numeric code without any explanation.`,
          model: 'gpt-4o-mini'
        }
      })

      if (error) {
        console.error('Error generating HSN code:', error)
        return ''
      }

      const hsnCode = data.generatedText?.trim().replace(/\D/g, '').substring(0, 6)
      return hsnCode || ''
    } catch (error) {
      console.error('Error generating HSN code:', error)
      return ''
    }
  }

  const handleAutoGenerateHSN = async (index: number) => {
    const item = items[index]
    if (!item.description) {
      toast({
        title: "Error",
        description: "Please enter a description first before generating HSN code",
        variant: "destructive",
      })
      return
    }

    const hsnCode = await generateHSNCode(item.description)
    if (hsnCode) {
      updateItem(index, 'hsn_code', hsnCode)
      toast({
        title: "HSN Code Generated",
        description: `Generated HSN code: ${hsnCode}`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to generate HSN code",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (field: string, currentValue: string) => {
    setEditingField(field)
    setTempValue(currentValue)
  }

  const saveEditedValue = () => {
    if (editingField) {
      const fieldPath = editingField.split('.')
      if (fieldPath[0] === 'invoice') {
        setInvoiceData(prev => ({ ...prev, [fieldPath[1]]: tempValue }))
      }
    }
    setEditingField(null)
    setTempValue('')
  }

  const handleSave = async () => {
    if (!invoiceData.customerId || !invoiceData.title || items.some(item => !item.description)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const invoicePayload = {
        invoice_number: invoiceData.invoiceNumber,
        title: invoiceData.title,
        description: invoiceData.description,
        customer_id: invoiceData.customerId,
        issue_date: invoiceData.issueDate.toISOString().split('T')[0],
        due_date: invoiceData.dueDate.toISOString().split('T')[0],
        subtotal,
        tax_rate: invoiceData.taxRate,
        tax_amount: taxAmount,
        total_amount: total,
        status: invoiceData.status
      }

      let savedInvoice
      if (invoiceId) {
        const { data, error } = await supabase
          .from('invoices')
          .update(invoicePayload)
          .eq('id', invoiceId)
          .select()
          .single()

        if (error) throw error
        savedInvoice = data

        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data, error } = await supabase
          .from('invoices')
          .insert({ ...invoicePayload, user_id: user.id })
          .select()
          .single()

        if (error) throw error
        savedInvoice = data
      }

      // Insert items
      const itemsPayload = items.map(item => ({
        invoice_id: savedInvoice.id,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsPayload)

      if (itemsError) throw itemsError

      toast({
        title: "Success",
        description: "Invoice saved successfully",
      })

      onSave?.(savedInvoice)
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast({
        title: "Error",
        description: "Failed to save invoice",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = async () => {
    const mockInvoice: Invoice = {
      id: invoiceId || 'preview',
      user_id: '',
      customer_id: invoiceData.customerId,
      invoice_number: invoiceData.invoiceNumber,
      title: invoiceData.title,
      description: invoiceData.description,
      subtotal,
      tax_rate: invoiceData.taxRate,
      tax_amount: taxAmount,
      total_amount: total,
      issue_date: invoiceData.issueDate.toISOString().split('T')[0],
      due_date: invoiceData.dueDate.toISOString().split('T')[0],
      order_number: null,
      order_date: null,
      delivery_number: null,
      delivery_date: null,
      consignee_name: null,
      consignee_address: null,
      consignee_gstin: null,
      consignee_email: null,
      consignee_phone: null,
      status: invoiceData.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    onPreview?.(mockInvoice)
  }

  const handleCustomerAdded = (customer: Customer) => {
    setCustomers([...customers, customer])
    setInvoiceData(prev => ({ ...prev, customerId: customer.id }))
    setShowCustomerForm(false)
    toast({
      title: "Success",
      description: "Customer added successfully",
    })
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {invoiceId ? 'Edit Invoice' : 'Create Invoice'}
        </h2>
        <div className="flex space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handlePreview} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <div className="flex space-x-2">
                <Input
                  id="invoiceNumber"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="INV-0001"
                  className="flex-1"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="md:hidden">
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Invoice Number</DialogTitle>
                    </DialogHeader>
                    <Input
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="INV-0001"
                    />
                    <Button onClick={() => {
                      setInvoiceData(prev => ({ ...prev, invoiceNumber: tempValue }))
                      setTempValue('')
                    }}>
                      Save
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <div className="flex space-x-2">
                <Input
                  id="title"
                  value={invoiceData.title}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Invoice title"
                  className="flex-1"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="md:hidden">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Title</DialogTitle>
                    </DialogHeader>
                    <Input
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="Invoice title"
                    />
                    <Button onClick={() => {
                      setInvoiceData(prev => ({ ...prev, title: tempValue }))
                      setTempValue('')
                    }}>
                      Save
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <div className="flex space-x-2">
                <Textarea
                  id="description"
                  value={invoiceData.description}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Invoice description"
                  rows={3}
                  className="flex-1"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="md:hidden self-start">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Description</DialogTitle>
                    </DialogHeader>
                    <Textarea
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="Invoice description"
                      rows={4}
                    />
                    <Button onClick={() => {
                      setInvoiceData(prev => ({ ...prev, description: tempValue }))
                      setTempValue('')
                    }}>
                      Save
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div>
              <Label>Issue Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !invoiceData.issueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {invoiceData.issueDate ? format(invoiceData.issueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={invoiceData.issueDate}
                    onSelect={(date) => date && setInvoiceData(prev => ({ ...prev, issueDate: date }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !invoiceData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {invoiceData.dueDate ? format(invoiceData.dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={invoiceData.dueDate}
                    onSelect={(date) => date && setInvoiceData(prev => ({ ...prev, dueDate: date }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer & Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <div className="flex space-x-2">
                <Select value={invoiceData.customerId} onValueChange={(value) => setInvoiceData(prev => ({ ...prev, customerId: value }))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerForm(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={invoiceData.taxRate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                placeholder="0"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={invoiceData.status} onValueChange={(value: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled') => setInvoiceData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bankDetails">Bank Details</Label>
              <Textarea
                id="bankDetails"
                value={invoiceData.bankDetails}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, bankDetails: e.target.value }))}
                placeholder="Bank Name: &#10;IFSC Code: &#10;Account No: &#10;Branch: "
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-signature"
                  checked={useSignature}
                  onCheckedChange={(checked) => setUseSignature(checked === true)}
                />
                <Label htmlFor="use-signature" className="text-sm">
                  Include signature in invoice
                </Label>
              </div>
              
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax ({invoiceData.taxRate}%):</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Invoice Items
            <Button onClick={addItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">HSN Code</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-32">Unit Price</TableHead>
                <TableHead className="w-32">Total</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex space-x-2">
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                            className="flex-1"
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
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Input
                        value={item.hsn_code}
                        onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                        placeholder="HSN Code"
                        className="text-sm flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoGenerateHSN(index)}
                        title="Auto-generate HSN code"
                        className="px-2"
                      >
                        AI
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                      step="0.01"
                      min="0"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">₹{item.lineTotal.toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Customer</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomerForm(false)}
              >
                ×
              </Button>
            </div>
            <CustomerForm onCustomerAdded={handleCustomerAdded} />
          </div>
        </div>
      )}

      {/* Edit Dialog for Mobile */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder="Enter value..."
              rows={4}
            />
            <div className="flex space-x-2">
              <Button onClick={saveEditedValue} className="flex-1">
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditingField(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InvoiceBuilder