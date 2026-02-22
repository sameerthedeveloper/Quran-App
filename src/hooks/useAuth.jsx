import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoading(false)
            return
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchProfile(session.user.id)
                } else {
                    setProfile(null)
                    setLoading(false)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error && error.code === 'PGRST116') {
                // Profile doesn't exist yet, create it
                await createProfile(userId)
            } else if (data) {
                setProfile(data)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
        } finally {
            setLoading(false)
        }
    }

    const createProfile = async (userId, username = null) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    username: username || `user_${userId.slice(0, 8)}`,
                    total_minutes: 0,
                    streak: 0,
                    completed_surahs: 0,
                    privacy: true,
                })
                .select()
                .single()

            if (!error && data) setProfile(data)
        } catch (err) {
            console.error('Error creating profile:', err)
        }
    }

    const signUp = useCallback(async (email, password, username) => {
        if (!isSupabaseConfigured()) return { error: { message: 'Supabase not configured' } }

        const { data, error } = await supabase.auth.signUp({ email, password })
        if (!error && data.user) {
            await createProfile(data.user.id, username)
        }
        return { data, error }
    }, [])

    const signIn = useCallback(async (email, password) => {
        if (!isSupabaseConfigured()) return { error: { message: 'Supabase not configured' } }
        return supabase.auth.signInWithPassword({ email, password })
    }, [])

    const signOut = useCallback(async () => {
        if (!isSupabaseConfigured()) return
        const { error } = await supabase.auth.signOut()
        if (!error) {
            setUser(null)
            setProfile(null)
        }
    }, [])

    const updateProfile = useCallback(async (updates) => {
        if (!user || !isSupabaseConfigured()) return
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single()

        if (!error && data) setProfile(data)
        return { data, error }
    }, [user])

    const signInWithOAuth = useCallback(async (provider) => {
        if (!isSupabaseConfigured()) return { error: { message: 'Supabase not configured' } }
        return supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: window.location.origin
            }
        })
    }, [])

    const value = {
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        signInWithOAuth,
        isConfigured: isSupabaseConfigured(),
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
