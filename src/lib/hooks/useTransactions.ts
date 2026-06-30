'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export type Transaction = {
  id: string
  user_id: string
  name: string
  amount: number
  category: string
  date: string
  icon: string
  created_at: string
}

export function useTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (data) setTransactions(data)
      setLoading(false)
    }

    fetchTransactions()

    const channel = supabase
      .channel(`transactions-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTransactions(prev => prev.some(t => t.id === (payload.new as Transaction).id) ? prev : [payload.new as Transaction, ...prev])
        }
        if (payload.eventType === 'DELETE') {
          setTransactions(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id))
        }
        if (payload.eventType === 'UPDATE') {
          setTransactions(prev => prev.map(t => t.id === (payload.new as Transaction).id ? payload.new as Transaction : t))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('transactions').insert(tx).select().single()
    if (error) throw error
    // Optimistic: tambahkan langsung, realtime nanti dedupe otomatis
    setTransactions(prev => prev.some(t => t.id === data.id) ? prev : [data, ...prev])
    return data
  }

  const updateTransaction = async (id: string, updates: Partial<Pick<Transaction, 'name' | 'amount' | 'category' | 'icon'>>) => {
    // Optimistic update — UI langsung berubah
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('transactions').update(updates).eq('id', id)
    if (error) throw error
  }

  const deleteTransaction = async (id: string) => {
    // Optimistic delete — langsung hilang dari UI, ga nunggu realtime
    setTransactions(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  }

  return { transactions, loading, addTransaction, updateTransaction, deleteTransaction }
}
