
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
      let yPos = 5
      
      // Header Section - optimized compact design with full width
      if (userProfile?.header_image_url) {
        // Custom header image - full width
        try {
          // Note: In real implementation, you'd need to load and convert image to base64
          pdf.setDrawColor(0, 0, 0)
          pdf.setLineWidth(1)
          pdf.line(0, 0, pageWidth, 0)
          pdf.line(0, 20, pageWidth, 20)
          pdf.text('HEADER IMAGE PLACEHOLDER', pageWidth/2, 10, { align: 'center' })
          yPos = 25
        } catch (error) {
          console.error('Error adding header image:', error)
        }
      } else {
        // Default header - full width blue background
        pdf.setFillColor(25, 65, 139)
        pdf.rect(0, 0, pageWidth, 25, 'F')
        
        // Company details - more compact
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text(userProfile?.company_name || 'GUJARAT FREIGHT TOOLS', 8, 10)
        
        pdf.setFontSize(6)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Manufacturing & Supply of Precision Press Tool & Room Component', 8, 14)
        pdf.text('64, Akshoy Industrial Estate, Near New Cloth Market, Ahmedabad - 38562', 8, 17)
        
        // Contact details (right side) - more compact
        pdf.setFontSize(6)
        pdf.text(`Tel: ${userProfile?.company_phone || '079-25820309'}`, 120, 10)
        pdf.text(`Web: www.gftools.com`, 120, 13)
        pdf.text(`Email: info@gftools.com`, 120, 16)
        
        // Logo - smaller
        pdf.setFillColor(13, 148, 136)
        pdf.rect(170, 3, 18, 18, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(5)
        pdf.text('LOGO', 179, 12, { align: 'center' })
        
        yPos = 30
      }
      
      // GSTIN and TAX INVOICE header - more compact
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`GSTIN : ${userProfile?.gst_number || '24HDE7487RE5RT4'}`, 8, yPos)
      
      // TAX INVOICE centered with navy blue color and underline - no background fill
      pdf.setDrawColor(25, 65, 139) // Navy blue
      pdf.setLineWidth(2)
      pdf.rect(pageWidth/2 - 20, yPos - 4, 40, 8, 'D') // Draw border only
      pdf.setTextColor(25, 65, 139) // Navy blue text
      pdf.setFontSize(9)
      pdf.text('TAX INVOICE', pageWidth/2, yPos, { align: 'center' })
      
      // Add underline
      const taxInvoiceWidth = pdf.getTextWidth('TAX INVOICE')
      pdf.line(pageWidth/2 - taxInvoiceWidth/2, yPos + 1, pageWidth/2 + taxInvoiceWidth/2, yPos + 1)
      
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(7)
      pdf.text('ORIGINAL FOR RECIPIENT', pageWidth - 8, yPos, { align: 'right' })
      
      yPos += 10
      
      // Customer Detail Section - more compact with borders
      pdf.setFillColor(200, 200, 200)
      pdf.rect(8, yPos, 88, 6, 'F')
      pdf.setDrawColor(0, 0, 0)
      pdf.rect(8, yPos, 88, 6)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.text('Customer Detail', 10, yPos + 4)
      
      yPos += 8
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6)
      
      // Customer details table - more compact
      const customerDetails = [
        ['M/S', customer.name],
        ['Address', customer.address || ''],
        ['PHONE', customer.phone || ''],
        ['GSTIN', invoice.consignee_gstin || '07AQLCC1206D1ZG'],
        ['Place of Supply', 'Delhi ( 07 )']
      ]
      
      customerDetails.forEach(([label, value], index) => {
        pdf.rect(8, yPos, 88, 4)
        pdf.setFont('helvetica', 'bold')
        pdf.text(label, 10, yPos + 3)
        pdf.setFont('helvetica', 'normal')
        pdf.text(value, 28, yPos + 3)
        yPos += 4
      })
      
      // Invoice details (right side) - more compact with updated fields
      let rightYPos = yPos - (customerDetails.length * 4) - 8
      
      const invoiceDetails = [
        ['Invoice No.', invoice.invoice_number, 'Invoice Date', format(new Date(invoice.issue_date), 'dd-MMM-yyyy')],
        ['Delivery Challan No.', invoice.delivery_challan_number || '', 'Delivery Date', invoice.delivery_challan_date ? format(new Date(invoice.delivery_challan_date), 'dd-MMM-yyyy') : ''],
        ['Order No.', invoice.order_number || '', 'Order Date', invoice.order_date ? format(new Date(invoice.order_date), 'dd-MMM-yyyy') : ''],
        ['E-Way/LR No.', invoice.eway_lr_number || '', 'Due Date', format(new Date(invoice.due_date), 'dd-MMM-yyyy')],
        ['Reverse Charge', 'No', '', '']
      ]
      
      pdf.rect(105, rightYPos, 95, invoiceDetails.length * 4)
      
      invoiceDetails.forEach(([label1, value1, label2, value2]) => {
        pdf.rect(105, rightYPos, 95, 4)
        pdf.line(140, rightYPos, 140, rightYPos + 4)
        pdf.line(170, rightYPos, 170, rightYPos + 4)
        
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(6)
        pdf.text(label1, 107, rightYPos + 3)
        pdf.setFont('helvetica', 'normal')
        pdf.text(value1, 128, rightYPos + 3)
        pdf.setFont('helvetica', 'bold')
        pdf.text(label2, 142, rightYPos + 3)
        pdf.setFont('helvetica', 'normal')
        pdf.text(value2, 172, rightYPos + 3)
        rightYPos += 4
      })
      
      yPos += 5
      
      // Items Table Header - more compact
      const tableHeaders = ['Sr.No.', 'Name of Product / Service', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Value', 'IGST %', 'Amount', 'Total']
      const colWidths = [12, 55, 18, 12, 18, 22, 12, 18, 18]
      let xPos = 8
      
      // Main header
      pdf.setFillColor(200, 200, 200)
      pdf.rect(8, yPos, 185, 6, 'F')
      pdf.rect(8, yPos, 185, 6)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6)
      let headerXPos = xPos
      tableHeaders.forEach((header, i) => {
        const align = i === 0 || i === 2 || i === 3 ? 'center' : i >= 4 ? 'center' : 'left'
        const textX = align === 'center' ? headerXPos + colWidths[i]/2 : headerXPos + 1
        pdf.text(header, textX, yPos + 4, { align })
        if (i < colWidths.length - 1) {
          pdf.line(headerXPos + colWidths[i], yPos, headerXPos + colWidths[i], yPos + 6)
        }
        headerXPos += colWidths[i]
      })
      
      // Sub-header for IGST
      yPos += 6
      pdf.rect(8, yPos, 185, 4)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(5)
      pdf.text('%', 8 + colWidths.slice(0, 6).reduce((a, b) => a + b, 0) + colWidths[6]/2, yPos + 3, { align: 'center' })
      pdf.text('Amount', 8 + colWidths.slice(0, 7).reduce((a, b) => a + b, 0) + colWidths[7]/2, yPos + 3, { align: 'center' })
      
      // Draw vertical lines for sub-header
      headerXPos = 8
      colWidths.forEach((width, index) => {
        if (index < colWidths.length - 1) {
          pdf.line(headerXPos + width, yPos, headerXPos + width, yPos + 4)
        }
        headerXPos += width
      })
      
      yPos += 4
      
      // Items rows - compact design without empty rows
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6)
      
      items.forEach((item, index) => {
        const itemSubtotal = item.quantity * item.unit_price
        const itemGst = (itemSubtotal * invoice.tax_rate) / 100
        const itemTotal = itemSubtotal + itemGst
        
        xPos = 8
        
        // Draw row border
        pdf.rect(8, yPos, 185, 5)
        
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
          const textX = align === 'center' ? xPos + colWidths[i]/2 : align === 'right' ? xPos + colWidths[i] - 1 : xPos + 1
          pdf.text(data, textX, yPos + 3.5, { align })
          
          if (i < colWidths.length - 1) {
            pdf.line(xPos + colWidths[i], yPos, xPos + colWidths[i], yPos + 5)
          }
          xPos += colWidths[i]
        })
        
        yPos += 5
      })
      
      // Total row - more compact
      pdf.setFillColor(200, 200, 200)
      pdf.rect(8, yPos, 185, 5, 'F')
      pdf.rect(8, yPos, 185, 5)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6)
      pdf.text('Total', 10, yPos + 3.5)
      
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
      pdf.text(totalQty.toFixed(2), 8 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2, yPos + 3.5, { align: 'center' })
      pdf.text(invoice.subtotal.toFixed(2), 8 + colWidths.slice(0, 5).reduce((a, b) => a + b, 0) - 1, yPos + 3.5, { align: 'right' })
      pdf.text(invoice.tax_amount.toFixed(2), 8 + colWidths.slice(0, 7).reduce((a, b) => a + b, 0) - 1, yPos + 3.5, { align: 'right' })
      pdf.text(invoice.total_amount.toFixed(2), 8 + colWidths.slice(0, 8).reduce((a, b) => a + b, 0) - 1, yPos + 3.5, { align: 'right' })
      
      // Vertical lines for total row
      xPos = 8
      colWidths.forEach((width, index) => {
        if (index < colWidths.length - 1) {
          pdf.line(xPos + width, yPos, xPos + width, yPos + 5)
        }
        xPos += width
      })
      
      yPos += 10
      
      // Total in words section with terms - more compact
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6)
      pdf.text('Total in words', 10, yPos)
      pdf.setFont('helvetica', 'normal')
      pdf.text(numberToWords(invoice.total_amount).toUpperCase() + ' ONLY', 10, yPos + 5)
      
      // Terms and Conditions in same section
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(5)
      pdf.text('Terms and Conditions:', 10, yPos + 12)
      
      pdf.setFont('helvetica', 'normal')
      const terms = options?.termsConditions || invoice.description || '1. Subject to Ahmedabad Jurisdiction.\n2. Our responsibility ceases as soon as the goods leave our premises.\n3. Goods once sold will not be taken back.\n4. Delivery ex-premises.'
      const termLines = terms.split('\n')
      
      termLines.forEach((line, index) => {
        pdf.text(line, 10, yPos + 16 + (index * 3))
      })
      
      // Amount breakdown (right side) - more compact
      const breakdown = [
        ['Taxable Amount', invoice.subtotal.toFixed(2)],
        ['Add : IGST', invoice.tax_amount.toFixed(2)],
        ['Total Tax', invoice.tax_amount.toFixed(2)],
        ['Total Amount After Tax', `₹ ${invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
      ]
      
      let breakdownY = yPos
      breakdown.forEach(([label, value]) => {
        pdf.setFont('helvetica', label.includes('Total Amount') ? 'bold' : 'normal')
        pdf.setFontSize(6)
        pdf.text(label, 110, breakdownY)
        pdf.text(value, 190, breakdownY, { align: 'right' })
        breakdownY += 4
      })
      
      yPos += 25 + (termLines.length * 3)
      
      // Check if we need a page break (0.5 inch = 36 points from bottom)
      const needPageBreak = yPos > (pageHeight - 50)
      if (needPageBreak) {
        pdf.addPage()
        yPos = 10
      }
      
      // Bank Details and Signature - more compact side by side
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6)
      pdf.text('Bank Details', 10, yPos)
      pdf.text(`For ${userProfile?.company_name || 'Gujarat Freight Tools'}`, 110, yPos)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(5)
      
      const bankDetails = options?.bankDetails || `Bank Name: ${userProfile?.bank_name || 'State Bank of India'}\nBranch Name: ${userProfile?.bank_branch || 'RAF CAMP'}\nBank Account Number: ${userProfile?.bank_account_number || '20000000004512'}\nBank Branch IFSC: ${userProfile?.bank_ifsc_code || 'SBIN0000488'}`
      
      const bankLines = bankDetails.split('\n')
      bankLines.forEach((line, index) => {
        pdf.text(line, 10, yPos + 5 + (index * 3))
      })
      
      // Signature section - compact (removed the "no signature required" text)
      if (userProfile?.signature_image_url) {
        try {
          // Note: In real implementation, convert image to base64 and add
          pdf.text('SIGNATURE IMAGE PLACEHOLDER', 110, yPos + 8)
        } catch (error) {
          console.error('Error adding signature image:', error)
        }
      }
      
      pdf.setFont('helvetica', 'bold')
      pdf.text('Authorised Signatory', 110, yPos + 18)
      
      yPos += 25
      
      // Footer with page break control - full width
      if (userProfile?.footer_image_url) {
        // Custom footer image - full width, no margins
        try {
          pdf.setDrawColor(0, 0, 0)
          pdf.setLineWidth(1)
          pdf.line(0, yPos, pageWidth, yPos)
          pdf.text('FOOTER IMAGE PLACEHOLDER', pageWidth/2, yPos + 8, { align: 'center' })
          pdf.line(0, yPos + 15, pageWidth, yPos + 15)
        } catch (error) {
          console.error('Error adding footer image:', error)
        }
      } else {
        pdf.setFontSize(4)
        pdf.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Thank you for your business`, pageWidth/2, yPos + 5, { align: 'center' })
      }
      
      // Certification text at bottom
      pdf.setFontSize(4)
      pdf.text('Certified that the particulars given above are true and correct.', pageWidth/2, yPos + 12, { align: 'center' })
      
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
