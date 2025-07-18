import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { useToast } from '@/hooks/use-toast'
import { Invoice, InvoiceItem, Customer, Profile } from '@/types/database'
import { numberToWords } from '@/lib/utils'

export function useInvoicePDFExport() {
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
    invoice: Invoice,
    customer: Customer,
    items: InvoiceItem[],
    userProfile?: Profile,
    options?: {
      showSignature?: boolean
      lineSpacing?: number
    }
  ) => {
    setLoading(true)
    
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const lineSpacing = options?.lineSpacing || 1.2

      // Load images
      const headerImage = userProfile?.header_image_url ? 
        await loadImageAsBase64(userProfile.header_image_url) : null
      const footerImage = userProfile?.footer_image_url ? 
        await loadImageAsBase64(userProfile.footer_image_url) : null
      const signatureImage = userProfile?.signature_image_url ? 
        await loadImageAsBase64(userProfile.signature_image_url) : null

      let currentY = 20

      // Header
      currentY = addHeaderToPage(pdf, pageWidth, headerImage, userProfile, currentY)

      // Invoice Title
      pdf.setFontSize(18)
      pdf.setFont(undefined, 'bold')
      pdf.text('INVOICE', pageWidth / 2, currentY, { align: 'center' })
      currentY += 15

      // Invoice Details
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      
      // Left side - Invoice info
      const leftCol = 20
      const rightCol = pageWidth / 2 + 10
      
      pdf.text(`Invoice No: ${invoice.invoice_number}`, leftCol, currentY)
      pdf.text(`Issue Date: ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A'}`, leftCol, currentY + 5)
      if (invoice.due_date) {
        pdf.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, leftCol, currentY + 10)
      }

      // Right side - Order details
      if (invoice.order_number) {
        pdf.text(`Order No: ${invoice.order_number}`, rightCol, currentY)
      }
      if (invoice.order_date) {
        pdf.text(`Order Date: ${new Date(invoice.order_date).toLocaleDateString()}`, rightCol, currentY + 5)
      }
      if (invoice.delivery_number) {
        pdf.text(`Delivery No: ${invoice.delivery_number}`, rightCol, currentY + 10)
      }
      if (invoice.delivery_date) {
        pdf.text(`Delivery Date: ${new Date(invoice.delivery_date).toLocaleDateString()}`, rightCol, currentY + 15)
      }

      currentY += 25

      // Bill To section
      pdf.setFont(undefined, 'bold')
      pdf.text('Bill To:', leftCol, currentY)
      pdf.setFont(undefined, 'normal')
      currentY += 5
      
      const billToLines = [
        customer.name,
        customer.address,
        customer.email,
        customer.phone
      ].filter(Boolean)
      
      billToLines.forEach(line => {
        pdf.text(line || '', leftCol, currentY)
        currentY += 4
      })

      // Consignee section (if different)
      if (invoice.consignee_name) {
        pdf.setFont(undefined, 'bold')
        pdf.text('Ship To:', rightCol, currentY - (billToLines.length * 4))
        pdf.setFont(undefined, 'normal')
        let consigneeY = currentY - (billToLines.length * 4) + 5
        
        const consigneeLines = [
          invoice.consignee_name,
          invoice.consignee_address,
          invoice.consignee_gstin ? `GSTIN: ${invoice.consignee_gstin}` : '',
          invoice.consignee_email,
          invoice.consignee_phone
        ].filter(Boolean)
        
        consigneeLines.forEach(line => {
          pdf.text(line || '', rightCol, consigneeY)
          consigneeY += 4
        })
      }

      currentY += 10

      // Items table
      currentY = renderInvoiceTable(pdf, pageWidth, currentY, items, invoice, lineSpacing)

      // Signature section
      if (options?.showSignature && signatureImage) {
        currentY += 20
        pdf.setFont(undefined, 'bold')
        pdf.text('Authorized Signature:', pageWidth - 80, currentY)
        
        try {
          pdf.addImage(signatureImage, 'PNG', pageWidth - 80, currentY + 5, 60, 20)
        } catch (error) {
          console.error('Error adding signature image:', error)
        }
      }

      // Footer
      addFooterToPage(pdf, pageWidth, pageHeight, footerImage, userProfile)

      pdf.save(`invoice-${invoice.invoice_number}.pdf`)
      
      toast({
        title: 'Success',
        description: 'Invoice PDF exported successfully',
      })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderDefaultHeader = (pdf: jsPDF, pageWidth: number, userProfile?: Profile, currentY: number = 20): number => {
    pdf.setFontSize(16)
    pdf.setFont(undefined, 'bold')
    pdf.text(userProfile?.company_name || 'Your Company', pageWidth / 2, currentY, { align: 'center' })
    
    currentY += 8
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    
    if (userProfile?.company_slogan) {
      pdf.text(userProfile.company_slogan, pageWidth / 2, currentY, { align: 'center' })
      currentY += 6
    }
    
    if (userProfile?.company_address) {
      pdf.text(userProfile.company_address, pageWidth / 2, currentY, { align: 'center' })
      currentY += 4
    }
    
    const contactInfo = []
    if (userProfile?.company_phone) contactInfo.push(`Phone: ${userProfile.company_phone}`)
    if (userProfile?.company_email) contactInfo.push(`Email: ${userProfile.company_email}`)
    if (userProfile?.gst_number) contactInfo.push(`GST: ${userProfile.gst_number}`)
    
    if (contactInfo.length > 0) {
      pdf.text(contactInfo.join(' | '), pageWidth / 2, currentY, { align: 'center' })
      currentY += 6
    }
    
    return currentY + 10
  }

  const addHeaderToPage = (pdf: jsPDF, pageWidth: number, headerImage: string | null, userProfile?: Profile, currentY: number = 20): number => {
    if (headerImage) {
      try {
        pdf.addImage(headerImage, 'PNG', 20, currentY, pageWidth - 40, 40)
        return currentY + 50
      } catch (error) {
        console.error('Error adding header image:', error)
        return renderDefaultHeader(pdf, pageWidth, userProfile, currentY)
      }
    } else {
      return renderDefaultHeader(pdf, pageWidth, userProfile, currentY)
    }
  }

  const addFooterToPage = (pdf: jsPDF, pageWidth: number, pageHeight: number, footerImage: string | null, userProfile?: Profile): void => {
    const footerY = pageHeight - 30
    
    if (footerImage) {
      try {
        pdf.addImage(footerImage, 'PNG', 20, footerY, pageWidth - 40, 20)
        return
      } catch (error) {
        console.error('Error adding footer image:', error)
      }
    }
    
    // Default footer
    pdf.setFontSize(8)
    pdf.setFont(undefined, 'normal')
    
    if (userProfile?.company_address) {
      pdf.text(userProfile.company_address, pageWidth / 2, footerY + 5, { align: 'center' })
    }
    
    const footerContactInfo = []
    if (userProfile?.company_phone) footerContactInfo.push(userProfile.company_phone)
    if (userProfile?.company_email) footerContactInfo.push(userProfile.company_email)
    
    if (footerContactInfo.length > 0) {
      pdf.text(footerContactInfo.join(' | '), pageWidth / 2, footerY + 12, { align: 'center' })
    }
    
    if (userProfile?.bank_name) {
      const bankInfo = [
        `Bank: ${userProfile.bank_name}`,
        userProfile.bank_account_number ? `A/c: ${userProfile.bank_account_number}` : '',
        userProfile.bank_ifsc_code ? `IFSC: ${userProfile.bank_ifsc_code}` : ''
      ].filter(Boolean).join(' | ')
      
      pdf.text(bankInfo, pageWidth / 2, footerY + 19, { align: 'center' })
    }
  }

  const renderInvoiceTable = (pdf: jsPDF, pageWidth: number, startY: number, items: InvoiceItem[], invoice: Invoice, lineSpacing: number): number => {
    const tableWidth = pageWidth - 40
    const startX = 20
    let currentY = startY

    // Table headers
    const headers = ['S.No', 'Description', 'HSN', 'Qty', 'Rate', 'Amount']
    const columnWidths = [20, 80, 25, 20, 25, 30]
    
    pdf.setFontSize(9)
    pdf.setFont(undefined, 'bold')
    
    // Header background
    pdf.setFillColor(240, 240, 240)
    pdf.rect(startX, currentY, tableWidth, 8, 'F')
    
    let xPos = startX + 2
    headers.forEach((header, index) => {
      pdf.text(header, xPos, currentY + 5)
      xPos += columnWidths[index]
    })
    
    currentY += 8
    pdf.setFont(undefined, 'normal')
    
    // Table rows
    items.forEach((item, index) => {
      if (currentY > 250) {
        pdf.addPage()
        currentY = 20
      }
      
      const rowHeight = 6 * lineSpacing
      
      // Alternating row background
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250)
        pdf.rect(startX, currentY, tableWidth, rowHeight, 'F')
      }
      
      xPos = startX + 2
      const rowData = [
        (index + 1).toString(),
        item.description,
        item.hsn_code || '',
        item.quantity.toString(),
        item.unit_price.toFixed(2),
        item.line_total.toFixed(2)
      ]
      
      rowData.forEach((data, colIndex) => {
        if (colIndex === 1) { // Description column - handle text wrapping
          const lines = pdf.splitTextToSize(data, columnWidths[colIndex] - 4)
          lines.forEach((line: string, lineIndex: number) => {
            pdf.text(line, xPos, currentY + 4 + (lineIndex * 3))
          })
        } else {
          pdf.text(data, xPos, currentY + 4)
        }
        xPos += columnWidths[colIndex]
      })
      
      currentY += rowHeight
    })
    
    // Table border
    pdf.rect(startX, startY, tableWidth, currentY - startY)
    
    // Vertical lines
    xPos = startX
    columnWidths.forEach(width => {
      xPos += width
      pdf.line(xPos, startY, xPos, currentY)
    })
    
    currentY += 10
    
    // Totals
    const totalsX = pageWidth - 100
    pdf.setFont(undefined, 'bold')
    
    pdf.text('Subtotal:', totalsX, currentY)
    pdf.text(`₹${invoice.subtotal.toFixed(2)}`, totalsX + 40, currentY)
    currentY += 5
    
    if (invoice.tax_rate > 0) {
      pdf.text(`GST (${invoice.tax_rate}%):`, totalsX, currentY)
      pdf.text(`₹${invoice.tax_amount.toFixed(2)}`, totalsX + 40, currentY)
      currentY += 5
    }
    
    pdf.text('Total:', totalsX, currentY)
    pdf.text(`₹${invoice.total_amount.toFixed(2)}`, totalsX + 40, currentY)
    currentY += 8
    
    // Amount in words
    pdf.setFont(undefined, 'normal')
    pdf.text(`Amount in words: ${numberToWords(invoice.total_amount)} Rupees Only`, 20, currentY)
    
    return currentY + 10
  }

  return { exportToPDF, loading }
}