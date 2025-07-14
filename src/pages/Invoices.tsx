import React, { useState } from 'react'
import InvoiceSearch from '@/components/invoices/InvoiceSearch'
import InvoiceBuilder from '@/components/invoices/InvoiceBuilder'
import InvoicePreview from '@/components/invoices/InvoicePreview'
import { Invoice } from '@/types/database'

type ViewMode = 'search' | 'create' | 'edit' | 'preview'

const Invoices: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const handleNewInvoice = () => {
    setSelectedInvoice(null)
    setViewMode('create')
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewMode('edit')
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewMode('preview')
  }

  const handleInvoiceSaved = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewMode('preview')
  }

  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewMode('preview')
  }

  const handleBackToSearch = () => {
    setSelectedInvoice(null)
    setViewMode('search')
  }

  const handleEditFromPreview = () => {
    if (selectedInvoice) {
      setViewMode('edit')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {viewMode === 'search' && (
        <InvoiceSearch
          onNewInvoice={handleNewInvoice}
          onEditInvoice={handleEditInvoice}
          onViewInvoice={handleViewInvoice}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <InvoiceBuilder
          invoiceId={selectedInvoice?.id}
          onSave={handleInvoiceSaved}
          onPreview={handlePreview}
        />
      )}

      {viewMode === 'preview' && (
        <InvoicePreview
          invoiceId={selectedInvoice?.id}
          invoice={selectedInvoice}
          onEdit={handleEditFromPreview}
          onBack={handleBackToSearch}
        />
      )}
    </div>
  )
}

export default Invoices