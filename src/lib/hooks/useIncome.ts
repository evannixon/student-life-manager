'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export type Income = {
  id: string
  user_id: string
  name: string
  amount: number
  category: string
  date: string
  icon: string
  created_at: string
}

export function useIncome(userId: string | null) {
  const [income, setIncome] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const fetch = async () => {
      const { data } = await supabase.from('income').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (data) setIncome(data)
      setLoading(false)
    }
    fetch()
    const channel = supabase.channel(`income-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income', filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setIncome(prev => prev.some(t => t.id === (payload.new as Income).id) ? prev : [payload.new as Income, ...prev])
        if (payload.eventType === 'DELETE') setIncome(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id))
        if (payload.eventType === 'UPDATE') setIncome(prev => prev.map(t => t.id === (payload.new as Income).id ? payload.new as Income : t))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const addIncome = async (item: Omit<Income, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('income').insert(item).select().single()
    if (error) throw error
    setIncome(prev => prev.some(t => t.id === data.id) ? prev : [data, ...prev])
    return data
  }
  const deleteIncome = async (id: string) => {
    setIncome(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('income').delete().eq('id', id)
    if (error) throw error
  }

  return { income, loading, addIncome, deleteIncome }
}
