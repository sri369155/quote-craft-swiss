import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Edit, Eye, Trash2, FileText } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Invoice, Customer } from '@/types/database'
import { format } from 'date-fns'

interface InvoiceWithCustomer extends Invoice {
  customer: Customer
}

interface InvoiceSearchProps {
  onNewInvoice: () => void
  onEditInvoice: (invoice: Invoice) => void
  onViewInvoice: (invoice: Invoice) => void
}

const InvoiceSearch: React.FC<InvoiceSearchProps> = ({ onNewInvoice, onEditInvoice, onViewInvoice }) => {
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithCustomer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [searchTerm, statusFilter, invoices])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterInvoices = () => {
    let filtered = invoices

    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    setFilteredInvoices(filtered)
  }

  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      })

      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'sent':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'overdue':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading invoices...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <Button onClick={onNewInvoice}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by invoice number, title, or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No invoices match your search criteria' 
                  : 'No invoices found. Create your first invoice to get started!'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={onNewInvoice} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Invoice
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                      <Badge className={getStatusBadgeColor(invoice.status)}>
                        {invoice.status?.toUpperCase() || 'DRAFT'}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-1">{invoice.title}</p>
                    <p className="text-sm text-gray-500">
                      Customer: {invoice.customer?.name || 'Unknown'}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Issue: {format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</span>
                      {invoice.due_date && (
                        <span>Due: {format(new Date(invoice.due_date), 'dd/MM/yyyy')}</span>
                      )}
                      <span className="font-semibold text-gray-700">
                        Total: ${Number(invoice.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewInvoice(invoice)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditInvoice(invoice)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteInvoice(invoice.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default InvoiceSearch