import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Quotation, QuotationItem, Customer, Profile } from '@/types/database'
import { supabase } from '@/integrations/supabase/client'

export function useImageQuoteExport() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const exportToImage = async (
    quotation: Quotation,
    customer: Customer,
    items: QuotationItem[],
    userProfile?: Profile,
    headerImageUrl?: string,
    footerImageUrl?: string,
    signatureImageUrl?: string
  ): Promise<string | null> => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-quotation-image', {
        body: {
          quotation,
          customer,
          items,
          profile: userProfile,
          headerImageUrl,
          footerImageUrl,
          signatureImageUrl
        }
      })

      if (error) {
        console.error('Error generating quotation image:', error)
        throw error
      }

      if (!data?.imageUrl) {
        throw new Error('No image URL returned')
      }

      toast({
        title: 'Quotation image generated',
        description: 'Your quotation image has been created successfully.',
      })

      return data.imageUrl
    } catch (error: any) {
      console.error('Error exporting to image:', error)
      toast({
        title: 'Image generation failed',
        description: error.message || 'Failed to generate quotation image',
        variant: 'destructive',
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      // Convert base64 to blob and download
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Download complete',
        description: 'Quotation image has been downloaded.',
      })
    } catch (error: any) {
      console.error('Error downloading image:', error)
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download image',
        variant: 'destructive',
      })
    }
  }

  return {
    exportToImage,
    downloadImage,
    loading,
  }
}