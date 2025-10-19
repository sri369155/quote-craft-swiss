import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Users, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Customer } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import CustomerForm from '@/components/quotations/CustomerForm'

export default function Customers() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user) {
      loadCustomers()
    }
  }, [user])

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
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerAdded = (customer: Customer) => {
    setCustomers([...customers, customer])
    setShowForm(false)
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error

      toast({
        title: 'Customer deleted',
        description: 'The customer has been deleted successfully.',
      })

      setCustomers(customers.filter(c => c.id !== customerId))
    } catch (error: any) {
      toast({
        title: 'Error deleting customer',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-green-100/80 backdrop-blur-md border-b border-border">
        <div className="container-app">
          <div className="flex items-center justify-between h-16 bg-primary px-4 rounded-lg -mx-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg tracking-tight">InvoiceGen</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
            <p className="text-muted-foreground">
              Manage your customer information and contacts
            </p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Create a new customer record for your quotations
                </DialogDescription>
              </DialogHeader>
              <CustomerForm onCustomerAdded={handleCustomerAdded} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Customers List */}
        {customers.length === 0 ? (
          <Card className="gradient-card">
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-white">No customers yet</h3>
              <p className="text-white/80 mb-4">
                Add your first customer to start creating quotations
              </p>
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>
                      Create a new customer record for your quotations
                    </DialogDescription>
                  </DialogHeader>
                  <CustomerForm onCustomerAdded={handleCustomerAdded} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <Card key={customer.id} className="gradient-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-white">{customer.name}</CardTitle>
                      <CardDescription className="text-white/80">
                        Added {formatDate(customer.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customer.email && (
                      <div className="flex items-center text-sm text-white/80">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center text-sm text-white/80">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-start text-sm text-white/80">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-white/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast({
                          title: 'Edit Customer',
                          description: 'Customer editing feature will be implemented next.',
                        })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
