
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, Eye, Edit, Trash2, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Quotation } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import QuotationBuilder from '@/components/quotations/QuotationBuilder'

export default function Quotations() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadQuotations()
    }
  }, [user])

  const loadQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuotations(data || [])
    } catch (error: any) {
      toast({
        title: 'Error loading quotations',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewQuotation = () => {
    setEditingQuotation(null)
    setShowBuilder(true)
  }

  const handleEditQuotation = (quotationId: string) => {
    setEditingQuotation(quotationId)
    setShowBuilder(true)
  }

  const handleQuotationSaved = () => {
    setShowBuilder(false)
    setEditingQuotation(null)
    loadQuotations()
  }

  const handleDeleteQuotation = async (quotationId: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) {
      return
    }

    try {
      // Delete quotation items first
      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', quotationId)

      // Delete quotation
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId)

      if (error) throw error

      toast({
        title: 'Quotation deleted',
        description: 'The quotation has been deleted successfully.',
      })

      loadQuotations()
    } catch (error: any) {
      toast({
        title: 'Error deleting quotation',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-orange-600 bg-orange-50'
      case 'sent': return 'text-blue-600 bg-blue-50'
      case 'accepted': return 'text-green-600 bg-green-50'
      case 'rejected': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container-app">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg tracking-tight">InvoiceGen</span>
              </div>
            </div>
          </div>
        </header>
        
        <main className="container-app py-8">
          <QuotationBuilder
            quotationId={editingQuotation || undefined}
            onSave={handleQuotationSaved}
            onCancel={() => setShowBuilder(false)}
          />
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quotations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container-app">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
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
            <h1 className="text-3xl font-semibold tracking-tight">Quotations</h1>
            <p className="text-muted-foreground">
              Manage your quotations and track their status
            </p>
          </div>
          <Button onClick={handleNewQuotation} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </div>

        {/* Quotations List */}
        {quotations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No quotations yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first quotation to get started
              </p>
              <Button onClick={handleNewQuotation} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Quotation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotations.map((quotation) => (
              <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{quotation.title}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {quotation.quotation_number}
                      </CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                      {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-semibold">{formatCurrency(quotation.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDate(quotation.created_at)}</span>
                    </div>
                    {quotation.valid_until && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valid Until:</span>
                        <span>{formatDate(quotation.valid_until)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuotation(quotation.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast({
                            title: 'PDF Export',
                            description: 'PDF export feature will be implemented next.',
                          })}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuotation(quotation.id)}
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
