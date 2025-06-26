
import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { useToast } from '@/hooks/use-toast'
import { Quotation, QuotationItem, Customer } from '@/types/database'

export function usePDFExport() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const exportToPDF = async (
    quotation: Quotation,
    customer: Customer,
    items: QuotationItem[]
  ) => {
    setLoading(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // Colors
      const orangeColor = '#D2691E'
      const blackColor = '#000000'
      const grayColor = '#808080'
      const lightGray = '#f5f5f5'
      
      // Header background with orange gradient
      pdf.setFillColor(210, 105, 30) // Orange color
      pdf.rect(0, 0, pageWidth, 35, 'F')
      
      // Company name and tagline
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text('BHAIRAVNEX', 15, 22)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('"Engineering Tomorrow\'s Technologies, Today"', 15, 30)
      
      // GST number in top right
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('GST: 37ABDFB9225A1Z5', pageWidth - 15, 15, { align: 'right' })
      
      // QUOTATION label
      pdf.setFillColor(0, 0, 0)
      pdf.rect(85, 35, 40, 12, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('QUOTATION', 105, 43, { align: 'center' })
      
      // Company logo placeholder (triangle shape in top right)
      pdf.setFillColor(255, 165, 0)
      pdf.triangle(pageWidth - 40, 5, pageWidth - 15, 5, pageWidth - 27.5, 25)
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(8)
      pdf.text('LOGO', pageWidth - 27.5, 17, { align: 'center' })
      
      // Quotation details
      let yPosition = 60
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
      
      // Table header
      const tableStartY = yPosition
      const colWidths = [85, 25, 35, 25, 35, 35]
      const colPositions = [15, 100, 125, 160, 185, 220]
      
      // Table header background
      pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(0, 0, 0)
      pdf.rect(15, tableStartY, pageWidth - 30, 15, 'FD')
      
      // Table header text
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(blackColor)
      
      pdf.text('Description', colPositions[0] + 2, tableStartY + 10)
      pdf.text('Qty', colPositions[1] + 2, tableStartY + 10)
      pdf.text('Rate (Rs)', colPositions[2] + 2, tableStartY + 10)
      pdf.text('GST %', colPositions[3] + 2, tableStartY + 10)
      pdf.text('GST Amount (Rs)', colPositions[4] + 2, tableStartY + 6)
      pdf.text('Total (Rs)', colPositions[5] + 2, tableStartY + 10)
      
      // Draw header borders
      for (let i = 0; i < colPositions.length; i++) {
        pdf.line(colPositions[i], tableStartY, colPositions[i], tableStartY + 15)
      }
      pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], tableStartY, 
               colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], tableStartY + 15)
      
      yPosition = tableStartY + 15
      
      // Table rows
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      
      let subtotalBeforeGST = 0
      let totalGSTAmount = 0
      
      items.forEach((item, index) => {
        const rowHeight = 20
        const itemSubtotal = item.quantity * item.unit_price
        const gstAmount = (itemSubtotal * quotation.tax_rate) / 100
        const itemTotal = itemSubtotal + gstAmount
        
        subtotalBeforeGST += itemSubtotal
        totalGSTAmount += gstAmount
        
        // Row background (alternating)
        if (index % 2 === 1) {
          pdf.setFillColor(248, 248, 248)
          pdf.rect(15, yPosition, pageWidth - 30, rowHeight, 'F')
        }
        
        // Draw borders
        for (let i = 0; i < colPositions.length; i++) {
          pdf.line(colPositions[i], yPosition, colPositions[i], yPosition + rowHeight)
        }
        pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition, 
                 colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition + rowHeight)
        pdf.line(15, yPosition + rowHeight, pageWidth - 15, yPosition + rowHeight)
        
        // Cell content
        const descLines = pdf.splitTextToSize(item.description, colWidths[0] - 4)
        pdf.text(descLines, colPositions[0] + 2, yPosition + 8)
        pdf.text(item.quantity.toString(), colPositions[1] + 2, yPosition + 12)
        pdf.text(item.unit_price.toFixed(2), colPositions[2] + 2, yPosition + 12)
        pdf.text(quotation.tax_rate.toString(), colPositions[3] + 2, yPosition + 12)
        pdf.text(gstAmount.toFixed(2), colPositions[4] + 2, yPosition + 12)
        pdf.text(itemTotal.toFixed(2), colPositions[5] + 2, yPosition + 12)
        
        yPosition += rowHeight
      })
      
      // Total GST row
      const totalRowHeight = 15
      pdf.setFillColor(240, 240, 240)
      pdf.rect(15, yPosition, pageWidth - 30, totalRowHeight, 'F')
      
      // Draw borders for total row
      for (let i = 0; i < colPositions.length; i++) {
        pdf.line(colPositions[i], yPosition, colPositions[i], yPosition + totalRowHeight)
      }
      pdf.line(colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition, 
               colPositions[colPositions.length - 1] + colWidths[colWidths.length - 1], yPosition + totalRowHeight)
      pdf.line(15, yPosition + totalRowHeight, pageWidth - 15, yPosition + totalRowHeight)
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Total GST:', colPositions[4] + 2, yPosition + 10)
      pdf.text(totalGSTAmount.toFixed(2), colPositions[5] + 2, yPosition + 10)
      pdf.text(quotation.total_amount.toFixed(2), pageWidth - 17, yPosition + 10, { align: 'right' })
      
      yPosition += totalRowHeight + 10
      
      // Grand total in words
      pdf.setFillColor(255, 255, 255)
      pdf.rect(15, yPosition, 120, 25, 'FD')
      pdf.rect(135, yPosition, 60, 25, 'FD')
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text('Grand Total (in words): Three Crore Thirty Nine Lakh', 17, yPosition + 8)
      pdf.text('Sixteen Thousand Seven Hundred and Forty only', 17, yPosition + 15)
      
      pdf.text('Rounded', 137, yPosition + 8)
      pdf.text('Total', 137, yPosition + 15)
      pdf.setFont('helvetica', 'bold')
      pdf.text(quotation.total_amount.toFixed(2), 193, yPosition + 12, { align: 'right' })
      
      yPosition += 35
      
      // Terms & Conditions and Signature section
      pdf.setFillColor(255, 255, 255)
      pdf.rect(15, yPosition, 80, 60, 'FD')
      pdf.rect(95, yPosition, 100, 60, 'FD')
      
      // Terms & Conditions
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text('Terms & Conditions', 17, yPosition + 12)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text('Completion: 90 Days', 17, yPosition + 22)
      pdf.text('GST: As indicated', 17, yPosition + 30)
      pdf.text('Transport: NA', 17, yPosition + 38)
      
      // Signature section
      pdf.text('With regards', 97, yPosition + 12)
      
      // Company name in signature
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 255)
      pdf.text('For BHAIRAVNEX', 97, yPosition + 25)
      
      // Signature placeholder
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(blackColor)
      pdf.text('Managing Partner', 97, yPosition + 45)
      pdf.text('Authorised Signature', 97, yPosition + 52)
      
      // Footer
      yPosition = pageHeight - 25
      pdf.setFillColor(210, 105, 30)
      pdf.rect(0, yPosition, pageWidth, 25, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(8)
      pdf.text('Door No: 5-5, Vivekananda Nagar,', 15, yPosition + 8)
      pdf.text('Old Dairy Farm Post, Vishakhapatnam 530040 AP', 15, yPosition + 15)
      
      pdf.text('+91 96032 79555', pageWidth - 15, yPosition + 8, { align: 'right' })
      pdf.text('Email: bhairavnex@gmail.com', pageWidth - 15, yPosition + 15, { align: 'right' })
      
      // Save the PDF
      pdf.save(`quotation-${quotation.quotation_number}.pdf`)
      
      toast({
        title: 'PDF Generated',
        description: 'Quotation PDF has been downloaded successfully with your company format.',
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

  return {
    exportToPDF,
    loading,
  }
}
