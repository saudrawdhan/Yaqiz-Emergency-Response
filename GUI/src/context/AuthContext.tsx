import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { User } from '../types/user'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface RoleCache {
  uid: string
  role: 'admin' | 'responder'
}

const readCache = (): RoleCache | null => {
  try {
    return JSON.parse(localStorage.getItem('er_role_cache') || 'null')
  } catch {
    return null
  }
}

const writeCache = (uid: string, role: 'admin' | 'responder') => {
  localStorage.setItem('er_role_cache', JSON.stringify({ uid, role }))
}

const clearCache = () => {
  localStorage.removeItem('er_role_cache')
  // Also remove old key from previous implementation
  localStorage.removeItem('er_user_role')
}

const hasStoredSession = (): boolean => {
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    )
  } catch {
    return false
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => hasStoredSession())

  const fetchProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      agency: data.agency ?? undefined,
      agencyType: data.agency_type ?? undefined,
      status: data.status ?? 'active',
      contactNumber: data.contact_number ?? undefined,
    }
  }

  useEffect(() => {
    // Safety net: unblock the UI after 1 second no matter what.
    // On the fast path (trusted cache) we clearTimeout manually.
    // On the slow path (profile fetch) we let this fire so the login
    // page appears; the background fetch calls setUser() when done
    // which triggers an automatic redirect via AppRoutes.
    const timeout = setTimeout(() => setLoading(false), 1000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const cache = readCache()
        const trustedRole = cache?.uid === session.user.id ? cache.role : null

        if (trustedRole) {
          // Fast path: same user, cache is valid — instant redirect
          clearTimeout(timeout)
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            name: session.user.email ?? '',
            role: trustedRole,
          })
          setLoading(false)
          // Enrich name/agency in background; role already trusted
          fetchProfile(session.user.id).then((profile) => {
            if (profile) {
              writeCache(session.user.id, profile.role)
              setUser(profile)
            }
          })
        } else {
          // Slow path: no trusted cache — fetch profile in background.
          // The 1-second timeout above will show the login page quickly;
          // when fetchProfile resolves, setUser() triggers redirect.
          fetchProfile(session.user.id).then((profile) => {
            if (profile) {
              writeCache(session.user.id, profile.role)
              setUser(profile)
            }
            setLoading(false)
          })
        }
      } else {
        clearTimeout(timeout)
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const logout = async () => {
    clearCache()
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
