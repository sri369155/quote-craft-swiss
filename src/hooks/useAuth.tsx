
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/types/database'

const isSupabaseConfigured = true

interface AuthContext {
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContext | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If Supabase is not configured, just set loading to false
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    // Get initial session immediately
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await loadProfile(session.user.id)
          }
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        // Only synchronous state updates here
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            loadProfile(session.user.id)
          }, 0)
        } else {
          setProfile(null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId: string) => {
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return
      }

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      // Silently handle profile loading errors
    }
  }

  const signUp = async (email: string, password: string, fullName: string, companyName?: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          company_name: companyName,
        })

      if (profileError) {
        // Profile creation error handled silently
      }
    }

    return data
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!supabase) throw new Error('Supabase not configured')
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) throw error

    setProfile(prev => prev ? { ...prev, ...updates } : null)
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
