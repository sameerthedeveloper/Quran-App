import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BookOpen, Mail, Lock, User, Loader, AlertCircle } from 'lucide-react'

export default function Auth() {
  const { user, signIn, signUp, loading, isConfigured } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) setError(error.message)
      } else {
        if (!username.trim()) {
          setError('Username is required')
          setSubmitting(false)
          return
        }
        const { error } = await signUp(email, password, username.trim())
        if (error) setError(error.message)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      {/* Logo / Title */}
      <div className="flex flex-col items-center mb-10 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-glow mb-4">
          <BookOpen className="text-white" size={36} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Quran App</h1>
        <p className="text-sm text-muted mt-1">Listen, Reflect, Share</p>
      </div>

      {/* Config warning */}
      {!isConfigured && (
        <div className="w-full max-w-sm mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2 animate-fade-in">
          <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-700">
            Supabase is not configured. Add your credentials to <code className="bg-yellow-100 px-1 rounded">.env</code> file.
          </p>
        </div>
      )}

      {/* Form Card */}
      <div className="w-full max-w-sm bg-surface-card rounded-3xl shadow-elevated p-6 animate-slide-up">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {isLogin ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-sm text-muted mb-6">
          {isLogin ? 'Sign in to continue your journey' : 'Start your Quran journey'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                required={!isLogin}
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              required
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-red-50 p-3 rounded-xl">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !isConfigured}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-medium rounded-xl shadow-card hover:shadow-elevated transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted mt-5">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      {/* Islamic footer */}
      <p className="mt-8 text-xs text-muted text-center font-arabic">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>
    </div>
  )
}
