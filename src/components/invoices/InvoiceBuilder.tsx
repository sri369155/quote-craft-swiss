import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Customer, Invoice, InvoiceItem } from '@/types/database'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface InvoiceBuilderProps {
  invoiceId?: string
  quotationData?: any
  onSave: (invoice: Invoice) => void
  onPreview: (invoice: Invoice | null) => void
  onCancel: () => void
}

const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({ invoiceId, quotationData, onSave, onPreview, onCancel }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    description: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    order_number: '',
    order_date: '',
    delivery_challan_number: '',
    delivery_challan_date: '',
    eway_lr_number: '',
    tax_rate: 18,
    status: 'draft' as const,
  })
  const [items, setItems] = useState<InvoiceItem[]>([])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  // Fetch invoice data for editing
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null
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

  // Fetch invoice items for editing
  const { data: invoiceItems = [] } = useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return []
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!invoiceId,
  })

  useEffect(() => {
    if (invoiceData) {
      setFormData({
        customer_id: invoiceData.customer_id,
        title: invoiceData.title,
        description: invoiceData.description || '',
        issue_date: invoiceData.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoiceData.due_date || '',
        order_number: invoiceData.order_number || '',
        order_date: invoiceData.order_date || '',
        delivery_challan_number: invoiceData.delivery_challan_number || '',
        delivery_challan_date: invoiceData.delivery_challan_date || '',
        eway_lr_number: invoiceData.eway_lr_number || '',
        tax_rate: invoiceData.tax_rate,
        status: invoiceData.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
      })
    }
  }, [invoiceData])

  useEffect(() => {
    if (invoiceItems) {
      setItems(invoiceItems)
    }
  }, [invoiceItems])

  useEffect(() => {
    if (quotationData) {
      setFormData({
        customer_id: quotationData.customer_id,
        title: quotationData.title,
        description: quotationData.description || '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        order_number: '',
        order_date: '',
        delivery_challan_number: '',
        delivery_challan_date: '',
        eway_lr_number: '',
        tax_rate: quotationData.tax_rate,
        status: 'draft',
      })

      setItems(quotationData.items.map((item: any) => ({
        id: crypto.randomUUID(),
        invoice_id: '',
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        created_at: new Date().toISOString(),
      })))
    }
  }, [quotationData])

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

      return `INV-${nextNumber.toString().padStart(4, '0')}`
    } catch (error) {
      console.error('Error generating invoice number:', error)
      return `INV-${Date.now()}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer_id || items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a customer and add at least one item.',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      const tax_amount = (subtotal * formData.tax_rate) / 100
      const total_amount = subtotal + tax_amount

      const invoiceNumber = await generateInvoiceNumber()

      const invoiceData = {
        user_id: user.id,
        invoice_number: invoiceNumber,
        customer_id: formData.customer_id,
        title: formData.title,
        description: formData.description,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        order_number: formData.order_number,
        order_date: formData.order_date,
        delivery_challan_number: formData.delivery_challan_number,
        delivery_challan_date: formData.delivery_challan_date,
        eway_lr_number: formData.eway_lr_number,
        tax_rate: formData.tax_rate,
        subtotal,
        tax_amount,
        total_amount,
        status: formData.status,
      }

      let invoice
      if (invoiceId) {
        const { data, error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoiceId)
          .select()
          .single()
        
        if (error) throw error
        invoice = data
        
        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId)
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()
        
        if (error) throw error
        invoice = data
      }

      // Insert new items
      for (const item of items) {
        await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            description: item.description,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.quantity * item.unit_price,
          })
      }

      toast({
        title: 'Success',
        description: 'Invoice saved successfully!',
      })

      onSave(invoice)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save invoice.',
        variant: 'destructive',
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData({ ...formData, [id]: value })
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setItems(updatedItems)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        invoice_id: '',
        description: '',
        hsn_code: '',
        quantity: 1,
        unit_price: 0,
        line_total: 0,
        created_at: new Date().toISOString(),
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...items]
    updatedItems.splice(index, 1)
    setItems(updatedItems)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {invoiceId ? 'Edit Invoice' : 'Create New Invoice'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onPreview(null)} variant="outline">
            Preview
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_id">Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Invoice title"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery_challan_number">Delivery Challan No.</Label>
                <Input
                  id="delivery_challan_number"
                  value={formData.delivery_challan_number}
                  onChange={(e) => setFormData({ ...formData, delivery_challan_number: e.target.value })}
                  placeholder="Delivery challan number"
                />
              </div>

              <div>
                <Label htmlFor="delivery_challan_date">Delivery Date</Label>
                <Input
                  id="delivery_challan_date"
                  type="date"
                  value={formData.delivery_challan_date}
                  onChange={(e) => setFormData({ ...formData, delivery_challan_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order_number">Order No.</Label>
                <Input
                  id="order_number"
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  placeholder="Order number"
                />
              </div>

              <div>
                <Label htmlFor="order_date">Order Date</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eway_lr_number">E-Way/LR No.</Label>
                <Input
                  id="eway_lr_number"
                  value={formData.eway_lr_number}
                  onChange={(e) => setFormData({ ...formData, eway_lr_number: e.target.value })}
                  placeholder="E-Way/LR number"
                />
              </div>

              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Terms & Conditions</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter terms and conditions..."
                rows={3}
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-lg">Items</Label>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <Card key={index} className="mb-4">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Description *</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Item description"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>HSN Code</Label>
                        <Input
                          value={item.hsn_code}
                          onChange={(e) => handleItemChange(index, 'hsn_code', e.target.value)}
                          placeholder="HSN code"
                        />
                      </div>

                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <span className="text-lg font-semibold">
                        Total: ₹{(item.quantity * item.unit_price).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="submit" size="lg">
                {invoiceId ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default InvoiceBuilder
