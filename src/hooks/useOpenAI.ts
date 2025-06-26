
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface AIAutofillResult {
  description: string
  quantity: number
  unit_price: number
  reasoning?: string
}

export function useOpenAI() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const autofillItem = async (description: string): Promise<AIAutofillResult | null> => {
    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a description to use AI autofill.',
        variant: 'destructive',
      })
      return null
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('openai-autofill', {
        body: { description }
      })

      if (error) {
        throw error
      }

      return data
    } catch (error: any) {
      toast({
        title: 'AI autofill error',
        description: error.message || 'Failed to get AI suggestions. Please check if OpenAI API key is configured.',
        variant: 'destructive',
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    autofillItem,
    loading,
  }
}
