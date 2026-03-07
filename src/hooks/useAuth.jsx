import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { auth, db } from '../lib/firebase'
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Listen for auth changes
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser)
            if (currentUser) {
                await fetchProfile(currentUser.uid)
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    const fetchProfile = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId)
            const docSnap = await getDoc(userRef)

            if (docSnap.exists()) {
                setProfile({ id: docSnap.id, ...docSnap.data() })
            } else {
                // Profile doesn't exist yet, create it
                await createProfile(userId)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
        } finally {
            setLoading(false)
        }
    }

    const createProfile = async (userId, username = null) => {
        try {
            const newProfile = {
                username: username || `user_${userId.slice(0, 8)}`,
                total_minutes: 0,
                streak: 0,
                completed_surahs: 0,
                privacy: true,
                created_at: serverTimestamp()
            }
            
            const userRef = doc(db, 'users', userId)
            await setDoc(userRef, newProfile)
            
            setProfile({ id: userId, ...newProfile })
        } catch (err) {
            console.error('Error creating profile:', err)
        }
    }

    const signUp = useCallback(async (email, password, username) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            if (userCredential.user) {
                await createProfile(userCredential.user.uid, username)
            }
            return { data: userCredential, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }, [])

    const signIn = useCallback(async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            return { data: userCredential, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }, [])

    const signOut = useCallback(async () => {
        try {
            await firebaseSignOut(auth)
            setUser(null)
            setProfile(null)
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }, [])

    const updateProfile = useCallback(async (updates) => {
        if (!user) return
        
        try {
            const userRef = doc(db, 'users', user.uid)
            await updateDoc(userRef, updates)
            
            // Also update local state
            setProfile(prev => ({ ...prev, ...updates }))
            
            return { data: updates, error: null }
        } catch (error) {
            console.error('Error updating profile:', error)
            return { data: null, error }
        }
    }, [user])

    const signInWithOAuth = useCallback(async (providerName) => {
        try {
            let provider;
            if (providerName === 'google') {
                provider = new GoogleAuthProvider();
            } else {
                return { error: { message: 'Provider not supported' } }
            }
            
            const result = await signInWithPopup(auth, provider);
            
            // Check if profile exists, if not create one
            const userRef = doc(db, 'users', result.user.uid);
            const docSnap = await getDoc(userRef);
            
            if (!docSnap.exists()) {
                await createProfile(result.user.uid, result.user.displayName || null);
            }
            
            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
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
        isConfigured: true, // Firebase is always configured if the app loads
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
