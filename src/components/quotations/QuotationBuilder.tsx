
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Save, FileText, Sparkles, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Customer, Quotation, QuotationItem } from '@/types/database'
import CustomerForm from './CustomerForm'

interface QuotationItemForm {
  id?: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

interface QuotationBuilderProps {
  quotationId?: string
  onSave?: (quotation: Quotation) => void
  onCancel?: () => void
}

export default function QuotationBuilder({ quotationId, onSave, onCancel }: QuotationBuilderProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  
  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<QuotationItemForm[]>([
    { description: '', quantity: 1, unit_price: 0, line_total: 0 }
  ])
  const [taxRate, setTaxRate] = useState(18) // Default GST rate for India
  const [validUntil, setValidUntil] = useState('')
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft')

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
  const taxAmount = (subtotal * taxRate) / 100
  const totalAmount = subtotal + taxAmount

  useEffect(() => {
    if (user) {
      loadCustomers()
      if (quotationId) {
        loadQuotation()
      }
    }
  }, [user, quotationId])

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user!.id)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error: any) {
      toast({
        title: 'Error loading customers',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const loadQuotation = async () => {
    if (!quotationId) return
    
    setLoading(true)
    try {
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single()

      if (quotationError) throw quotationError

      const { data: quotationItems, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at')

      if (itemsError) throw itemsError

      // Populate form with existing data
      setSelectedCustomerId(quotation.customer_id)
      setTitle(quotation.title)
      setDescription(quotation.description || '')
      setTaxRate(quotation.tax_rate)
      setValidUntil(quotation.valid_until || '')
      setStatus(quotation.status)
      
      setItems(quotationItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      })))
    } catch (error: any) {
      toast({
        title: 'Error loading quotation',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const generateQuotationNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `QUO-${year}${month}${day}-${random}`
  }

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, line_total: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof QuotationItemForm, value: string | number) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate line total if quantity or unit_price changed
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].line_total = updatedItems[index].quantity * updatedItems[index].unit_price
    }
    
    setItems(updatedItems)
  }

  const useAIAutofill = async (itemIndex: number) => {
    const item = items[itemIndex]
    if (!item.description.trim()) {
      toast({
        title: 'Add description first',
        description: 'Please add a description before using AI autofill.',
        variant: 'destructive',
      })
      return
    }

    try {
      // This is a placeholder for OpenAI integration
      // You'll need to set up the OpenAI API key in Supabase secrets
      toast({
        title: 'AI Autofill',
        description: 'AI autofill feature will be implemented with OpenAI integration.',
      })
    } catch (error: any) {
      toast({
        title: 'AI autofill error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const saveQuotation = async () => {
    if (!selectedCustomerId || !title.trim() || items.some(item => !item.description.trim())) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const quotationData = {
        user_id: user!.id,
        customer_id: selectedCustomerId,
        quotation_number: quotationId ? undefined : generateQuotationNumber(),
        title,
        description,
        status,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        valid_until: validUntil || null,
        updated_at: new Date().toISOString(),
      }

      let savedQuotation: Quotation

      if (quotationId) {
        // Update existing quotation
        const { data, error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', quotationId)
          .select()
          .single()

        if (error) throw error
        savedQuotation = data

        // Delete existing items and insert new ones
        await supabase
          .from('quotation_items')
          .delete()
          .eq('quotation_id', quotationId)
      } else {
        // Create new quotation
        const { data, error } = await supabase
          .from('quotations')
          .insert({
            ...quotationData,
            quotation_number: generateQuotationNumber(),
          })
          .select()
          .single()

        if (error) throw error
        savedQuotation = data
      }

      // Insert quotation items
      const itemsToInsert = items.map(item => ({
        quotation_id: savedQuotation.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }))

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast({
        title: 'Quotation saved',
        description: `Quotation ${savedQuotation.quotation_number} has been saved successfully.`,
      })

      if (onSave) {
        onSave(savedQuotation)
      }
    } catch (error: any) {
      toast({
        title: 'Error saving quotation',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCustomerAdded = (customer: Customer) => {
    setCustomers([...customers, customer])
    setSelectedCustomerId(customer.id)
    setShowCustomerForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {quotationId ? 'Edit Quotation' : 'New Quotation'}
          </h1>
          <p className="text-muted-foreground">
            Create professional quotations for your clients
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={saveQuotation} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the basic details for your quotation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <div className="flex space-x-2">
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
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
                    <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Users className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Customer</DialogTitle>
                          <DialogDescription>
                            Create a new customer for this quotation
                          </DialogDescription>
                        </DialogHeader>
                        <CustomerForm onCustomerAdded={handleCustomerAdded} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Quotation Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Website Development Project"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about this quotation..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid-until">Valid Until</Label>
                  <Input
                    id="valid-until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>
                    Add items and services to your quotation
                  </CardDescription>
                </div>
                <Button onClick={addItem} size="sm" className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[15%]">Quantity</TableHead>
                      <TableHead className="w-[20%]">Unit Price</TableHead>
                      <TableHead className="w-[20%]">Total</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => useAIAutofill(index)}
                              title="AI Autofill"
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            min="0"
                            step="1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxRate}%):</span>
                <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
