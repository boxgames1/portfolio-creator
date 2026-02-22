import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AISuggestionResponse {
  rating: number
  suggestions: string[]
}

export function useAISuggestions() {
  return useMutation({
    mutationFn: async (portfolio: {
      totalValue: number
      totalCost: number
      roi: number
      byType: { type: string; value: number }[]
    }): Promise<AISuggestionResponse> => {
      const { data, error } = await supabase.functions.invoke<AISuggestionResponse>(
        'get-ai-suggestions',
        { body: { portfolio } }
      )
      if (error) throw error
      if (!data) throw new Error('No response from AI')
      return data
    },
  })
}
