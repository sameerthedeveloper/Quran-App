import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true) // assume true until verified

  useEffect(() => {
    // Check if the app is already installed
    const isAppStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    setIsStandalone(isAppStandalone)

    // Detect if device is iOS (iPhone, iPad, iPod)
    const iosDetected = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)

    setIsIOS(iosDetected)

    // Only show prompt if NOT standalone
    if (!isAppStandalone) {
      // Delay showing the prompt slightly so it's not super annoying on first load
      const showTimer = setTimeout(() => setIsVisible(true), 1500)

      // Listen for the standard Android/Desktop PWA install event
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault() // Prevent the mini-infobar from appearing on mobile
        setDeferredPrompt(e)
        setIsVisible(true)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

      return () => {
        clearTimeout(showTimer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome standard install
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsVisible(false) // Hide if they install
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      // Just visually acknowledge for iOS users since they have to do it manually
      alert("Tap the Share button at the bottom of Safari, then tap 'Add to Home Screen'")
    }
  }

  // Hide the prompt completely if they dismiss it
  const handleDismiss = () => {
    setIsVisible(false)
    // Optional: save to localStorage so we don't bug them again for 24 hours
    localStorage.setItem('quran-prompt-dismissed', Date.now().toString())
  }

  useEffect(() => {
    // Don't show if they dismissed it in the last 24 hours
    const dismissed = localStorage.getItem('quran-prompt-dismissed')
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) {
      setIsVisible(false)
    }
  }, [])

  if (!isVisible || isStandalone) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-surface-card rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 animate-slide-up sm:animate-fade-in">
        
        {/* Banner Graphic */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden">
            {/* The icon matches standard PWA icon format */}
            <p className="font-arabic text-3xl text-emerald-600">ق</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Install Quran App</h2>
          <p className="text-sm text-gray-500 mb-6">
            Add this app to your home screen for quick access, offline listening, and full-screen experience without the browser bar.
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
            >
              <Download size={18} />
              {isIOS ? 'Show Install Instructions' : 'Install App Now'}
            </button>
            <button 
              onClick={handleDismiss}
              className="w-full flex items-center justify-center py-3.5 bg-gray-50 text-gray-600 font-medium rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>

        {/* iOS specific visual instructions if detected */}
        {isIOS && (
          <div className="px-6 pb-6 pt-2 text-xs text-gray-400 bg-gray-50 flex items-center justify-center gap-1.5 border-t border-gray-100">
            Tap <Share size={12} className="text-emerald-500" /> in Safari, then select <strong>Add to Home Screen</strong>
          </div>
        )}
      </div>
    </div>
  )
}
