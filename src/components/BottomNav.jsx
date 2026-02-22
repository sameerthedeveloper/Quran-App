import { NavLink, useLocation } from 'react-router-dom'
import { Home, BookOpen, Radio, MessageCircle, User } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/quran', icon: BookOpen, label: 'Quran' },
  { to: '/player', icon: Radio, label: 'Player' },
  { to: '/feed', icon: MessageCircle, label: 'Feed' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const location = useLocation()

  // Hide bottom nav on auth page
  if (location.pathname === '/auth') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-emerald-100 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around px-1 py-1.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-emerald-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
