import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuran } from '../hooks/useQuran'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import ReflectionCard from '../components/ReflectionCard'
import { MessageCircle, Send, Loader, BookOpen, Heart } from 'lucide-react'

export default function Feed() {
  const { user, profile } = useAuth()
  const { surahs } = useQuran()
  const [reflections, setReflections] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedSurah, setSelectedSurah] = useState('')
  const [posting, setPosting] = useState(false)
  const [showCompose, setShowCompose] = useState(false)

  const fetchReflections = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) setReflections(data)
    } catch (err) {
      console.error('Error fetching reflections:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReflections()
  }, [fetchReflections])

  // Real-time subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const channel = supabase
      .channel('reflections')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reflections',
      }, (payload) => {
        setReflections(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const handlePost = async (e) => {
    e.preventDefault()
    if (!message.trim() || !user) return

    setPosting(true)
    try {
      const { error } = await supabase.from('reflections').insert({
        user_id: user.id,
        username: profile?.username || 'Anonymous',
        message: message.trim(),
        surah: selectedSurah || null,
      })

      if (!error) {
        setMessage('')
        setSelectedSurah('')
        setShowCompose(false)
      }
    } catch (err) {
      console.error('Error posting reflection:', err)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex-1 pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Heart size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Reflections</h1>
        </div>
        <p className="text-sm text-muted">Share meaningful moments from your journey</p>
      </div>

      {/* Compose button */}
      {user && (
        <div className="px-5 py-3">
          {!showCompose ? (
            <button
              onClick={() => setShowCompose(true)}
              className="w-full flex items-center gap-3 p-4 bg-surface-card rounded-2xl shadow-card hover:shadow-elevated transition-all text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-muted">Share a reflection...</span>
            </button>
          ) : (
            <form onSubmit={handlePost} className="bg-surface-card rounded-2xl shadow-elevated p-4 space-y-3 animate-slide-up">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share a meaningful reflection from your Quran journey..."
                className="w-full p-3 bg-surface rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                rows={3}
                maxLength={500}
                required
              />

              {/* Surah selector */}
              <select
                value={selectedSurah}
                onChange={(e) => setSelectedSurah(e.target.value)}
                className="w-full p-2.5 bg-surface rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                <option value="">Tag a Surah (optional)</option>
                {surahs.map(s => (
                  <option key={s.surahNo} value={s.surahName}>
                    {s.surahNo}. {s.surahName}
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting || !message.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {posting ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  Share
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Feed */}
      <div className="px-5 space-y-3 mt-2">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader className="animate-spin text-primary mb-3" size={28} />
            <p className="text-sm text-muted">Loading reflections...</p>
          </div>
        ) : !isSupabaseConfigured() ? (
          <div className="flex flex-col items-center py-20 text-center">
            <MessageCircle className="text-muted mb-3" size={28} />
            <p className="text-sm text-foreground font-medium">Connect Supabase</p>
            <p className="text-xs text-muted mt-1">Configure your .env to see reflections</p>
          </div>
        ) : reflections.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <BookOpen className="text-muted mb-3" size={28} />
            <p className="text-sm text-foreground font-medium">No reflections yet</p>
            <p className="text-xs text-muted mt-1">Be the first to share your journey</p>
          </div>
        ) : (
          reflections.map(r => (
            <ReflectionCard key={r.id} reflection={r} />
          ))
        )}
      </div>
    </div>
  )
}
