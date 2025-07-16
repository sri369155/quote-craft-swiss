
import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { useToast } from '@/hooks/use-toast'
import { Quotation, QuotationItem, Customer, Profile } from '@/types/database'
import { numberToWords } from '@/lib/utils'

export function usePDFExport() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error loading image:', error)
      return null
    }
  }

  const exportToPDF = async (
    quotation: Quotation,
    customer: Customer,
    items: QuotationItem[],
    userProfile?: Profile
  ) => {
    setLoading(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const footerHeight = 30
      
      // Load custom images if available
      let headerImage: string | null = null
      let footerImage: string | null = null
      let signatureImage: string | null = null
      
      if (userProfile?.header_image_url) {
        headerImage = await loadImageAsBase64(userProfile.header_image_url)
      }
      if (userProfile?.footer_image_url) {
        footerImage = await loadImageAsBase64(userProfile.footer_image_url)
      }
      if (userProfile?.signature_image_url) {
        signatureImage = await loadImageAsBase64(userProfile.signature_image_url)
      }
      
      // Colors
      const orangeColor = '#D2691E'
      const blackColor = '#000000'
      const grayColor = '#808080'
      const lightGray = '#f5f5f5'
      
      let yPosition = 0
      
      // Header section - First page
      yPosition = addHeaderToPage(pdf, pageWidth, headerImage, userProfile)
      
      // QUOTATION label
      pdf.setTextColor(37, 99, 235) // Modern blue color
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('QUOTATION', pageWidth / 2, yPosition + 8, { align: 'center' })

      yPosition += 15 // Reduced spacing
      
      // Quotation details
      pdf.setTextColor(blackColor)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      
      pdf.text(`Quotation No.: ${quotation.quotation_number}`, 15, yPosition)
      pdf.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('en-GB')}`, pageWidth - 15, yPosition, { align: 'right' })
      
      yPosition += 12 // Reduced spacing
      pdf.text('Dear Sir,', 15, yPosition)
      
      yPosition += 8 // Reduced spacing
      const introText = 'We would like to submit our lowest budgetary quote for the supply and installation of the following items:'
      const splitIntro = pdf.splitTextToSize(introText, pageWidth - 30)
      pdf.text(splitIntro, 15, yPosition)
      yPosition += splitIntro.length * 4 + 3 // Reduced line spacing
      
      pdf.text(`Sub: ${quotation.title || 'Project quotation'}`, 15, yPosition)
      yPosition += 12 // Reduced spacing
      
      // Table rendering with multi-page support
      yPosition = renderMultiPageTable(
        pdf, 
        pageWidth, 
        pageHeight,
        yPosition, 
        items, 
        quotation,
        headerImage,
        footerImage,
        userProfile
      )
      
      // Terms & Conditions and Signature section
      const termsStartY = yPosition + 5 // Reduced from 10
      
      // Check if we need a new page for the signature section
      if (termsStartY + 40 > pageHeight - 30) { // Reduced from 70 to 40
        // Add footer to current page
        addFooterToPage(pdf, pageWidth, pageHeight, footerImage, userProfile)
        
        // Add new page
        pdf.addPage()
        
        // Add header to new page
        yPosition = addHeaderToPage(pdf, pageWidth, headerImage, userProfile)
        const newTermsStartY = yPosition + 5 // Reduced from 10
        
        pdf.setFillColor(255, 255, 255)
        pdf.rect(15, newTermsStartY, 80, 30, 'FD') // Reduced height from 60 to 30
        pdf.rect(95, newTermsStartY, 100, 30, 'FD') // Reduced height from 60 to 30
        
        // Terms & Conditions
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(blackColor)
        pdf.text('Terms & Conditions', 17, newTermsStartY + 8) // Reduced from 12
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.text('Completion: 90 Days', 17, newTermsStartY + 15) // Reduced spacing
        pdf.text('GST: As indicated', 17, newTermsStartY + 20) // Reduced spacing
        pdf.text('Transport: NA', 17, newTermsStartY + 25) // Reduced spacing
        
        // Signature section
        pdf.text('With regards', 97, newTermsStartY + 8) // Reduced from 12
        
        // Company name in signature
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(37, 99, 235) // Modern blue to match header
        const companyName = userProfile?.company_name || 'BHAIRAVNEX'
        pdf.text(`For ${companyName}`, 97, newTermsStartY + 15) // Reduced from 25
        
        // Add signature image if available
        if (signatureImage) {
          try {
            pdf.addImage(signatureImage, 'JPEG', 97, newTermsStartY + 18, 60, 10) // Reduced size and position
          } catch (error) {
            console.error('Error adding signature image:', error)
          }
        }
        
        // Only keep "Authorised Signature" - removed "Managing Partner"
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9) // Reduced font size
        pdf.setTextColor(blackColor)
        pdf.text('Authorised Signature', 97, newTermsStartY + 28) // Reduced from 62
      } else {
        // Keep original layout if it fits on current page
        pdf.setFillColor(255, 255, 255)
        pdf.rect(15, termsStartY, 80, 30, 'FD') // Reduced height from 60 to 30
        pdf.rect(95, termsStartY, 100, 30, 'FD') // Reduced height from 60 to 30
        
        // Terms & Conditions
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(blackColor)
        pdf.text('Terms & Conditions', 17, termsStartY + 8) // Reduced from 12
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.text('Completion: 90 Days', 17, termsStartY + 15) // Reduced spacing
        pdf.text('GST: As indicated', 17, termsStartY + 20) // Reduced spacing
        pdf.text('Transport: NA', 17, termsStartY + 25) // Reduced spacing
        
        // Signature section
        pdf.text('With regards', 97, termsStartY + 8) // Reduced from 12
        
        // Company name in signature
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(37, 99, 235) // Modern blue to match header
        const companyName = userProfile?.company_name || 'BHAIRAVNEX'
        pdf.text(`For ${companyName}`, 97, termsStartY + 15) // Reduced from 25
        
        // Add signature image if available
        if (signatureImage) {
          try {
            pdf.addImage(signatureImage, 'JPEG', 97, termsStartY + 18, 60, 10) // Reduced size and position
          } catch (error) {
            console.error('Error adding signature image:', error)
          }
        }
        
        // Only keep "Authorised Signature" - removed "Managing Partner"
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9) // Reduced font size
        pdf.setTextColor(blackColor)
        pdf.text('Authorised Signature', 97, termsStartY + 28) // Reduced from 62
      }
      
      // Footer
      addFooterToPage(pdf, pageWidth, pageHeight, footerImage, userProfile)
      
      // Save the PDF
      pdf.save(`quotation-${quotation.quotation_number}.pdf`)
      
      toast({
        title: 'PDF Generated',
        description: 'Quotation PDF has been downloaded successfully with your custom format.',
      })
    } catch (error: any) {
      toast({
        title: 'PDF Export Error',
        description: error.message || 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderDefaultHeader = (pdf: jsPDF, pageWidth: number, userProfile?: Profile) => {
    // Header background with modern blue gradient
    pdf.setFillColor(37, 99, 235) // Modern blue color
    pdf.rect(0, 0, pageWidth, 25, 'F') // Reduced height from 40 to 25
    
    pdf.setTextColor(255, 255, 255) // White text on blue background
    
    // GST number in top right
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    const gstNumber = `GST: ${userProfile?.gst_number || '37ABDFB9225A1Z5'}`
    pdf.text(gstNumber, pageWidth - 15, 10, { align: 'right' })
    
    // Company name - center, larger
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    const companyName = userProfile?.company_name || 'BHAIRAVNEX'
    pdf.text(companyName, pageWidth / 2, 15, { align: 'center' })
    
    // Company slogan - bottom center
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    const companySlogan = userProfile?.company_slogan || '"Engineering Tomorrow\'s Technologies, Today"'
    pdf.text(companySlogan, pageWidth / 2, 22, { align: 'center' })
    
    return 35 // Reduced from 50 to 35
  }

  const renderDefaultFooter = (pdf: jsPDF, pageWidth: number, footerY: number, userProfile?: Profile) => {
    pdf.setFillColor(37, 99, 235) // Modern blue to match header
    pdf.rect(0, footerY, pageWidth, 20, 'F') // Reduced height from 25 to 20
    
    pdf.setTextColor(255, 255, 255) // White text on blue background
    pdf.setFontSize(8)
    
    // Company Address - Left Aligned (only if exists)
    if (userProfile?.company_address) {
      const address1 = userProfile.company_address.split(',')[0]?.trim()
      const address2 = userProfile.company_address.split(',').slice(1).join(',').trim()
      
      if (address1) {
        pdf.text(address1, 15, footerY + 6)
      }
      if (address2) {
        pdf.text(address2, 15, footerY + 12)
      }
    }
    
    // Phone Number and Email - Right Aligned (only if exists)
    if (userProfile?.company_phone) {
      pdf.text(userProfile.company_phone, pageWidth - 15, footerY + 6, { align: 'right' })
    }
    if (userProfile?.company_email) {
      pdf.text(`Email: ${userProfile.company_email}`, pageWidth - 15, footerY + 12, { align: 'right' })
    }
  }

  const addHeaderToPage = (pdf: jsPDF, pageWidth: number, headerImage: string | null, userProfile?: Profile) => {
    if (headerImage) {
      try {
        pdf.addImage(headerImage, 'JPEG', 0, 0, pageWidth, 25) // Reduced height from 40 to 25
        return 35 // Reduced from 50 to 35
      } catch (error) {
        console.error('Error adding header image:', error)
        return renderDefaultHeader(pdf, pageWidth, userProfile)
      }
    } else {
      return renderDefaultHeader(pdf, pageWidth, userProfile)
    }
  }

  const addFooterToPage = (pdf: jsPDF, pageWidth: number, pageHeight: number, footerImage: string | null, userProfile?: Profile) => {
    const footerY = pageHeight - 20 // Reduced footer height
    if (footerImage) {
      try {
        pdf.addImage(footerImage, 'JPEG', 0, footerY, pageWidth, 20) // Reduced height from 30 to 20
      } catch (error) {
        console.error('Error adding footer image:', error)
        renderDefaultFooter(pdf, pageWidth, footerY, userProfile)
      }
    } else {
      renderDefaultFooter(pdf, pageWidth, footerY, userProfile)
    }
  }

  const renderMultiPageTable = (
    pdf: jsPDF, 
    pageWidth: number, 
    pageHeight: number,
    startY: number, 
    items: QuotationItem[], 
    quotation: Quotation,
    headerImage: string | null,
    footerImage: string | null,
    userProfile?: Profile
  ) => {
    const pageMargin = 15
    const availableWidth = pageWidth - (pageMargin * 2)
    const footerHeight = 30
    const maxContentHeight = pageHeight - footerHeight - 10 // Reduced space above footer
    
    // Dynamic column widths - better proportions
    const colWidths = [
      Math.floor(availableWidth * 0.40), // Description - 40%
      Math.floor(availableWidth * 0.08), // Qty - 8%
      Math.floor(availableWidth * 0.18), // Rate - 18%
      Math.floor(availableWidth * 0.18), // GST Amount - 18%
      Math.floor(availableWidth * 0.16)  // Total - 16%
    ]
    
    const colPositions = [pageMargin]
    for (let i = 1; i < colWidths.length; i++) {
      colPositions[i] = colPositions[i - 1] + colWidths[i - 1]
    }
    
    const headers = ['Description', 'Qty', 'Rate', 'GST Amount', 'Total']
    
    const renderTableHeader = (yPos: number) => {
      pdf.setFillColor(240, 240, 240)
      pdf.setDrawColor(0, 0, 0)
      pdf.setLineWidth(0.5)
      pdf.rect(pageMargin, yPos, availableWidth, 15, 'FD')
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(0, 0, 0)
      
      headers.forEach((header, index) => {
        const textWidth = pdf.getTextWidth(header)
        const cellCenter = colPositions[index] + (colWidths[index] / 2)
        pdf.text(header, cellCenter - (textWidth / 2), yPos + 10)
      })
      
      // Draw header borders
      for (let i = 0; i < colPositions.length; i++) {
        pdf.line(colPositions[i], yPos, colPositions[i], yPos + 15)
      }
      pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPos, 
               colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPos + 15)
      
      return yPos + 15
    }
    
    let yPosition = renderTableHeader(startY)
    let subtotalBeforeGST = 0
    let totalGSTAmount = 0
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    
    items.forEach((item, index) => {
      const rowHeight = Math.max(20, Math.ceil(pdf.splitTextToSize(item.description, colWidths[0] - 4).length * 5) + 10)
      
      // Check if we need a new page - improved spacing
      if (yPosition + rowHeight + 35 > maxContentHeight) { // 35 extra for totals, reduced from 50
        // Add footer to current page
        addFooterToPage(pdf, pageWidth, pageHeight, footerImage, userProfile)
        
        // Add new page
        pdf.addPage()
        
        // Add header to new page
        const headerHeight = addHeaderToPage(pdf, pageWidth, headerImage, userProfile)
        yPosition = renderTableHeader(headerHeight + 10)
      }
      
      const itemSubtotal = item.quantity * item.unit_price
      const gstAmount = (itemSubtotal * quotation.tax_rate) / 100
      const itemTotal = itemSubtotal + gstAmount
      
      subtotalBeforeGST += itemSubtotal
      totalGSTAmount += gstAmount
      
      // Row background (alternating)
      if (index % 2 === 1) {
        pdf.setFillColor(248, 248, 248)
        pdf.rect(pageMargin, yPosition, availableWidth, rowHeight, 'F')
      }
      
      // Draw borders
      for (let i = 0; i < colPositions.length; i++) {
        pdf.line(colPositions[i], yPosition, colPositions[i], yPosition + rowHeight)
      }
      pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition, 
               colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition + rowHeight)
      pdf.line(pageMargin, yPosition + rowHeight, pageMargin + availableWidth, yPosition + rowHeight)
      
      // Cell content with proper alignment and wrapping - improved text wrapping
      const descLines = pdf.splitTextToSize(item.description, colWidths[0] - 8) // More padding for better wrapping
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      // Better vertical alignment for multiline descriptions
      const startY = yPosition + (rowHeight < 25 ? 12 : 8)
      pdf.text(descLines, colPositions[0] + 4, startY)
      
      // Center align numeric values with proper formatting
      pdf.setFont('helvetica', 'normal')
      const qtyText = item.quantity.toString()
      const qtyWidth = pdf.getTextWidth(qtyText)
      pdf.text(qtyText, colPositions[1] + (colWidths[1] / 2) - (qtyWidth / 2), yPosition + 12)
      
      const priceText = `${item.unit_price.toFixed(2)}`
      const priceWidth = pdf.getTextWidth(priceText)
      pdf.text(priceText, colPositions[2] + (colWidths[2] / 2) - (priceWidth / 2), yPosition + 12)
      
      // GST Amount column with better formatting
      const gstText = `${gstAmount.toFixed(2)}`
      const gstWidth = pdf.getTextWidth(gstText)
      pdf.text(gstText, colPositions[3] + (colWidths[3] / 2) - (gstWidth / 2), yPosition + 8)
      
      const gstPercentText = `(${quotation.tax_rate}%)`
      const gstPercentWidth = pdf.getTextWidth(gstPercentText)
      pdf.text(gstPercentText, colPositions[3] + (colWidths[3] / 2) - (gstPercentWidth / 2), yPosition + 16)
      
      const totalText = `${itemTotal.toFixed(2)}`
      const totalWidth = pdf.getTextWidth(totalText)
      pdf.text(totalText, colPositions[4] + (colWidths[4] / 2) - (totalWidth / 2), yPosition + 12)
      
      yPosition += rowHeight
    })
    
    // Subtotal row
    const totalRowHeight = 15
    pdf.setFillColor(240, 240, 240)
    pdf.rect(pageMargin, yPosition, availableWidth, totalRowHeight, 'F')
    
    for (let i = 0; i < colPositions.length; i++) {
      pdf.line(colPositions[i], yPosition, colPositions[i], yPosition + totalRowHeight)
    }
    pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition, 
             colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition + totalRowHeight)
    pdf.line(pageMargin, yPosition + totalRowHeight, pageMargin + availableWidth, yPosition + totalRowHeight)
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Sub Total', colPositions[0] + 2, yPosition + 10)
    
    const totalGstText = `${quotation.tax_amount.toFixed(2)}`
    const totalGstWidth = pdf.getTextWidth(totalGstText)
    pdf.text(totalGstText, colPositions[3] + (colWidths[3] / 2) - (totalGstWidth / 2), yPosition + 10)
    
    const subtotalText = `${quotation.total_amount.toFixed(2)}`
    const subtotalWidth = pdf.getTextWidth(subtotalText)
    pdf.text(subtotalText, colPositions[4] + (colWidths[4] / 2) - (subtotalWidth / 2), yPosition + 10)
    
    yPosition += totalRowHeight + 10
    
    // Grand total section
    const summaryBoxWidth = Math.floor(availableWidth * 0.65)
    const totalBoxWidth = availableWidth - summaryBoxWidth
    
    pdf.setFillColor(255, 255, 255)
    pdf.rect(pageMargin, yPosition, summaryBoxWidth, 25, 'FD')
    pdf.rect(pageMargin + summaryBoxWidth, yPosition, totalBoxWidth, 25, 'FD')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text('Grand Total (in words):', pageMargin + 2, yPosition + 8)
    pdf.setFont('helvetica', 'normal')
    const wordsText = numberToWords(Math.round(quotation.subtotal))
    const splitWordsText = pdf.splitTextToSize(wordsText, summaryBoxWidth - 4)
    pdf.text(splitWordsText, pageMargin + 2, yPosition + 15)
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Rounded', pageMargin + summaryBoxWidth + 2, yPosition + 8)
    pdf.text('Total', pageMargin + summaryBoxWidth + 2, yPosition + 15)
    pdf.setFontSize(10)
    const finalTotalText = `${Math.round(quotation.subtotal).toFixed(2)}`
    const finalTotalWidth = pdf.getTextWidth(finalTotalText)
    pdf.text(finalTotalText, pageMargin + summaryBoxWidth + totalBoxWidth - 2 - finalTotalWidth, yPosition + 12)
    
    return yPosition + 25
  }

  return {
    exportToPDF,
    loading,
  }
}
