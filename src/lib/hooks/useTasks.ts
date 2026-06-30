'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export type Task = {
  id: string
  user_id: string
  title: string
  subject: string
  deadline: string
  difficulty: number
  status: 'todo' | 'progress' | 'done'
  danger_score: number
  created_at: string
}

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks').select('*').eq('user_id', userId)
        .order('danger_score', { ascending: false })
      if (data) setTasks(data)
      setLoading(false)
    }

    fetchTasks()

    const channel = supabase
      .channel(`tasks-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => prev.some(t => t.id === (payload.new as Task).id) ? prev : [payload.new as Task, ...prev])
        }
        if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id))
        }
        if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const addTask = async (task: Omit<Task, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (error) throw error
    setTasks(prev => prev.some(t => t.id === data.id) ? prev : [data, ...prev])
    return data
  }

  const updateTask = async (id: string, updates: Partial<Pick<Task, 'title' | 'subject' | 'deadline' | 'difficulty' | 'status' | 'danger_score'>>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) throw error
  }

  const updateTaskStatus = async (task: Task, status: Task['status']) => {
    let dangerScore = task.danger_score
    if (status === 'done') {
      dangerScore = 0
    } else if (task.status === 'done') {
      // Balik dari done → recalculate dari deadline asli
      const days = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
      dangerScore = Math.min(99, Math.max(0, Math.round((100 - days * 10) + task.difficulty * 5)))
    }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status, danger_score: dangerScore } : t))
    const { error } = await supabase.from('tasks').update({ status, danger_score: dangerScore }).eq('id', task.id)
    if (error) throw error
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  }

  return { tasks, loading, addTask, updateTask, updateTaskStatus, deleteTask }
}
