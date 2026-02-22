import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Asset, AssetType } from '@/types'

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Asset[]
    },
  })
}

interface CreateAssetInput {
  asset_type: AssetType
  name: string
  purchase_price: number
  purchase_date: string
  quantity: number
  currency: string
  notes?: string
  metadata?: Record<string, unknown>
}

export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single()
      if (error) throw error
      return data as Asset
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

interface UpdateAssetInput extends Partial<CreateAssetInput> {
  id: string
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAssetInput) => {
      const { data, error } = await supabase
        .from('assets')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Asset
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}
