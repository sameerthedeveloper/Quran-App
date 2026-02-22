import { BookOpen } from 'lucide-react'

export default function SplashScreen() {
  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-900 text-white animate-fade-out" 
      style={{ animationDelay: '1.5s', animationDuration: '0.4s', animationFillMode: 'forwards' }}
    >
      <div className="flex flex-col items-center animate-fade-in-up">
        <div className="w-24 h-24 bg-white/10 rounded-3xl backdrop-blur-md flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-transparent opacity-30" />
           <BookOpen size={48} className="text-emerald-100" />
        </div>
        <h1 className="text-4xl font-bold font-arabic mb-2">القرآن</h1>
        <p className="text-emerald-200 tracking-[0.2em] uppercase text-sm font-semibold">Quran Social</p>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center">
        <div className="flex items-center gap-1 mb-2">
           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest">Loading</p>
      </div>
    </div>
  )
}
