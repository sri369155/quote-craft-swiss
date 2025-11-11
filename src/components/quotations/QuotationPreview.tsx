import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePDFExport } from '@/hooks/usePDFExport'
import { useImageQuoteExport } from '@/hooks/useImageQuoteExport'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Download, Printer, Image as ImageIcon, MessageCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Quotation, Customer, QuotationItem, CustomImage } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { numberToWords } from '@/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface QuotationPreviewProps {
  quotationId: string | null
  open: boolean
  onClose: () => void
}

export default function QuotationPreview({ quotationId, open, onClose }: QuotationPreviewProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const { exportToPDF, generatePDFBlob, loading: pdfLoading } = usePDFExport()
  const { exportToImage, downloadImage, loading: imageLoading } = useImageQuoteExport()
  
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [scopeLines, setScopeLines] = useState<string[]>([])
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  
  // Custom images from database
  const [customImages, setCustomImages] = useState<CustomImage[]>([])
  const [selectedImages, setSelectedImages] = useState({
    header: profile?.header_image_url || 'none',
    footer: profile?.footer_image_url || 'none',
    signature: profile?.signature_image_url || 'none'
  })
  
  // Editable text states
  const [editableText, setEditableText] = useState({
    salutation: 'Dear Sir,',
    introText: 'We would like to submit our lowest budgetary quote for the supply and installation of the following items:',
    companyName: profile?.company_name || '',
    tagline: profile?.company_slogan || '"Engineering Tomorrow\'s Technologies, Today"',
    gstNumber: profile?.gst_number ? `GST: ${profile.gst_number}` : 'GST: 37ABDFB9225A1Z5',
    termsTitle: 'Terms & Conditions',
    completionTerm: 'Completion: 90 Days',
    gstTerm: 'GST: As indicated',
    transportTerm: 'Transport: NA',
    signatureText: 'With regards',
    signatureRole1: 'Managing Partner',
    signatureRole2: 'Authorised Signature',
    footerAddress1: profile?.company_address?.split(',')[0]?.trim() || '',
    footerAddress2: profile?.company_address?.split(',').slice(1).join(',').trim() || '',
    footerPhone: profile?.company_phone || '',
    footerEmail: profile?.company_email ? `Email: ${profile.company_email}` : '',
    grandTotalText: 'Grand Total (in words):',
    grandTotalDescription: 'As per calculation above',
    roundedText: 'Rounded',
    totalText: 'Total'
  })

  // Spacing controls
  const [spacing, setSpacing] = useState({
    headerSpacing: 6,
    quotationLabelSpacing: 4,
    detailsSpacing: 4,
    introSpacing: 6,
    tableSpacing: 6,
    totalSpacing: 6,
    termsSpacing: 8,
    footerSpacing: 8
  })

  // Style customization controls
  const [styleCustomization, setStyleCustomization] = useState({
    titleColor: '#000000',
    tableBorderColor: '#d1d5db',
    tableHeaderBgColor: '#f3f4f6',
    tableFooterBgColor: '#f3f4f6',
    companyNameColor: '#000000',
    tableBorderSize: '1'
  })

  // Image preference controls
  const [imagePreferences, setImagePreferences] = useState({
    useCustomHeader: !!profile?.header_image_url,
    useCustomFooter: !!profile?.footer_image_url,
    useCustomSignature: !!profile?.signature_image_url
  })

  // Load custom images from database
  const loadCustomImages = async () => {
    if (!profile?.id) return
    
    const { data, error } = await supabase
      .from('custom_images')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading custom images:', error)
      return
    }
    
    setCustomImages((data || []) as CustomImage[])
  }

  useEffect(() => {
    if (profile && open) {
      loadCustomImages()
    }
  }, [profile, open])

  useEffect(() => {
    if (quotationId && open) {
      loadQuotationData()
    }
  }, [quotationId, open])

  useEffect(() => {
    if (profile && quotation) {
      setEditableText(prev => ({
        ...prev,
        companyName: profile.company_name || 'BHAIRAVNEX',
        tagline: profile.company_slogan || '"Engineering Tomorrow\'s Technologies, Today"',
        gstNumber: profile.gst_number ? `GST: ${profile.gst_number}` : 'GST: 37ABDFB9225A1Z5',
        footerAddress1: profile.company_address?.split(',')[0]?.trim() || '',
        footerAddress2: profile.company_address?.split(',').slice(1).join(',').trim() || '',
        footerPhone: profile.company_phone || '',
        footerEmail: profile.company_email ? `Email: ${profile.company_email}` : ''
      }))
    }
  }, [profile, quotation])

  const updateEditableText = (field: string, value: string) => {
    setEditableText(prev => ({ ...prev, [field]: value }))
  }

  const updateSpacing = (field: string, value: number) => {
    setSpacing(prev => ({ ...prev, [field]: value }))
  }

  const updateImagePreference = (field: string, value: boolean) => {
    console.log('Updating image preference:', field, value)
    console.log('Profile images:', {
      header: profile?.header_image_url,
      footer: profile?.footer_image_url,
      signature: profile?.signature_image_url
    })
    setImagePreferences(prev => ({ ...prev, [field]: value }))
  }

  const loadQuotationData = async () => {
    if (!quotationId) return
    
    setLoading(true)
    try {
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .maybeSingle()

      if (quotationError) throw quotationError
      if (!quotationData) {
        toast({
          title: 'Quotation not found',
          description: 'The requested quotation could not be found.',
          variant: 'destructive',
        })
        return
      }

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', quotationData.customer_id)
        .maybeSingle()

      if (customerError) throw customerError
      if (!customerData) {
        toast({
          title: 'Customer not found',
          description: 'The customer associated with this quotation could not be found.',
          variant: 'destructive',
        })
        return
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('created_at')

      if (itemsError) throw itemsError

      setQuotation(quotationData as Quotation)
      setCustomer(customerData as Customer)
      setItems(itemsData || [])
      setScopeLines(formatScopeOfWork(quotationData.scope_of_work || ''))
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

  const handleDownloadPreview = async () => {
    if (!quotation || !customer) return
    
    // Always use PDF export with selected images
    try {
      // Create a modified profile object with selected images
      const modifiedProfile = profile ? {
        ...profile,
        header_image_url: selectedImages.header !== 'none' ? selectedImages.header : null,
        footer_image_url: selectedImages.footer !== 'none' ? selectedImages.footer : null,
        signature_image_url: selectedImages.signature !== 'none' ? selectedImages.signature : null
      } : undefined
      
      // Pass customization options to PDF export
      const customization = {
        editableText,
        styleCustomization,
        spacing
      }
      
      const pdfUrl = await exportToPDF(quotation, customer, items, modifiedProfile, customization)
      
      if (pdfUrl) {
        // Show success toast with action to open PDF
        toast({
          title: 'PDF Downloaded Successfully! 📄',
          description: (
            <div className="flex flex-col gap-2">
              <p>Saved to your Downloads folder</p>
              <button
                onClick={() => {
                  // Create temporary link and click it for better mobile compatibility
                  const link = document.createElement('a')
                  link.href = pdfUrl
                  link.target = '_blank'
                  link.rel = 'noopener noreferrer'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
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

  const handleGenerateImage = async () => {
    if (!quotation || !customer) return
    
    try {
      // Get the selected custom image URLs
      const headerUrl = selectedImages.header !== 'none' ? selectedImages.header : undefined
      const footerUrl = selectedImages.footer !== 'none' ? selectedImages.footer : undefined
      const signatureUrl = selectedImages.signature !== 'none' ? selectedImages.signature : undefined

      const imageUrl = await exportToImage(
        quotation, 
        customer, 
        items, 
        profile || undefined,
        headerUrl,
        footerUrl,
        signatureUrl
      )
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl)
      }
    } catch (error: any) {
      toast({
        title: 'Image Generation Error',
        description: error.message || 'Failed to generate image. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadImage = async () => {
    if (!generatedImageUrl || !quotation) return
    
    const filename = `quotation-${quotation.quotation_number}.png`
    await downloadImage(generatedImageUrl, filename)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsAppShare = async () => {
    if (!quotation || !customer) return
    
    try {
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(amount)
      }

      toast({
        title: 'Generating PDF',
        description: 'Please wait while we generate your quotation PDF...',
      })

      // Create a modified profile object with selected images
      const modifiedProfile = profile ? {
        ...profile,
        header_image_url: selectedImages.header !== 'none' ? selectedImages.header : null,
        footer_image_url: selectedImages.footer !== 'none' ? selectedImages.footer : null,
        signature_image_url: selectedImages.signature !== 'none' ? selectedImages.signature : null
      } : undefined

      // Pass customization options to PDF export
      const customization = {
        editableText,
        styleCustomization,
        spacing
      }

      // Generate PDF as Blob
      const pdfBlob = await generatePDFBlob(quotation, customer, items, modifiedProfile, customization)
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

  const updateQuotationField = (field: keyof Quotation, value: any) => {
    if (!quotation) return
    setQuotation({ ...quotation, [field]: value })
  }

  const formatScopeOfWork = (scopeOfWork: string) => {
    if (!scopeOfWork) return []
    return scopeOfWork.split('\n').filter(line => line.trim().length > 0)
  }

  const updateItemField = (index: number, field: keyof QuotationItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate totals
    const quantity = field === 'quantity' ? value : updatedItems[index].quantity
    const unitPrice = field === 'unit_price' ? value : updatedItems[index].unit_price
    updatedItems[index].line_total = quantity * unitPrice
    
    setItems(updatedItems)
    
    // Update quotation totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.line_total, 0)
    const taxAmount = (subtotal * (quotation?.tax_rate || 0)) / 100
    const totalAmount = subtotal + taxAmount
    
    setQuotation(prev => prev ? {
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    } : null)
  }

  const updateScopeLine = (index: number, value: string) => {
    const updatedLines = [...scopeLines]
    updatedLines[index] = value
    setScopeLines(updatedLines)
    
    // Update quotation scope_of_work
    const updatedScopeOfWork = updatedLines.join('\n')
    setQuotation(prev => prev ? { ...prev, scope_of_work: updatedScopeOfWork } : null)
  }

  const addScopeLine = () => {
    setScopeLines([...scopeLines, ''])
  }

  const removeScopeLine = (index: number) => {
    const updatedLines = scopeLines.filter((_, i) => i !== index)
    setScopeLines(updatedLines)
    
    // Update quotation scope_of_work
    const updatedScopeOfWork = updatedLines.join('\n')
    setQuotation(prev => prev ? { ...prev, scope_of_work: updatedScopeOfWork } : null)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!quotation || !customer) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto print:max-w-full print:h-auto print:overflow-visible print:block print:shadow-none print:border-0">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle>Quotation Preview</DialogTitle>
            <div className="flex gap-2">
              {profile?.use_image_design ? (
                <>
                  {generatedImageUrl && (
                    <Button
                      onClick={handleDownloadImage}
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Image
                    </Button>
                  )}
                  <Button
                    onClick={handleGenerateImage}
                    disabled={imageLoading}
                    className="btn-primary"
                  >
                    <ImageIcon className={`w-4 h-4 mr-2 ${imageLoading ? 'animate-spin' : ''}`} />
                    {generatedImageUrl ? 'Regenerate Image' : 'Generate Image'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleWhatsAppShare}
                    variant="outline"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    onClick={handleDownloadPreview}
                    disabled={pdfLoading}
                    className="btn-primary"
                  >
                    <Download className={`w-4 h-4 mr-2 ${pdfLoading ? 'animate-spin' : ''}`} />
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Style Customization Controls */}
          {!profile?.use_image_design && (
            <div className="print:hidden border-t pt-4 mt-4 mb-4">
              <div className="text-sm font-medium mb-3">Customize Colors & Styles:</div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Title Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={styleCustomization.titleColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, titleColor: e.target.value }))}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <Input 
                      value={styleCustomization.titleColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, titleColor: e.target.value }))}
                      className="flex-1 h-10 text-xs font-mono"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium">Company Name Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={styleCustomization.companyNameColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, companyNameColor: e.target.value }))}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <Input 
                      value={styleCustomization.companyNameColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, companyNameColor: e.target.value }))}
                      className="flex-1 h-10 text-xs font-mono"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium">Table Border Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={styleCustomization.tableBorderColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, tableBorderColor: e.target.value }))}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <Input 
                      value={styleCustomization.tableBorderColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, tableBorderColor: e.target.value }))}
                      className="flex-1 h-10 text-xs font-mono"
                      placeholder="#d1d5db"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium">Table Header Background</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={styleCustomization.tableHeaderBgColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, tableHeaderBgColor: e.target.value }))}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <Input 
                      value={styleCustomization.tableHeaderBgColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, tableHeaderBgColor: e.target.value }))}
                      className="flex-1 h-10 text-xs font-mono"
                      placeholder="#f3f4f6"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium">Table Footer Background</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={styleCustomization.tableFooterBgColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, tableFooterBgColor: e.target.value }))}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <Input 
                      value={styleCustomization.tableFooterBgColor}
                      onChange={(e) => setStyleCustomization(prev => ({ ...prev, tableFooterBgColor: e.target.value }))}
                      className="flex-1 h-10 text-xs font-mono"
                      placeholder="#f3f4f6"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium">Table Border Size (px)</label>
                  <Input 
                    type="number"
                    min="1"
                    max="5"
                    value={styleCustomization.tableBorderSize}
                    onChange={(e) => setStyleCustomization(prev => ({ ...prev, tableBorderSize: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Image Selection Controls - only show for PDF mode */}
          {!profile?.use_image_design && (
            <div className="print:hidden border-t pt-4 mt-4">
              <div className="text-sm font-medium mb-3">Select Images for PDF:</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Header Image</label>
                <Select 
                  value={selectedImages.header} 
                  onValueChange={(value) => setSelectedImages(prev => ({ ...prev, header: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No header image" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No header image</SelectItem>
                    {profile?.header_image_url && (
                      <SelectItem value={profile.header_image_url}>Default (Profile)</SelectItem>
                    )}
                    {customImages
                      .filter(img => img.image_type === 'header')
                      .map(img => (
                        <SelectItem key={img.id} value={img.image_url}>
                          {img.image_name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium">Footer Image</label>
                <Select 
                  value={selectedImages.footer} 
                  onValueChange={(value) => setSelectedImages(prev => ({ ...prev, footer: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No footer image" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No footer image</SelectItem>
                    {profile?.footer_image_url && (
                      <SelectItem value={profile.footer_image_url}>Default (Profile)</SelectItem>
                    )}
                    {customImages
                      .filter(img => img.image_type === 'footer')
                      .map(img => (
                        <SelectItem key={img.id} value={img.image_url}>
                          {img.image_name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium">Signature Image</label>
                <Select 
                  value={selectedImages.signature} 
                  onValueChange={(value) => setSelectedImages(prev => ({ ...prev, signature: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No signature image" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No signature image</SelectItem>
                    {profile?.signature_image_url && (
                      <SelectItem value={profile.signature_image_url}>Default (Profile)</SelectItem>
                    )}
                    {customImages
                      .filter(img => img.image_type === 'signature')
                      .map(img => (
                        <SelectItem key={img.id} value={img.image_url}>
                          {img.image_name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          )}
          
          {/* Spacing Controls - only show for PDF mode */}
          {!profile?.use_image_design && (
            <div className="print:hidden border-t pt-4 mt-4">
              <div className="text-sm font-medium mb-2">Adjust Spacing:</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <label>Header:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.headerSpacing}
                  onChange={(e) => updateSpacing('headerSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.headerSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Label:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.quotationLabelSpacing}
                  onChange={(e) => updateSpacing('quotationLabelSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.quotationLabelSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Details:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.detailsSpacing}
                  onChange={(e) => updateSpacing('detailsSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.detailsSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Intro:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.introSpacing}
                  onChange={(e) => updateSpacing('introSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.introSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Table:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.tableSpacing}
                  onChange={(e) => updateSpacing('tableSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.tableSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Total:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.totalSpacing}
                  onChange={(e) => updateSpacing('totalSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.totalSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Terms:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.termsSpacing}
                  onChange={(e) => updateSpacing('termsSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.termsSpacing}</span>
              </div>
              <div className="flex items-center gap-1">
                <label>Footer:</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={spacing.footerSpacing}
                  onChange={(e) => updateSpacing('footerSpacing', parseInt(e.target.value))}
                  className="w-12"
                />
                <span>{spacing.footerSpacing}</span>
              </div>
            </div>
          </div>
          )}
        </DialogHeader>

        {/* Show generated image if in image design mode */}
        {profile?.use_image_design && generatedImageUrl ? (
          <div className="bg-white p-4">
            <div className="border border-border rounded-lg overflow-hidden">
              <img 
                src={generatedImageUrl} 
                alt="Generated Quotation" 
                className="w-full h-auto"
              />
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              This is your AI-generated quotation image. You can download it using the button above.
            </div>
          </div>
        ) : profile?.use_image_design ? (
          <div className="bg-white p-8 text-center">
            <div className="text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Generate AI Quotation Image</p>
              <p className="text-sm">Click "Generate Image" button above to create a professional quotation image using AI.</p>
            </div>
          </div>
        ) : null}

        {/* PDF-like Content - FIRST PAGE (only show if NOT using image design or no image generated yet) */}
        {!profile?.use_image_design && (
          <div className="bg-white p-8 print:p-0 print:page-break-after-page" style={{
            display: 'flex', 
            flexDirection: 'column', 
            gap: `${spacing.headerSpacing * 0.25}rem`,
            minHeight: 'auto'
          }}>
          {/* Header Section */}
          <div className="relative">
            {selectedImages.header && selectedImages.header !== 'none' ? (
              <div className="w-full rounded-lg overflow-hidden">
                <img 
                  src={selectedImages.header} 
                  alt="Header" 
                  className="w-full h-auto max-h-32 object-contain"
                />
              </div>
            ) : (
              <div className="bg-orange-600 text-foreground p-4 rounded-lg relative">
                {/* GST Number - Top Right */}
                <div className="absolute top-2 right-4">
                  <Input
                    value={editableText.gstNumber}
                    onChange={(e) => updateEditableText('gstNumber', e.target.value)}
                    className="font-bold bg-transparent border-0 p-0 text-foreground placeholder-foreground/70 text-right print:hidden"
                  />
                  <p className="hidden print:block font-bold">{editableText.gstNumber}</p>
                </div>

                {/* Company Name and Logo - Center */}
                <div className="flex flex-col items-center justify-center pt-6 pb-4">
                  <div className="flex items-center gap-4">
                    {/* Company Logo */}
                    {profile?.company_logo_url && (
                      <img 
                        src={profile.company_logo_url} 
                        alt="Company Logo" 
                        className="h-16 w-16 object-contain"
                      />
                    )}
                    
                    {/* Company Name */}
                    <div className="text-center">
                      <Input
                        value={editableText.companyName || profile?.company_name || 'BHAIRAVNEX'}
                        onChange={(e) => updateEditableText('companyName', e.target.value)}
                        style={{ color: styleCustomization.companyNameColor }}
                        className="text-4xl font-bold bg-transparent border-0 p-0 text-foreground placeholder-foreground/70 print:hidden text-center underline"
                      />
                      <h1 className="hidden print:block text-4xl font-bold underline" style={{ color: styleCustomization.companyNameColor }}>{editableText.companyName || profile?.company_name || 'BHAIRAVNEX'}</h1>
                    </div>
                  </div>
                </div>

                {/* Company Slogan - Bottom Left */}
                <div className="absolute bottom-2 left-4">
                  <Textarea
                    value={editableText.tagline}
                    onChange={(e) => updateEditableText('tagline', e.target.value)}
                    className="text-sm italic bg-transparent border-0 p-0 text-foreground placeholder-foreground/70 resize-none min-h-[20px] print:hidden"
                  />
                  <p className="hidden print:block text-sm italic">{editableText.tagline}</p>
                </div>
              </div>
            )}
          </div>

          {/* QUOTATION Label */}
          <div className="text-center" style={{ marginTop: `${spacing.quotationLabelSpacing * 0.25}rem` }}>
            <div 
              className="text-foreground px-6 py-2 inline-block font-bold text-lg"
              style={{ backgroundColor: styleCustomization.titleColor }}
            >
              QUOTATION
            </div>
          </div>

          {/* Quotation Details */}
          <div className="flex justify-between text-sm print:hidden" style={{ marginTop: `${spacing.detailsSpacing * 0.25}rem`, marginBottom: `${spacing.detailsSpacing * 0.25}rem` }}>
            <div className="flex items-center gap-2">
              <span>Quotation No.:</span>
              <Input
                value={quotation.quotation_number}
                onChange={(e) => updateQuotationField('quotation_number', e.target.value)}
                className="h-6 text-sm font-bold border-0 p-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Date:</span>
              <Input
                type="date"
                value={new Date(quotation.created_at).toISOString().split('T')[0]}
                onChange={(e) => updateQuotationField('created_at', e.target.value)}
                className="h-6 text-sm font-bold border-0 p-0 bg-transparent"
              />
            </div>
          </div>
          
          {/* Print version - non-editable */}
          <div className="hidden print:flex justify-between text-sm" style={{ marginTop: `${spacing.detailsSpacing * 0.25}rem`, marginBottom: `${spacing.detailsSpacing * 0.25}rem` }}>
            <span>Quotation No.: <strong>{quotation.quotation_number}</strong></span>
            <span>Date: <strong>{new Date(quotation.created_at).toLocaleDateString('en-GB')}</strong></span>
          </div>

          {/* Salutation and Introduction */}
          <div className="text-sm" style={{ marginTop: `${spacing.introSpacing * 0.25}rem`, marginBottom: `${spacing.introSpacing * 0.25}rem` }}>
            <div className="space-y-3">
            {/* Editable salutation */}
            <Input
              value={editableText.salutation}
              onChange={(e) => updateEditableText('salutation', e.target.value)}
              className="border-0 p-0 bg-transparent text-sm print:hidden"
            />
            <p className="hidden print:block">{editableText.salutation}</p>
            
            {/* Editable intro text */}
            <Textarea
              value={editableText.introText}
              onChange={(e) => updateEditableText('introText', e.target.value)}
              className="border-0 p-0 bg-transparent text-sm resize-none min-h-[40px] print:hidden"
            />
            <p className="hidden print:block">{editableText.introText}</p>
            
            <div className="flex items-center gap-2 print:hidden">
              <span><strong>Sub:</strong></span>
              <Input
                value={quotation.title}
                onChange={(e) => updateQuotationField('title', e.target.value)}
                className="h-6 text-sm font-bold border-0 p-0 bg-transparent flex-1"
              />
            </div>
            <p className="hidden print:block"><strong>Sub: {quotation.title}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <div 
            className="border" 
            style={{ 
              marginTop: `${spacing.tableSpacing * 0.25}rem`,
              borderColor: styleCustomization.tableBorderColor,
              borderWidth: `${styleCustomization.tableBorderSize}px`
            }}
          >
            {/* Table Header */}
            <div 
              className="grid grid-cols-12 border-b font-bold text-sm p-3"
              style={{ 
                backgroundColor: styleCustomization.tableHeaderBgColor,
                borderColor: styleCustomization.tableBorderColor,
                borderWidth: `${styleCustomization.tableBorderSize}px`
              }}
            >
              <div className="col-span-5">Description</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-center">Rate</div>
              <div className="col-span-2 text-center">GST Amount</div>
              <div className="col-span-2 text-center">Total</div>
            </div>
            
            {/* Table Rows */}
            {items.map((item, index) => {
              const itemSubtotal = item.quantity * item.unit_price
              const gstAmount = (itemSubtotal * quotation.tax_rate) / 100
              const itemTotal = itemSubtotal + gstAmount
              
              return (
                <div 
                  key={item.id} 
                  className={`grid grid-cols-12 border-b text-sm p-3 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}
                  style={{ 
                    borderColor: styleCustomization.tableBorderColor,
                    borderWidth: `${styleCustomization.tableBorderSize}px`
                  }}
                >
                  <div className="col-span-5 pr-2">
                    {/* Editable description with hover card */}
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
                    {/* Print version */}
                    <div className="hidden print:block whitespace-pre-wrap">{item.description}</div>
                  </div>
                  
                  <div className="col-span-1 text-center">
                    {/* Editable quantity */}
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 text-center border-0 p-0 bg-transparent text-sm print:hidden"
                    />
                    {/* Print version */}
                    <div className="hidden print:block">{item.quantity}</div>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    {/* Editable unit price */}
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItemField(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-8 text-center border-0 p-0 bg-transparent text-sm print:hidden"
                    />
                    {/* Print version */}
                    <div className="hidden print:block">{item.unit_price.toFixed(2)}</div>
                  </div>
                  
                   <div className="col-span-2 text-center">
                      <div>{gstAmount.toFixed(2)}</div>
                      <div>({quotation.tax_rate}%)</div>
                    </div>
                    <div className="col-span-2 text-center">{itemTotal.toFixed(2)}</div>
                </div>
              )
            })}

            {/* Subtotal Row */}
            <div 
              className="grid grid-cols-12 border-b font-bold text-sm p-3"
              style={{ 
                backgroundColor: styleCustomization.tableFooterBgColor,
                borderColor: styleCustomization.tableBorderColor,
                borderWidth: `${styleCustomization.tableBorderSize}px`
              }}
            >
              <div className="col-span-5 flex items-center">Sub Total</div>
              <div className="col-span-1"></div>
              <div className="col-span-2"></div>
               <div className="col-span-2 text-center">{quotation.tax_amount.toFixed(2)}</div>
               <div className="col-span-2 text-center">{quotation.total_amount.toFixed(2)}</div>
            </div>
          </div>

          {/* Grand Total Section */}
          <div 
            className="grid grid-cols-2 border text-sm" 
            style={{ 
              marginTop: `${spacing.totalSpacing * 0.25}rem`,
              borderColor: styleCustomization.tableBorderColor,
              borderWidth: `${styleCustomization.tableBorderSize}px`
            }}
          >
            <div className="p-3 border-r">
              {/* Editable grand total text */}
              <Input
                value={editableText.grandTotalText}
                onChange={(e) => updateEditableText('grandTotalText', e.target.value)}
                className="font-bold border-0 p-0 bg-transparent text-sm print:hidden"
              />
              <div className="hidden print:block font-bold">{editableText.grandTotalText}</div>
              
              <div className="text-sm">{numberToWords(Math.round(quotation.total_amount))}</div>
            </div>
            <div className="p-3">
              <div className="flex justify-between">
                <Input
                  value={editableText.roundedText}
                  onChange={(e) => updateEditableText('roundedText', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <span className="hidden print:block">{editableText.roundedText}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <Input
                  value={editableText.totalText}
                  onChange={(e) => updateEditableText('totalText', e.target.value)}
                  className="font-bold text-lg border-0 p-0 bg-transparent print:hidden"
                />
                <span className="hidden print:block">{editableText.totalText}</span>
                <span>{Math.round(quotation.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions and Signature */}
          <div className="grid grid-cols-2 gap-6" style={{ marginTop: `${spacing.termsSpacing * 0.25}rem` }}>
            <div className="border p-4">
              {/* Editable terms title */}
              <Input
                value={editableText.termsTitle}
                onChange={(e) => updateEditableText('termsTitle', e.target.value)}
                className="font-bold text-base mb-3 border-0 p-0 bg-transparent print:hidden"
              />
              <h3 className="hidden print:block font-bold text-base mb-3">{editableText.termsTitle}</h3>
              
              <div className="text-sm space-y-1">
                {/* Editable terms */}
                <Input
                  value={editableText.completionTerm}
                  onChange={(e) => updateEditableText('completionTerm', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.completionTerm}</div>
                
                <Input
                  value={editableText.gstTerm}
                  onChange={(e) => updateEditableText('gstTerm', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.gstTerm}</div>
                
                <Input
                  value={editableText.transportTerm}
                  onChange={(e) => updateEditableText('transportTerm', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.transportTerm}</div>
              </div>
            </div>
            
            <div className="border p-4">
              <div className="text-sm space-y-3">
                {/* Editable signature text */}
                <Input
                  value={editableText.signatureText}
                  onChange={(e) => updateEditableText('signatureText', e.target.value)}
                  className="border-0 p-0 bg-transparent text-sm print:hidden"
                />
                <div className="hidden print:block">{editableText.signatureText}</div>
                
                <div className="font-bold text-foreground">
                  For {editableText.companyName || profile?.company_name || ''}
                </div>
                
                {selectedImages.signature && selectedImages.signature !== 'none' ? (
                  <img 
                    src={selectedImages.signature} 
                    alt="Signature" 
                    className="h-16 w-auto"
                  />
                ) : (
                  <div className="h-16 border-b border-gray-300 mt-4 mb-2">
                    <div className="text-xs text-gray-500 pt-12">Signature</div>
                  </div>
                )}
                
                <div className="mt-8">
                  <Input
                    value={editableText.signatureRole1}
                    onChange={(e) => updateEditableText('signatureRole1', e.target.value)}
                    className="border-0 p-0 bg-transparent text-sm print:hidden"
                  />
                  <div className="hidden print:block">{editableText.signatureRole1}</div>
                  
                  <Input
                    value={editableText.signatureRole2}
                    onChange={(e) => updateEditableText('signatureRole2', e.target.value)}
                    className="border-0 p-0 bg-transparent text-sm print:hidden"
                  />
                  <div className="hidden print:block">{editableText.signatureRole2}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: `${spacing.footerSpacing * 0.25}rem` }} className="-mx-8 print:mx-0">
            {selectedImages.footer && selectedImages.footer !== 'none' ? (
              <img 
                src={selectedImages.footer} 
                alt="Footer" 
                className="w-full h-16 object-cover"
              />
            ) : (
              <div className="bg-orange-600 text-foreground p-3 text-xs">
                <div className="flex justify-between items-start">
                  <div className="text-left">
                    {/* Company Address - Left Aligned */}
                    <Input
                      value={editableText.footerAddress1}
                      onChange={(e) => updateEditableText('footerAddress1', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-foreground placeholder-foreground/70 print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerAddress1}</div>
                    
                    <Input
                      value={editableText.footerAddress2}
                      onChange={(e) => updateEditableText('footerAddress2', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-foreground placeholder-foreground/70 print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerAddress2}</div>
                  </div>
                  <div className="text-right">
                    {/* Phone Number - Right Aligned */}
                    <Input
                      value={editableText.footerPhone}
                      onChange={(e) => updateEditableText('footerPhone', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-foreground placeholder-foreground/70 text-right print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerPhone}</div>
                    
                    {/* Email - Right Aligned */}
                    <Input
                      value={editableText.footerEmail}
                      onChange={(e) => updateEditableText('footerEmail', e.target.value)}
                      className="border-0 p-0 bg-transparent text-xs text-foreground placeholder-foreground/70 text-right print:hidden"
                    />
                    <div className="hidden print:block">{editableText.footerEmail}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* SCOPE OF WORK - SEPARATE PAGE */}
        {!profile?.use_image_design && quotation.scope_of_work && (
          <div className="bg-white p-8 print:p-0 print:page-break-before-page print:page-break-after-avoid" style={{ minHeight: 'auto' }}>
            {/* Header for Second Page */}
            <div className="relative mb-8">
              {selectedImages.header && selectedImages.header !== 'none' ? (
                <div className="w-full rounded-lg overflow-hidden">
                  <img 
                    src={selectedImages.header} 
                    alt="Header" 
                    className="w-full h-auto max-h-32 object-contain"
                  />
                </div>
              ) : (
                <div className="bg-orange-600 text-foreground p-4 rounded-lg relative">
                  {/* GST Number - Top Right */}
                  <div className="absolute top-2 right-4">
                    <p className="font-bold">{editableText.gstNumber}</p>
                  </div>

                  {/* Company Name and Logo - Center */}
                  <div className="flex flex-col items-center justify-center pt-6 pb-4">
                    <div className="flex items-center gap-4">
                      {/* Company Logo */}
                      {profile?.company_logo_url && (
                        <img 
                          src={profile.company_logo_url} 
                          alt="Company Logo" 
                          className="h-16 w-16 object-contain"
                        />
                      )}
                      
                      {/* Company Name */}
                      <div className="text-center">
                        <h1 className="text-4xl font-bold underline" style={{ color: styleCustomization.companyNameColor }}>{editableText.companyName || profile?.company_name || 'BHAIRAVNEX'}</h1>
                      </div>
                    </div>
                  </div>

                  {/* Company Slogan - Bottom Left */}
                  <div className="absolute bottom-2 left-4">
                    <p className="text-sm italic">{editableText.tagline}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scope of Work Section with Underlined Heading */}
            <div 
              className="border p-6"
              style={{ 
                borderColor: styleCustomization.tableBorderColor,
                borderWidth: `${styleCustomization.tableBorderSize}px`
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 
                  className="font-bold text-xl underline text-center flex-1"
                  style={{ color: styleCustomization.titleColor }}
                >
                  SCOPE OF WORK
                </h3>
                <Button
                  onClick={addScopeLine}
                  variant="outline"
                  size="sm"
                  className="print:hidden"
                >
                  + Add Line
                </Button>
              </div>
              <div className="text-sm space-y-2">
                {scopeLines.map((line, index) => (
                  <div key={index} className="flex gap-2 group">
                    <Textarea
                      value={line}
                      onChange={(e) => updateScopeLine(index, e.target.value)}
                      className="print:hidden min-h-[60px] text-sm leading-relaxed"
                      placeholder="Enter scope of work item..."
                    />
                    <div className="hidden print:block whitespace-pre-wrap leading-relaxed flex-1">{line}</div>
                    <Button
                      onClick={() => removeScopeLine(index)}
                      variant="ghost"
                      size="sm"
                      className="print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer for Second Page */}
            <div className="mt-8 -mx-8 print:mx-0">
              {selectedImages.footer && selectedImages.footer !== 'none' ? (
                <img 
                  src={selectedImages.footer} 
                  alt="Footer" 
                  className="w-full h-16 object-cover"
                />
              ) : (
                <div className="bg-orange-600 text-foreground p-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <div>{editableText.footerAddress1}</div>
                      <div>{editableText.footerAddress2}</div>
                    </div>
                    <div className="text-right">
                      <div>{editableText.footerPhone}</div>
                      <div>{editableText.footerEmail}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
