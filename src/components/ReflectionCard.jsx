import { BookOpen, Clock } from 'lucide-react'

function timeAgo(dateStr) {
  const now = new Date()
  const past = new Date(dateStr)
  const seconds = Math.floor((now - past) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return past.toLocaleDateString()
}

export default function ReflectionCard({ reflection }) {
  const { username, message, surah, created_at } = reflection

  return (
    <div className="bg-surface-card rounded-2xl p-5 shadow-card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
            {username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="font-medium text-sm text-foreground">{username || 'Anonymous'}</span>
        </div>
        <div className="flex items-center gap-1 text-muted">
          <Clock size={12} />
          <span className="text-xs">{timeAgo(created_at)}</span>
        </div>
      </div>

      {/* Message */}
      <p className="text-sm text-foreground leading-relaxed">{message}</p>

      {/* Surah Tag */}
      {surah && (
        <div className="mt-3 flex items-center gap-1.5">
          <BookOpen size={12} className="text-primary" />
          <span className="text-xs font-medium text-primary bg-emerald-50 px-2 py-0.5 rounded-full">
            {surah}
          </span>
        </div>
      )}
    </div>
  )
}
