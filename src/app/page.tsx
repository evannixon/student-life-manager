'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Dashboard from '@/components/Dashboard'
import LandingPage from '@/components/LandingPage'
import AuthForm from '@/components/AuthForm'

type AppState = 'loading' | 'landing' | 'auth' | 'app'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [appState, setAppState] = useState<AppState>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setAppState('app')
      } else {
        setAppState('landing')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setAppState('app')
      } else {
        setUser(null)
        setAppState('landing')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (appState === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
    </div>
  )

  if (appState === 'landing') return <LandingPage onGetStarted={() => setAppState('auth')} />
  if (appState === 'auth') return <AuthForm onSuccess={(u) => { setUser(u); setAppState('app') }} onBack={() => setAppState('landing')} />
  if (appState === 'app' && user) return <Dashboard user={user} />

  return null
}
