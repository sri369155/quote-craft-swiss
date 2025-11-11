import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePDFExport } from '@/hooks/usePDFExport'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  Settings,
  ArrowLeft,
  IndianRupee,
  MessageCircle,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Quotation, Customer, QuotationItem } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import QuotationBuilder from '@/components/quotations/QuotationBuilder'
import QuotationPreview from '@/components/quotations/QuotationPreview'
import QuotationSearch from '@/components/quotations/QuotationSearch'

export default function Quotations() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const { exportToPDF, generatePDFBlob, loading: pdfLoading } = usePDFExport()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<string | null>(null)
  const [previewQuotation, setPreviewQuotation] = useState<string | null>(null)

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
      setQuotations((data as Quotation[]) || [])
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
    if (!confirm('Are you sure you want to delete this quotation?')) return

    try {
      await supabase.from('quotation_items').delete().eq('quotation_id', quotationId)
      const { error } = await supabase.from('quotations').delete().eq('id', quotationId)

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

  const handleExportPDF = async (quotationId: string) => {
    try {
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single()
      if (quotationError) throw quotationError

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', quotation.customer_id)
        .single()
      if (customerError) throw customerError

      const { data: items, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at')
      if (itemsError) throw itemsError

      const pdfUrl = await exportToPDF(quotation as Quotation, customer, items || [], profile || undefined)
      
      if (pdfUrl) {
        // Show success toast with action to open PDF
        toast({
          title: 'PDF Downloaded Successfully! 📄',
          description: (
            <div className="flex flex-col gap-2">
              <p>Saved to your Downloads folder</p>
              <button
                onClick={() => window.open(pdfUrl, '_blank')}
                className="text-sm font-medium text-primary hover:underline text-left"
              >
                📂 Open PDF
              </button>
            </div>
          ),
          duration: 8000,
        })
      }
    } catch (error: any) {
      toast({
        title: 'Export Error',
        description: error.message || 'Failed to export PDF. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleWhatsAppShare = async (quotationId: string) => {
    try {
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single()
      if (quotationError) throw quotationError

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', quotation.customer_id)
        .single()
      if (customerError) throw customerError

      const { data: items, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at')
      if (itemsError) throw itemsError

      toast({
        title: 'Generating PDF',
        description: 'Please wait while we generate your quotation PDF...',
      })

      // Generate PDF as Blob
      const pdfBlob = await generatePDFBlob(quotation as Quotation, customer, items || [], profile || undefined)
      const pdfFile = new File([pdfBlob], `quotation-${quotation.quotation_number}.pdf`, { type: 'application/pdf' })

      // Try to share the PDF file using Web Share API (works on mobile)
      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `Quotation ${quotation.quotation_number}`,
            text: `${quotation.title}\nAmount: ${formatCurrency(quotation.total_amount)}`,
          })
          
          toast({
            title: 'Success',
            description: 'PDF shared successfully',
          })
          return
        } catch (shareError: any) {
          // User cancelled or share failed, continue to download
          if (shareError.name !== 'AbortError') {
            console.error('Share failed:', shareError)
          }
        }
      }

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${quotation.quotation_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Wait a moment for download to start
      await new Promise(resolve => setTimeout(resolve, 500))

      // Open WhatsApp with instructions
      const message = `Hi ${customer.name}! 📄\n\nPlease find the quotation attached:\n\n📋 ${quotation.title}\n💰 Amount: ${formatCurrency(quotation.total_amount)}\n\n*Please attach the downloaded PDF file to this chat*`
      const encodedMessage = encodeURIComponent(message)
      const customerPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : ''
      
      const whatsappUrl = customerPhone 
        ? `https://wa.me/${customerPhone}?text=${encodedMessage}`
        : `https://wa.me/?text=${encodedMessage}`
      
      window.open(whatsappUrl, '_blank')

      toast({
        title: 'PDF Downloaded',
        description: 'PDF downloaded. Opening WhatsApp - please attach the file manually.',
        duration: 5000,
      })
    } catch (error: any) {
      toast({
        title: 'Share Error',
        description: error.message || 'Failed to share PDF. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleGenerateInvoice = async (quotationId: string) => {
    try {
      // Fetch quotation data
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single()
      if (quotationError) throw quotationError

      const { data: items, error: quotationItemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at')
      if (quotationItemsError) throw quotationItemsError

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

      const invoiceNumber = `INV-${nextNumber.toString().padStart(4, '0')}`

      // Create invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user!.id,
          customer_id: quotation.customer_id,
          invoice_number: invoiceNumber,
          title: quotation.title,
          description: quotation.description,
          subtotal: quotation.subtotal,
          tax_rate: quotation.tax_rate,
          tax_amount: quotation.tax_amount,
          total_amount: quotation.total_amount,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          status: 'draft'
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Copy items
      const invoiceItems = items.map(item => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        hsn_code: item.hsn_code
      }))

      const { error: invoiceItemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (invoiceItemsError) throw invoiceItemsError

      toast({
        title: 'Invoice Generated',
        description: `Invoice ${invoiceNumber} created successfully from quotation.`,
      })

      // Navigate to invoices page
      navigate('/invoices')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate invoice.',
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
      case 'draft': return 'text-orange-100 bg-orange-500'
      case 'sent': return 'text-blue-100 bg-blue-500'
      case 'accepted': return 'text-green-100 bg-green-500'
      case 'rejected': return 'text-red-100 bg-red-500'
      default: return 'text-gray-100 bg-gray-500'
    }
  }

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lime-100 to-green-200">
        <header className="sticky top-0 z-50 bg-gradient-to-r from-green-400 to-lime-300/80 backdrop-blur-md border-b border-border">
          <div className="container-app">
            <div className="flex items-center justify-between h-16 bg-primary px-4 rounded-lg -mx-4">
              <div className="flex items-center gap-4">
                <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-9 h-9 text-white animate-rupee-rotate" />
                  </div>
                  <span className="font-bookman font-semibold text-2xl tracking-tight text-green-700 animate-flash-slow">Laabh AI</span>
                </div>
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
      <div className="min-h-screen bg-gradient-to-br from-lime-100 to-green-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quotations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-100 to-green-200">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-400 to-lime-300/80 backdrop-blur-md border-b border-border">
        <div className="container-app">
          <div className="flex items-center justify-between h-16 bg-primary px-4 rounded-lg -mx-4">
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-9 h-9 text-white animate-rupee-rotate" />
                </div>
                <span className="font-bookman font-semibold text-2xl tracking-tight text-green-700 animate-flash-slow">Laabh AI</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile-settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Customize PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Quotations</h1>
            <p className="text-muted-foreground">Manage your quotations and track their status</p>
          </div>
          <Button onClick={handleNewQuotation} className="btn-accent">
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </div>

        <div className="mb-8">
          <QuotationSearch
            onEditQuotation={handleEditQuotation}
            onPreviewQuotation={setPreviewQuotation}
            onExportPDF={handleExportPDF}
            pdfLoading={pdfLoading}
          />
        </div>

        {quotations.length === 0 ? (
          <Card className="gradient-card text-white">
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No quotations yet</h3>
              <p className="text-muted-foreground mb-4">Create your first quotation to get started</p>
              <Button onClick={handleNewQuotation} className="btn-accent">
                <Plus className="w-4 h-4 mr-2" />
                Create Quotation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotations.map((quotation) => (
              <Card key={quotation.id} className="gradient-card text-white hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{quotation.title}</CardTitle>
                      <CardDescription className="text-sm text-white/80">
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
                      <span className="text-white/80">Amount:</span>
                      <span className="font-semibold">{formatCurrency(quotation.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">Created:</span>
                      <span>{formatDate(quotation.created_at)}</span>
                    </div>
                    {quotation.valid_until && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Valid Until:</span>
                        <span>{formatDate(quotation.valid_until)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-white/30">
                      <TooltipProvider>
                        <div className="flex space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="orange" size="sm" onClick={() => handleEditQuotation(quotation.id)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="orange" size="sm" onClick={() => setPreviewQuotation(quotation.id)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="orange"
                                size="sm"
                                onClick={() => handleExportPDF(quotation.id)}
                                disabled={pdfLoading}
                              >
                                <Download className={`w-4 h-4 ${pdfLoading ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Export PDF</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="orange"
                                size="sm"
                                onClick={() => handleGenerateInvoice(quotation.id)}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate Invoice</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="orange"
                                size="sm"
                                onClick={() => handleWhatsAppShare(quotation.id)}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share on WhatsApp</TooltipContent>
                          </Tooltip>
                        </div>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteQuotation(quotation.id)}
                              className="hover:bg-accent"
                            >
                              <Trash2 className="w-4 h-4 text-[#0000cc]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <QuotationPreview
          quotationId={previewQuotation}
          open={!!previewQuotation}
          onClose={() => setPreviewQuotation(null)}
        />
      </main>
    </div>
  )
}
