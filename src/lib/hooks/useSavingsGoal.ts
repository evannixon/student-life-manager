'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export type SavingsGoal = {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  month: string
  created_at: string
  updated_at: string
}

export function useSavingsGoal(userId: string | null) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [goal, setGoal] = useState<SavingsGoal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const fetch = async () => {
      const { data } = await supabase.from('savings_goals').select('*')
        .eq('user_id', userId).eq('month', currentMonth).maybeSingle()
      setGoal(data)
      setLoading(false)
    }
    fetch()
    const channel = supabase.channel('goals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') setGoal(payload.new as SavingsGoal)
        if (payload.eventType === 'DELETE') setGoal(null)
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const setGoalAmount = async (targetAmount: number, name = 'Target Tabungan') => {
    if (goal) {
      const { error } = await supabase.from('savings_goals')
        .update({ target_amount: targetAmount, name, updated_at: new Date().toISOString() })
        .eq('id', goal.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('savings_goals')
        .insert({ user_id: userId!, name, target_amount: targetAmount, current_amount: 0, month: currentMonth })
        .select().single()
      if (error) throw error
      setGoal(data)
    }
  }

  return { goal, loading, setGoalAmount, currentMonth }
}
