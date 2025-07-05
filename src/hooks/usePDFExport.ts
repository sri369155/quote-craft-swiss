
import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { useToast } from '@/hooks/use-toast'
import { Quotation, QuotationItem, Customer, Profile } from '@/types/database'

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
      
      // Header section
      if (headerImage) {
        // Use custom header image with proper aspect ratio
        try {
          const img = new Image()
          img.onload = () => {
            // Calculate proper dimensions maintaining aspect ratio
            const aspectRatio = img.width / img.height
            const maxHeight = 40
            const maxWidth = pageWidth
            let width = maxWidth
            let height = width / aspectRatio
            
            if (height > maxHeight) {
              height = maxHeight
              width = height * aspectRatio
            }
            
            // Center the image horizontally
            const x = (pageWidth - width) / 2
            pdf.addImage(headerImage, 'JPEG', x, 0, width, height)
          }
          
          // For immediate processing, use a fixed size that usually works
          pdf.addImage(headerImage, 'JPEG', 0, 0, pageWidth, 40)
          yPosition = 50
          console.log('Custom header image loaded successfully')
        } catch (error) {
          console.error('Error adding header image:', error)
          // Fall back to default header
          yPosition = renderDefaultHeader(pdf, pageWidth, userProfile)
        }
      } else {
        // Default header
        yPosition = renderDefaultHeader(pdf, pageWidth, userProfile)
      }
      
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
      
      // Table rendering
      yPosition = renderQuotationTable(pdf, pageWidth, yPosition, items, quotation)
      
      // Terms & Conditions and Signature section
      const termsStartY = yPosition + 10
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
      
      // Footer
      const footerY = pageHeight - 30
      if (footerImage) {
        // Use custom footer image
        try {
          pdf.addImage(footerImage, 'JPEG', 0, footerY, pageWidth, 30)
        } catch (error) {
          console.error('Error adding footer image:', error)
          // Fall back to default footer
          renderDefaultFooter(pdf, pageWidth, footerY)
        }
      } else {
        // Default footer
        renderDefaultFooter(pdf, pageWidth, footerY)
      }
      
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
    pdf.rect(0, 0, pageWidth, 35, 'F')
    
    // Company name and tagline
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(28)
    pdf.setFont('helvetica', 'bold')
    const companyName = userProfile?.company_name || 'BHAIRAVNEX'
    pdf.text(companyName, 15, 22)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('"Engineering Tomorrow\'s Technologies, Today"', 15, 30)
    
    // GST number in top right
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('GST: 37ABDFB9225A1Z5', pageWidth - 15, 15, { align: 'right' })
    
    // Company logo placeholder (triangle shape in top right)
    pdf.setFillColor(255, 165, 0)
    pdf.triangle(pageWidth - 40, 5, pageWidth - 15, 5, pageWidth - 27.5, 25)
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text('LOGO', pageWidth - 27.5, 17, { align: 'center' })
    
    return 45
  }

  const renderDefaultFooter = (pdf: jsPDF, pageWidth: number, footerY: number) => {
    pdf.setFillColor(210, 105, 30)
    pdf.rect(0, footerY, pageWidth, 25, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text('Door No: 5-5, Vivekananda Nagar,', 15, footerY + 8)
    pdf.text('Old Dairy Farm Post, Vishakhapatnam 530040 AP', 15, footerY + 15)
    
    pdf.text('+91 96032 79555', pageWidth - 15, footerY + 8, { align: 'right' })
    pdf.text('Email: bhairavnex@gmail.com', pageWidth - 15, footerY + 15, { align: 'right' })
  }

  const renderQuotationTable = (pdf: jsPDF, pageWidth: number, startY: number, items: QuotationItem[], quotation: Quotation) => {
    const tableStartY = startY
    const pageMargin = 15
    const availableWidth = pageWidth - (pageMargin * 2)
    
    // Dynamic column widths based on content
    const colWidths = [
      Math.floor(availableWidth * 0.45), // Description - 45%
      Math.floor(availableWidth * 0.10), // Qty - 10%
      Math.floor(availableWidth * 0.15), // Rate - 15%
      Math.floor(availableWidth * 0.20), // GST Amount (merged) - 20%
      Math.floor(availableWidth * 0.10)  // Total - 10%
    ]
    
    // Calculate column positions
    const colPositions = [pageMargin]
    for (let i = 1; i < colWidths.length; i++) {
      colPositions[i] = colPositions[i - 1] + colWidths[i - 1]
    }
    
    // Table header background
    pdf.setFillColor(240, 240, 240)
    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.5)
    pdf.rect(pageMargin, tableStartY, availableWidth, 15, 'FD')
    
    // Table header text
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(0, 0, 0)
    
    const headers = ['Description', 'Qty', 'Rate (₹)', 'GST Amount', 'Total (₹)']
    headers.forEach((header, index) => {
      const textWidth = pdf.getTextWidth(header)
      const cellCenter = colPositions[index] + (colWidths[index] / 2)
      pdf.text(header, cellCenter - (textWidth / 2), tableStartY + 10)
    })
    
    // Draw header borders
    for (let i = 0; i < colPositions.length; i++) {
      pdf.line(colPositions[i], tableStartY, colPositions[i], tableStartY + 15)
    }
    pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], tableStartY, 
             colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], tableStartY + 15)
    
    let yPosition = tableStartY + 15
    
    // Table rows
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    
    let subtotalBeforeGST = 0
    let totalGSTAmount = 0
    
    items.forEach((item, index) => {
      const rowHeight = Math.max(20, Math.ceil(pdf.splitTextToSize(item.description, colWidths[0] - 4).length * 5) + 10)
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
      
      // Cell content with proper alignment
      const descLines = pdf.splitTextToSize(item.description, colWidths[0] - 4)
      pdf.text(descLines, colPositions[0] + 2, yPosition + 8)
      
      // Center align numeric values
      const qtyText = item.quantity.toString()
      const qtyWidth = pdf.getTextWidth(qtyText)
      pdf.text(qtyText, colPositions[1] + (colWidths[1] / 2) - (qtyWidth / 2), yPosition + 12)
      
      const priceText = item.unit_price.toFixed(2)
      const priceWidth = pdf.getTextWidth(priceText)
      pdf.text(priceText, colPositions[2] + (colWidths[2] / 2) - (priceWidth / 2), yPosition + 12)
      
      // GST Amount column - showing GST amount on first line, GST % on second line
      const gstText = `₹${gstAmount.toFixed(2)}`
      const gstWidth = pdf.getTextWidth(gstText)
      pdf.text(gstText, colPositions[3] + (colWidths[3] / 2) - (gstWidth / 2), yPosition + 8)
      
      const gstPercentText = `(${quotation.tax_rate}%)`
      const gstPercentWidth = pdf.getTextWidth(gstPercentText)
      pdf.text(gstPercentText, colPositions[3] + (colWidths[3] / 2) - (gstPercentWidth / 2), yPosition + 16)
      
      const totalText = itemTotal.toFixed(2)
      const totalWidth = pdf.getTextWidth(totalText)
      pdf.text(totalText, colPositions[4] + (colWidths[4] / 2) - (totalWidth / 2), yPosition + 12)
      
      yPosition += rowHeight
    })
    
    // Total GST row
    const totalRowHeight = 15
    pdf.setFillColor(240, 240, 240)
    pdf.rect(pageMargin, yPosition, availableWidth, totalRowHeight, 'F')
    
    // Draw borders for total row
    for (let i = 0; i < colPositions.length; i++) {
      pdf.line(colPositions[i], yPosition, colPositions[i], yPosition + totalRowHeight)
    }
    pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition, 
             colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition + totalRowHeight)
    pdf.line(pageMargin, yPosition + totalRowHeight, pageMargin + availableWidth, yPosition + totalRowHeight)
    
    pdf.setFont('helvetica', 'bold')
    // Center align "Total GST:" text in GST Amount column
    const totalGstText = 'Total GST:'
    const totalGstWidth = pdf.getTextWidth(totalGstText)
    pdf.text(totalGstText, colPositions[3] + (colWidths[3] / 2) - (totalGstWidth / 2), yPosition + 10)
    
    // Center align total amount in Total column
    const totalAmountText = `₹${quotation.total_amount.toFixed(2)}`
    const totalAmountWidth = pdf.getTextWidth(totalAmountText)
    pdf.text(totalAmountText, colPositions[4] + (colWidths[4] / 2) - (totalAmountWidth / 2), yPosition + 10)
    
    yPosition += totalRowHeight + 10
    
    // Grand total in words section with dynamic margins
    const summaryBoxWidth = Math.floor(availableWidth * 0.65)
    const totalBoxWidth = availableWidth - summaryBoxWidth
    
    pdf.setFillColor(255, 255, 255)
    pdf.rect(pageMargin, yPosition, summaryBoxWidth, 25, 'FD')
    pdf.rect(pageMargin + summaryBoxWidth, yPosition, totalBoxWidth, 25, 'FD')
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text('Grand Total (in words):', pageMargin + 2, yPosition + 8)
    // You would need to implement a number-to-words converter for dynamic amounts
    const wordsText = 'As per calculation above'
    pdf.text(wordsText, pageMargin + 2, yPosition + 15)
    
    pdf.text('Rounded', pageMargin + summaryBoxWidth + 2, yPosition + 8)
    pdf.text('Total', pageMargin + summaryBoxWidth + 2, yPosition + 15)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    const finalTotalText = `₹${quotation.total_amount.toFixed(2)}`
    const finalTotalWidth = pdf.getTextWidth(finalTotalText)
    pdf.text(finalTotalText, pageMargin + summaryBoxWidth + totalBoxWidth - 2 - finalTotalWidth, yPosition + 12)
    
    return yPosition + 25
  }

  return {
    exportToPDF,
    loading,
  }
}
