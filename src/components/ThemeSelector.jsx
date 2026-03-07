import { useState, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'

const themes = [
  { id: 'emerald', name: 'Emerald', color: 'bg-[#059669]' },
  { id: 'blue', name: 'Ocean', color: 'bg-[#2563eb]' },
  { id: 'indigo', name: 'Night', color: 'bg-[#4f46e5]' },
  { id: 'rose', name: 'Sunset', color: 'bg-[#e11d48]' },
  { id: 'amber', name: 'Desert', color: 'bg-[#d97706]' },
]

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('emerald')

  useEffect(() => {
    // Get currently saved theme
    const savedTheme = localStorage.getItem('quran-theme') || 'emerald'
    setCurrentTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId)
    localStorage.setItem('quran-theme', themeId)
    document.documentElement.setAttribute('data-theme', themeId)
  }

  return (
    <div className="bg-surface-card rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-50 bg-gray-50/50">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Palette size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Color Theme</h3>
          <p className="text-xs text-muted">Personalize your app appearance</p>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-5 gap-3">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className="flex flex-col items-center gap-2 group outline-none"
          >
            <div 
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${theme.color} ${
                currentTheme === theme.id ? 'ring-4 ring-primary/20 scale-110 shadow-lg' : 'hover:scale-105 shadow-md'
              }`}
            >
              {currentTheme === theme.id && (
                <Check size={20} className="text-white animate-fade-in" strokeWidth={3} />
              )}
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-semibold transition-colors ${
              currentTheme === theme.id ? 'text-primary' : 'text-muted group-hover:text-foreground'
            }`}>
              {theme.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
