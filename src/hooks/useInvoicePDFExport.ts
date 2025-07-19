import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { useToast } from '@/hooks/use-toast'
import { Invoice, InvoiceItem, Customer, Profile } from '@/types/database'
import { numberToWords } from '@/lib/utils'

export function useInvoicePDFExport() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const exportToPDF = async (
    invoice: Invoice,
    customer: Customer,
    items: InvoiceItem[],
    userProfile?: Profile,
    options?: { showSignature?: boolean; lineSpacing?: number }
  ) => {
    setLoading(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      
      // Header
      pdf.setFillColor(251, 146, 60)
      pdf.rect(0, 0, pageWidth, 25, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(16)
      pdf.text(userProfile?.company_name || 'BHAIRAVNEX', pageWidth / 2, 15, { align: 'center' })
      
      let yPos = 35
      
      // TAX INVOICE title
      pdf.setFillColor(0, 0, 0)
      pdf.rect(pageWidth/2 - 30, yPos, 60, 10, 'F')
      pdf.text('TAX INVOICE', pageWidth / 2, yPos + 7, { align: 'center' })
      
      yPos += 20
      
      // Invoice details
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
      pdf.text(`Invoice No: ${invoice.invoice_number}`, 15, yPos)
      pdf.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString('en-GB')}`, pageWidth - 15, yPos, { align: 'right' })
      
      yPos += 15
      
      // Customer details
      pdf.text(`Bill To: ${customer.name}`, 15, yPos)
      if (customer.address) {
        yPos += 5
        pdf.text(customer.address, 15, yPos)
      }
      
      yPos += 20
      
      // Items table
      const headers = ['Item', 'HSN', 'Qty', 'Rate', 'GST', 'Total']
      const colWidths = [60, 25, 15, 25, 25, 30]
      let xPos = 15
      
      // Table header
      pdf.setFillColor(200, 200, 200)
      pdf.rect(15, yPos, 180, 10, 'F')
      headers.forEach((header, i) => {
        pdf.text(header, xPos + 2, yPos + 7)
        xPos += colWidths[i]
      })
      
      yPos += 10
      
      // Table rows
      items.forEach((item, index) => {
        const itemGst = (item.line_total * invoice.tax_rate) / 100
        const itemTotal = item.line_total + itemGst
        
        xPos = 15
        pdf.text(item.description, xPos + 2, yPos + 7)
        xPos += colWidths[0]
        pdf.text(item.hsn_code || '', xPos + 2, yPos + 7)
        xPos += colWidths[1]
        pdf.text(item.quantity.toString(), xPos + 2, yPos + 7)
        xPos += colWidths[2]
        pdf.text(item.unit_price.toFixed(2), xPos + 2, yPos + 7)
        xPos += colWidths[3]
        pdf.text(itemGst.toFixed(2), xPos + 2, yPos + 7)
        xPos += colWidths[4]
        pdf.text(itemTotal.toFixed(2), xPos + 2, yPos + 7)
        
        yPos += 10
      })
      
      // Total
      yPos += 10
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Total: ₹${invoice.total_amount.toLocaleString('en-IN')}`, pageWidth - 15, yPos, { align: 'right' })
      pdf.text(`In Words: ${numberToWords(invoice.total_amount)} only`, 15, yPos + 10)
      
      // Bank details and signature
      yPos += 30
      pdf.setFont('helvetica', 'normal')
      pdf.text('Bank Details:', 15, yPos)
      if (userProfile?.bank_name) pdf.text(`Bank: ${userProfile.bank_name}`, 15, yPos + 5)
      if (userProfile?.bank_account_number) pdf.text(`A/c: ${userProfile.bank_account_number}`, 15, yPos + 10)
      if (userProfile?.bank_ifsc_code) pdf.text(`IFSC: ${userProfile.bank_ifsc_code}`, 15, yPos + 15)
      
      pdf.text('Authorized Signatory', pageWidth - 15, yPos + 15, { align: 'right' })
      
      pdf.save(`invoice-${invoice.invoice_number}.pdf`)
      
      toast({
        title: 'PDF Generated',
        description: 'Invoice PDF downloaded successfully.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return { exportToPDF, loading }
}