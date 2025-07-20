import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { useToast } from '@/hooks/use-toast'
import { Invoice, InvoiceItem, Customer, Profile } from '@/types/database'
import { numberToWords } from '@/lib/utils'
import { format } from 'date-fns'

interface PDFExportOptions {
  showSignature?: boolean
  lineSpacing?: number
  bankDetails?: string
  termsConditions?: string
}

export function useInvoicePDFExport() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const exportToPDF = async (
    invoice: Invoice,
    customer: Customer,
    items: InvoiceItem[],
    userProfile?: Profile,
    options?: PDFExportOptions
  ) => {
    setLoading(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPos = 10
      
      // Header Section - matches uploaded image design
      pdf.setFillColor(25, 65, 139) // Blue header
      pdf.rect(0, 0, pageWidth, 35, 'F')
      
      // Company name and details
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(userProfile?.company_name || 'GUJARAT FREIGHT TOOLS', 10, 15)
      
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Manufacturing & Supply of Precision Press Tool & Room Component', 10, 20)
      
      // Address
      pdf.setFontSize(7)
      pdf.text('64, Akshoy Industrial Estate', 10, 25)
      pdf.text('Near New Cloth Market, Ahmedabad - 38562', 10, 29)
      
      // Contact details (right side)
      pdf.text(`Tel : ${userProfile?.company_phone || '079-25820309'}`, 130, 15)
      pdf.text(`Web : www.gftools.com`, 130, 19)
      pdf.text(`Email : info@gftools.com`, 130, 23)
      
      // Logo placeholder
      pdf.setFillColor(13, 148, 136) // Teal color
      pdf.rect(175, 5, 25, 25, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(6)
      pdf.text('LOGOTEXT', 182, 20, { align: 'center' })
      
      yPos = 45
      
      // GSTIN and TAX INVOICE header
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`GSTIN : ${userProfile?.gst_number || '24HDE7487RE5RT4'}`, 10, yPos)
      
      // TAX INVOICE centered
      pdf.setFillColor(0, 0, 0)
      pdf.rect(pageWidth/2 - 25, yPos - 5, 50, 10, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.text('TAX INVOICE', pageWidth/2, yPos, { align: 'center' })
      
      pdf.setTextColor(0, 0, 0)
      pdf.text('ORIGINAL FOR RECIPIENT', pageWidth - 10, yPos, { align: 'right' })
      
      yPos += 15
      
      // Customer Detail Section
      pdf.setFont('helvetica', 'bold')
      pdf.rect(10, yPos, 90, 8, 'F')
      pdf.setFillColor(200, 200, 200)
      pdf.rect(10, yPos, 90, 8, 'F')
      pdf.text('Customer Detail', 15, yPos + 5)
      
      yPos += 10
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      
      // Customer details table
      const customerDetails = [
        ['M/S', customer.name],
        ['Address', customer.address || ''],
        ['PHONE', customer.phone || ''],
        ['GSTIN', '07AQLCC1206D1ZG'],
        ['Place of Supply', 'Delhi ( 07 )']
      ]
      
      customerDetails.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold')
        pdf.text(label, 12, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(value, 35, yPos)
        yPos += 5
      })
      
      // Invoice details (right side)
      yPos = 60
      
      const invoiceDetails = [
        ['Invoice No.', invoice.invoice_number, 'Invoice Date', format(new Date(invoice.issue_date), 'dd-MMM-yyyy')],
        ['Challan No.', (invoice as any).challanNumber || '865', 'Challan Date', invoice.delivery_date ? format(new Date(invoice.delivery_date), 'dd-MMM-yyyy') : '03-Mar-2020'],
        ['P.O. No.', (invoice as any).poNumber || '66', 'Reverse Charge', (invoice as any).reverseCharge || 'No'],
        ['DELIVERY DATE', invoice.delivery_date ? format(new Date(invoice.delivery_date), 'dd-MMM-yyyy') : '04-Mar-2020', 'Due Date', format(new Date(invoice.due_date), 'dd-MMM-yyyy')],
        ['L.R. No.', (invoice as any).lrNumber || '958', 'E-Way No.', (invoice as any).ewayNumber || 'EWB54864584']
      ]
      
      pdf.rect(110, 55, 90, invoiceDetails.length * 5 + 5)
      
      invoiceDetails.forEach(([label1, value1, label2, value2]) => {
        pdf.setFont('helvetica', 'bold')
        pdf.text(label1, 112, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(value1, 140, yPos)
        pdf.setFont('helvetica', 'bold')
        pdf.text(label2, 155, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(value2, 180, yPos)
        yPos += 5
      })
      
      yPos += 10
      
      // Items Table Header
      const tableHeaders = ['Sr.No.', 'Name of Product / Service', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Value', 'IGST %', 'Amount', 'Total']
      const colWidths = [15, 60, 20, 15, 20, 25, 15, 20, 20]
      let xPos = 10
      
      // Table header background
      pdf.setFillColor(200, 200, 200)
      pdf.rect(10, yPos, 190, 10, 'F')
      
      // Draw table borders
      pdf.setLineWidth(0.5)
      pdf.rect(10, yPos, 190, 10) // Header border
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      tableHeaders.forEach((header, i) => {
        pdf.text(header, xPos + 2, yPos + 7)
        if (i < colWidths.length - 1) {
          pdf.line(xPos + colWidths[i], yPos, xPos + colWidths[i], yPos + 10) // Vertical lines
        }
        xPos += colWidths[i]
      })
      
      yPos += 10
      
      // Items rows
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      
      items.forEach((item, index) => {
        const itemSubtotal = item.quantity * item.unit_price
        const itemGst = (itemSubtotal * invoice.tax_rate) / 100
        const itemTotal = itemSubtotal + itemGst
        
        xPos = 10
        
        // Row background
        if (index % 2 === 1) {
          pdf.setFillColor(248, 248, 248)
          pdf.rect(10, yPos, 190, 8, 'F')
        }
        
        // Draw row border
        pdf.rect(10, yPos, 190, 8)
        
        // Cell data
        const rowData = [
          (index + 1).toString(),
          item.description,
          item.hsn_code || '8202',
          `${item.quantity.toFixed(2)} PCS`,
          item.unit_price.toFixed(2),
          itemSubtotal.toFixed(2),
          invoice.tax_rate.toFixed(1),
          itemGst.toFixed(2),
          itemTotal.toFixed(2)
        ]
        
        rowData.forEach((data, i) => {
          const align = i === 0 || i === 2 || i === 3 ? 'center' : i >= 4 ? 'right' : 'left'
          const textX = align === 'center' ? xPos + colWidths[i]/2 : align === 'right' ? xPos + colWidths[i] - 2 : xPos + 2
          pdf.text(data, textX, yPos + 5, { align })
          
          if (i < colWidths.length - 1) {
            pdf.line(xPos + colWidths[i], yPos, xPos + colWidths[i], yPos + 8)
          }
          xPos += colWidths[i]
        })
        
        yPos += 8
      })
      
      // Add empty rows to match the design
      const emptyRows = Math.max(0, 5 - items.length)
      for (let i = 0; i < emptyRows; i++) {
        pdf.rect(10, yPos, 190, 8)
        
        xPos = 10
        colWidths.forEach((width, index) => {
          if (index < colWidths.length - 1) {
            pdf.line(xPos + width, yPos, xPos + width, yPos + 8)
          }
          xPos += width
        })
        yPos += 8
      }
      
      // Total row
      pdf.setFillColor(200, 200, 200)
      pdf.rect(10, yPos, 190, 8, 'F')
      pdf.rect(10, yPos, 190, 8)
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Total', 12, yPos + 5)
      pdf.text(items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2), 90, yPos + 5, { align: 'center' })
      pdf.text(invoice.subtotal.toFixed(2), 155, yPos + 5, { align: 'right' })
      pdf.text(invoice.tax_amount.toFixed(2), 185, yPos + 5, { align: 'right' })
      pdf.text(invoice.total_amount.toFixed(2), 198, yPos + 5, { align: 'right' })
      
      // Vertical lines for total row
      xPos = 10
      colWidths.forEach((width, index) => {
        if (index < colWidths.length - 1) {
          pdf.line(xPos + width, yPos, xPos + width, yPos + 8)
        }
        xPos += width
      })
      
      yPos += 15
      
      // Total in words section
      pdf.setFont('helvetica', 'bold')
      pdf.text('Total in words', 15, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.text(numberToWords(invoice.total_amount).toUpperCase() + ' ONLY', 15, yPos + 8)
      
      // Amount breakdown (right side)
      const breakdown = [
        ['Taxable Amount', invoice.subtotal.toFixed(2)],
        ['Add : IGST', invoice.tax_amount.toFixed(2)],
        ['Total Tax', invoice.tax_amount.toFixed(2)],
        ['Total Amount After Tax', `₹ ${invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['', '(E & O.E.)'],
        ['GST Payable on Reverse Charge', 'N.A.']
      ]
      
      let breakdownY = yPos - 5
      breakdown.forEach(([label, value]) => {
        pdf.setFont('helvetica', label.includes('Total Amount') ? 'bold' : 'normal')
        pdf.text(label, 120, breakdownY)
        pdf.text(value, 195, breakdownY, { align: 'right' })
        breakdownY += 5
      })
      
      yPos += 35
      
      // Bank Details
      pdf.setFont('helvetica', 'bold')
      pdf.text('Bank Details', 15, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      
      const bankDetails = options?.bankDetails || `Bank Name: ${userProfile?.bank_name || 'State Bank of India'}\nBranch Name: ${userProfile?.bank_branch || 'RAF CAMP'}\nBank Account Number: ${userProfile?.bank_account_number || '20000000004512'}\nBank Branch IFSC: ${userProfile?.bank_ifsc_code || 'SBIN0000488'}`
      
      const bankLines = bankDetails.split('\n')
      bankLines.forEach((line, index) => {
        pdf.text(line, 15, yPos + 8 + (index * 4))
      })
      
      // Signature section
      pdf.setFont('helvetica', 'bold')
      pdf.text(`For ${userProfile?.company_name || 'Gujarat Freight Tools'}`, 130, yPos)
      
      if (userProfile?.signature_image_url) {
        // Add signature image if available
        try {
          // Note: In a real implementation, you'd need to convert the image to base64
          // pdf.addImage(userProfile.signature_image_url, 'JPEG', 130, yPos + 5, 30, 15)
        } catch (error) {
          console.error('Error adding signature image:', error)
        }
      } else {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        pdf.text('This is computer generated', 130, yPos + 10)
        pdf.text('invoice no signature required.', 130, yPos + 14)
      }
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Authorised Signatory', 130, yPos + 25)
      
      yPos += 35
      
      // Terms and Conditions
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text('Terms and Conditions', 15, yPos)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      
      const terms = options?.termsConditions || '1. Subject to Ahmedabad Jurisdiction.\n2. Our responsibility ceases as soon as the goods leave our premises.\n3. Goods once sold will not be taken back.\n4. Delivery ex-premises.'
      const termLines = terms.split('\n')
      
      termLines.forEach((line, index) => {
        pdf.text(line, 15, yPos + 8 + (index * 4))
      })
      
      pdf.text('Certified that the particulars given above are true and correct.', pageWidth/2, yPos + 8 + (termLines.length * 4) + 5, { align: 'center' })
      
      // Save PDF
      pdf.save(`invoice-${invoice.invoice_number}.pdf`)
      
      toast({
        title: 'PDF Generated',
        description: 'Invoice PDF downloaded successfully.',
      })
    } catch (error: any) {
      console.error('PDF generation error:', error)
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