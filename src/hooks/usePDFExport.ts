
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
      pdf.setFillColor(0, 0, 0)
      pdf.rect(85, yPosition, 40, 12, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('QUOTATION', 105, yPosition + 8, { align: 'center' })
      
      yPosition += 20
      
      // Quotation details
      pdf.setTextColor(blackColor)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      
      pdf.text(`Quotation No.: ${quotation.quotation_number}`, 15, yPosition)
      pdf.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('en-GB')}`, pageWidth - 15, yPosition, { align: 'right' })
      
      yPosition += 15
      pdf.text('Dear Sir,', 15, yPosition)
      
      yPosition += 10
      const introText = 'We would like to submit our lowest budgetary quote for the supply and installation of the following items:'
      const splitIntro = pdf.splitTextToSize(introText, pageWidth - 30)
      pdf.text(splitIntro, 15, yPosition)
      yPosition += splitIntro.length * 5 + 5
      
      pdf.text(`Sub: ${quotation.title || 'Project quotation'}`, 15, yPosition)
      yPosition += 15
      
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
      const termsStartY = yPosition + 10
      
      // Check if we need a new page for the signature section
      if (termsStartY + 70 > pageHeight - 30) {
        // Add footer to current page
        addFooterToPage(pdf, pageWidth, pageHeight, footerImage, userProfile)
        
        // Add new page
        pdf.addPage()
        
        // Add header to new page
        yPosition = addHeaderToPage(pdf, pageWidth, headerImage, userProfile)
        const newTermsStartY = yPosition + 10
        
        pdf.setFillColor(255, 255, 255)
        pdf.rect(15, newTermsStartY, 80, 60, 'FD')
        pdf.rect(95, newTermsStartY, 100, 60, 'FD')
        
        // Terms & Conditions
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(blackColor)
        pdf.text('Terms & Conditions', 17, newTermsStartY + 12)
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.text('Completion: 90 Days', 17, newTermsStartY + 22)
        pdf.text('GST: As indicated', 17, newTermsStartY + 30)
        pdf.text('Transport: NA', 17, newTermsStartY + 38)
        
        // Signature section
        pdf.text('With regards', 97, newTermsStartY + 12)
        
        // Company name in signature
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(100, 100, 255)
        const companyName = userProfile?.company_name || 'BHAIRAVNEX'
        pdf.text(`For ${companyName}`, 97, newTermsStartY + 25)
        
        // Add signature image if available
        if (signatureImage) {
          try {
            pdf.addImage(signatureImage, 'JPEG', 97, newTermsStartY + 30, 80, 20)
          } catch (error) {
            console.error('Error adding signature image:', error)
          }
        }
        
        // Signature placeholder text
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(blackColor)
        pdf.text('Managing Partner', 97, newTermsStartY + 55)
        pdf.text('Authorised Signature', 97, newTermsStartY + 62)
      } else {
        // Keep original layout if it fits on current page
        pdf.setFillColor(255, 255, 255)
        pdf.rect(15, termsStartY, 80, 60, 'FD')
        pdf.rect(95, termsStartY, 100, 60, 'FD')
        
        // Terms & Conditions
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(blackColor)
        pdf.text('Terms & Conditions', 17, termsStartY + 12)
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.text('Completion: 90 Days', 17, termsStartY + 22)
        pdf.text('GST: As indicated', 17, termsStartY + 30)
        pdf.text('Transport: NA', 17, termsStartY + 38)
        
        // Signature section
        pdf.text('With regards', 97, termsStartY + 12)
        
        // Company name in signature
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(100, 100, 255)
        const companyName = userProfile?.company_name || 'BHAIRAVNEX'
        pdf.text(`For ${companyName}`, 97, termsStartY + 25)
        
        // Add signature image if available
        if (signatureImage) {
          try {
            pdf.addImage(signatureImage, 'JPEG', 97, termsStartY + 30, 80, 20)
          } catch (error) {
            console.error('Error adding signature image:', error)
          }
        }
        
        // Signature placeholder text
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(blackColor)
        pdf.text('Managing Partner', 97, termsStartY + 55)
        pdf.text('Authorised Signature', 97, termsStartY + 62)
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
    // Header background with orange gradient
    pdf.setFillColor(210, 105, 30) // Orange color
    pdf.rect(0, 0, pageWidth, 40, 'F')
    
    pdf.setTextColor(255, 255, 255)
    
    // GST number in top right
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    const gstNumber = `GST: ${userProfile?.gst_number || '37ABDFB9225A1Z5'}`
    pdf.text(gstNumber, pageWidth - 15, 12, { align: 'right' })
    
    // Company name - center, larger and underlined
    pdf.setFontSize(32)
    pdf.setFont('helvetica', 'bold')
    const companyName = userProfile?.company_name || 'BHAIRAVNEX'
    const nameWidth = pdf.getTextWidth(companyName)
    const nameX = (pageWidth - nameWidth) / 2
    pdf.text(companyName, nameX, 25)
    
    // Underline for company name
    pdf.setLineWidth(1)
    pdf.line(nameX, 27, nameX + nameWidth, 27)
    
    // Company logo - center, next to company name if available
    if (userProfile?.company_logo_url) {
      // Logo would be loaded and positioned here - for now just reserve space
      // The actual logo loading would need to be implemented with base64 conversion
    }
    
    // Company slogan - bottom left
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const companySlogan = userProfile?.company_slogan || '"Engineering Tomorrow\'s Technologies, Today"'
    pdf.text(companySlogan, 15, 35)
    
    return 50
  }

  const renderDefaultFooter = (pdf: jsPDF, pageWidth: number, footerY: number, userProfile?: Profile) => {
    pdf.setFillColor(210, 105, 30)
    pdf.rect(0, footerY, pageWidth, 25, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    
    // Company Address - Left Aligned (only if exists)
    if (userProfile?.company_address) {
      const address1 = userProfile.company_address.split(',')[0]?.trim()
      const address2 = userProfile.company_address.split(',').slice(1).join(',').trim()
      
      if (address1) {
        pdf.text(address1, 15, footerY + 8)
      }
      if (address2) {
        pdf.text(address2, 15, footerY + 15)
      }
    }
    
    // Phone Number and Email - Right Aligned (only if exists)
    if (userProfile?.company_phone) {
      pdf.text(userProfile.company_phone, pageWidth - 15, footerY + 8, { align: 'right' })
    }
    if (userProfile?.company_email) {
      pdf.text(`Email: ${userProfile.company_email}`, pageWidth - 15, footerY + 15, { align: 'right' })
    }
  }

  const addHeaderToPage = (pdf: jsPDF, pageWidth: number, headerImage: string | null, userProfile?: Profile) => {
    if (headerImage) {
      try {
        pdf.addImage(headerImage, 'JPEG', 0, 0, pageWidth, 40)
        return 50
      } catch (error) {
        console.error('Error adding header image:', error)
        return renderDefaultHeader(pdf, pageWidth, userProfile)
      }
    } else {
      return renderDefaultHeader(pdf, pageWidth, userProfile)
    }
  }

  const addFooterToPage = (pdf: jsPDF, pageWidth: number, pageHeight: number, footerImage: string | null, userProfile?: Profile) => {
    const footerY = pageHeight - 30
    if (footerImage) {
      try {
        pdf.addImage(footerImage, 'JPEG', 0, footerY, pageWidth, 30)
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
    const maxContentHeight = pageHeight - footerHeight - 20 // Leave space for footer and margin
    
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
    
    const headers = ['Description', 'Qty', 'Rate (Rs.)', 'GST Amount', 'Total (Rs.)']
    
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
      
      // Check if we need a new page
      if (yPosition + rowHeight + 50 > maxContentHeight) { // 50 extra for totals
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
      
      // Cell content with proper alignment and wrapping
      const descLines = pdf.splitTextToSize(item.description, colWidths[0] - 6)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(descLines, colPositions[0] + 3, yPosition + 8)
      
      // Center align numeric values with proper formatting
      pdf.setFont('helvetica', 'normal')
      const qtyText = item.quantity.toString()
      const qtyWidth = pdf.getTextWidth(qtyText)
      pdf.text(qtyText, colPositions[1] + (colWidths[1] / 2) - (qtyWidth / 2), yPosition + 12)
      
      const priceText = `Rs. ${item.unit_price.toFixed(2)}`
      const priceWidth = pdf.getTextWidth(priceText)
      pdf.text(priceText, colPositions[2] + (colWidths[2] / 2) - (priceWidth / 2), yPosition + 12)
      
      // GST Amount column with better formatting
      const gstText = `Rs. ${gstAmount.toFixed(2)}`
      const gstWidth = pdf.getTextWidth(gstText)
      pdf.text(gstText, colPositions[3] + (colWidths[3] / 2) - (gstWidth / 2), yPosition + 8)
      
      const gstPercentText = `(${quotation.tax_rate}%)`
      const gstPercentWidth = pdf.getTextWidth(gstPercentText)
      pdf.text(gstPercentText, colPositions[3] + (colWidths[3] / 2) - (gstPercentWidth / 2), yPosition + 16)
      
      const totalText = `Rs. ${itemTotal.toFixed(2)}`
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
    
    const totalGstText = `Rs. ${quotation.tax_amount.toFixed(2)}`
    const totalGstWidth = pdf.getTextWidth(totalGstText)
    pdf.text(totalGstText, colPositions[3] + (colWidths[3] / 2) - (totalGstWidth / 2), yPosition + 10)
    
    const subtotalText = `Rs. ${quotation.subtotal.toFixed(2)}`
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
    const finalTotalText = `Rs. ${Math.round(quotation.subtotal)}`
    const finalTotalWidth = pdf.getTextWidth(finalTotalText)
    pdf.text(finalTotalText, pageMargin + summaryBoxWidth + totalBoxWidth - 2 - finalTotalWidth, yPosition + 12)
    
    return yPosition + 25
  }

  return {
    exportToPDF,
    loading,
  }
}
