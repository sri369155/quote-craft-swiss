
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
      const primaryColor = '#1f2937'
      const accentColor = '#3b82f6'
      const lightGray = '#f3f4f6'
      
      // Header
      pdf.setFillColor(primaryColor)
      pdf.rect(0, 0, pageWidth, 40, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('QUOTATION', 20, 25)
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(quotation.quotation_number, pageWidth - 20, 25, { align: 'right' })
      
      // Company info (placeholder - you can make this dynamic)
      pdf.setTextColor(primaryColor)
      pdf.setFontSize(10)
      let yPosition = 55
      pdf.text('Your Company Name', 20, yPosition)
      pdf.text('Your Address Line 1', 20, yPosition + 5)
      pdf.text('Your Address Line 2', 20, yPosition + 10)
      pdf.text('Email: info@company.com', 20, yPosition + 15)
      pdf.text('Phone: +91 98765 43210', 20, yPosition + 20)
      
      // Customer info
      pdf.setFont('helvetica', 'bold')
      pdf.text('Bill To:', pageWidth - 100, yPosition)
      pdf.setFont('helvetica', 'normal')
      pdf.text(customer.name, pageWidth - 100, yPosition + 5)
      if (customer.email) pdf.text(customer.email, pageWidth - 100, yPosition + 10)
      if (customer.phone) pdf.text(customer.phone, pageWidth - 100, yPosition + 15)
      if (customer.address) {
        const addressLines = customer.address.split('\n')
        addressLines.forEach((line, index) => {
          pdf.text(line, pageWidth - 100, yPosition + 20 + (index * 5))
        })
      }
      
      // Quotation details
      yPosition = 105
      pdf.setFillColor(lightGray)
      pdf.rect(20, yPosition, pageWidth - 40, 25, 'F')
      
      pdf.setTextColor(primaryColor)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.text('Quotation Details', 25, yPosition + 8)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.text(`Title: ${quotation.title}`, 25, yPosition + 16)
      pdf.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('en-IN')}`, 25, yPosition + 21)
      
      if (quotation.valid_until) {
        pdf.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString('en-IN')}`, pageWidth - 100, yPosition + 16)
      }
      pdf.text(`Status: ${quotation.status.toUpperCase()}`, pageWidth - 100, yPosition + 21)
      
      // Description
      if (quotation.description) {
        yPosition += 35
        pdf.setFont('helvetica', 'bold')
        pdf.text('Description:', 25, yPosition)
        pdf.setFont('helvetica', 'normal')
        const descriptionLines = pdf.splitTextToSize(quotation.description, pageWidth - 50)
        pdf.text(descriptionLines, 25, yPosition + 5)
        yPosition += descriptionLines.length * 5 + 10
      }
      
      // Items table header
      yPosition += 15
      pdf.setFillColor(accentColor)
      pdf.rect(20, yPosition, pageWidth - 40, 12, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text('Description', 25, yPosition + 8)
      pdf.text('Qty', pageWidth - 120, yPosition + 8, { align: 'center' })
      pdf.text('Unit Price', pageWidth - 80, yPosition + 8, { align: 'center' })
      pdf.text('Total', pageWidth - 35, yPosition + 8, { align: 'right' })
      
      // Items
      yPosition += 12
      pdf.setTextColor(primaryColor)
      pdf.setFont('helvetica', 'normal')
      
      items.forEach((item, index) => {
        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = 30
        }
        
        const rowHeight = 15
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251)
          pdf.rect(20, yPosition, pageWidth - 40, rowHeight, 'F')
        }
        
        // Description (with text wrapping)
        const descLines = pdf.splitTextToSize(item.description, pageWidth - 140)
        pdf.text(descLines, 25, yPosition + 8)
        
        // Quantity
        pdf.text(item.quantity.toString(), pageWidth - 120, yPosition + 8, { align: 'center' })
        
        // Unit Price
        pdf.text(`₹${item.unit_price.toLocaleString('en-IN')}`, pageWidth - 80, yPosition + 8, { align: 'center' })
        
        // Line Total
        pdf.text(`₹${item.line_total.toLocaleString('en-IN')}`, pageWidth - 35, yPosition + 8, { align: 'right' })
        
        yPosition += Math.max(rowHeight, descLines.length * 5 + 5)
      })
      
      // Totals section
      yPosition += 10
      const totalsX = pageWidth - 100
      
      pdf.setFont('helvetica', 'normal')
      pdf.text('Subtotal:', totalsX, yPosition)
      pdf.text(`₹${quotation.subtotal.toLocaleString('en-IN')}`, pageWidth - 25, yPosition, { align: 'right' })
      
      yPosition += 8
      pdf.text(`Tax (${quotation.tax_rate}%):`, totalsX, yPosition)
      pdf.text(`₹${quotation.tax_amount.toLocaleString('en-IN')}`, pageWidth - 25, yPosition, { align: 'right' })
      
      yPosition += 8
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.text('Total:', totalsX, yPosition)
      pdf.text(`₹${quotation.total_amount.toLocaleString('en-IN')}`, pageWidth - 25, yPosition, { align: 'right' })
      
      // Footer
      yPosition = pageHeight - 30
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' })
      pdf.text('This is a computer-generated quotation.', pageWidth / 2, yPosition + 5, { align: 'center' })
      
      // Save the PDF
      pdf.save(`quotation-${quotation.quotation_number}.pdf`)
      
      toast({
        title: 'PDF Generated',
        description: 'Quotation PDF has been downloaded successfully.',
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
