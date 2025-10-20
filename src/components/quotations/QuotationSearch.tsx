import { useState, useEffect, useMemo } from 'react'
import { Search, X, FileText, Eye, Edit, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { Quotation, Customer, QuotationItem } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface QuotationWithDetails extends Omit<Quotation, 'status'> {
  status: string
  customer?: Customer
  items?: QuotationItem[]
}

interface QuotationSearchProps {
  onEditQuotation: (quotationId: string) => void
  onPreviewQuotation: (quotationId: string) => void
  onExportPDF: (quotationId: string) => void
  pdfLoading?: boolean
}

export default function QuotationSearch({ 
  onEditQuotation, 
  onPreviewQuotation, 
  onExportPDF,
  pdfLoading = false 
}: QuotationSearchProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [allQuotations, setAllQuotations] = useState<QuotationWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Load all quotations with their details for searching
  const loadQuotationsWithDetails = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get all quotations
      const { data: quotations, error: quotationsError } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (quotationsError) throw quotationsError

      // Get all customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)

      if (customersError) throw customersError

      // Get all quotation items
      const { data: items, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .order('created_at')

      if (itemsError) throw itemsError

      // Combine data
      const quotationsWithDetails: QuotationWithDetails[] = quotations.map(quotation => ({
        ...quotation,
        customer: customers.find(c => c.id === quotation.customer_id),
        items: items.filter(item => item.quotation_id === quotation.id)
      }))

      setAllQuotations(quotationsWithDetails)
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

  useEffect(() => {
    loadQuotationsWithDetails()
  }, [user])

  // Filter quotations based on search query
  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()
    return allQuotations.filter(quotation => {
      // Search in quotation number
      if (quotation.quotation_number.toLowerCase().includes(query)) return true
      
      // Search in title
      if (quotation.title.toLowerCase().includes(query)) return true
      
      // Search in description
      if (quotation.description?.toLowerCase().includes(query)) return true
      
      // Search in customer name
      if (quotation.customer?.name.toLowerCase().includes(query)) return true
      
      // Search in quotation items descriptions
      if (quotation.items?.some(item => 
        item.description.toLowerCase().includes(query)
      )) return true
      
      return false
    })
  }, [allQuotations, searchQuery])

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
      case 'draft': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-primary/20 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  const handleQuotationClick = (quotation: QuotationWithDetails) => {
    onPreviewQuotation(quotation.id)
    setShowResults(false)
  }

  const handleSearchFocus = () => {
    if (searchQuery.trim()) {
      setShowResults(true)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowResults(value.trim().length > 0)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setShowResults(false)
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleSearchFocus}
          placeholder="Search quotations by number, title, description, or item..."
          className="pl-10 pr-10 h-12 text-base !bg-[#ffe6e6] border-2 border-[#3333ff]"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Results Overlay */}
      {showResults && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowResults(false)}
          />
          
          {/* Results */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            ) : filteredQuotations.length > 0 ? (
              <div className="p-2">
                <div className="text-xs text-muted-foreground mb-2 px-2">
                  Found {filteredQuotations.length} quotation{filteredQuotations.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {filteredQuotations.map((quotation) => (
                    <div
                      key={quotation.id}
                      className="p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
                      onClick={() => handleQuotationClick(quotation)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="font-medium text-sm truncate">
                              {highlightText(quotation.title, searchQuery)}
                            </span>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(quotation.status)}`}>
                              {quotation.status}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground mb-1">
                            <span className="font-mono">
                              {highlightText(quotation.quotation_number, searchQuery)}
                            </span>
                            {quotation.customer && (
                              <>
                                <span className="mx-1">•</span>
                                <span>{highlightText(quotation.customer.name, searchQuery)}</span>
                              </>
                            )}
                            <span className="mx-1">•</span>
                            <span>{formatDate(quotation.created_at)}</span>
                          </div>

                          {quotation.description && (
                            <div className="text-xs text-muted-foreground mb-1 line-clamp-1">
                              {highlightText(quotation.description, searchQuery)}
                            </div>
                          )}

                          {/* Show matching item descriptions */}
                          {quotation.items?.some(item => 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase())
                          ) && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Items: </span>
                              {quotation.items
                                .filter(item => 
                                  item.description.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .slice(0, 2)
                                .map((item, index) => (
                                  <span key={item.id}>
                                    {index > 0 && ', '}
                                    {highlightText(item.description, searchQuery)}
                                  </span>
                                ))
                              }
                              {quotation.items.filter(item => 
                                item.description.toLowerCase().includes(searchQuery.toLowerCase())
                              ).length > 2 && (
                                <span className="text-muted-foreground"> +{
                                  quotation.items.filter(item => 
                                    item.description.toLowerCase().includes(searchQuery.toLowerCase())
                                  ).length - 2
                                } more</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-sm font-medium text-right">
                            {formatCurrency(quotation.total_amount)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditQuotation(quotation.id)
                            setShowResults(false)
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onPreviewQuotation(quotation.id)
                            setShowResults(false)
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onExportPDF(quotation.id)
                            setShowResults(false)
                          }}
                          disabled={pdfLoading}
                          className="h-7 px-2 text-xs"
                        >
                          <Download className={`w-3 h-3 mr-1 ${pdfLoading ? 'animate-spin' : ''}`} />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchQuery.trim() ? (
              <div className="p-4 text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No quotations found for "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching by quotation number, title, or item description
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}