import { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, LogOut, Cloud, Download, Moon, Sun } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
  isSyncing?: boolean;
}

const Header = ({ user, onLogin, onLogout, isSyncing }: HeaderProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial dark mode preference
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-emerald-100 dark:border-gray-800 shadow-sm sticky top-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 leading-tight">সোনালী লাইফ</h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium tracking-wide">স্মার্ট ম্যানেজমেন্ট সিস্টেম</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right hidden md:block border-r border-gray-200 dark:border-gray-700 pr-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">হেল্পলাইন</p>
              <p className="font-bold text-gray-700 dark:text-gray-300">it@sonalilife.com</p>
          </div>
          
          {/* Auth Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all font-bold"
                title="অ্যাপটি ইন্সটল করুন"
              >
                <Download size={16} />
                <span className="hidden sm:inline">ইন্সটল অ্যাপ</span>
              </button>
            )}

            {isSyncing && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 animate-pulse bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                <Cloud size={14} />
                <span>Syncing...</span>
              </div>
            )}
            
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">লগইন করা আছে</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[120px]">{user.displayName || user.email}</p>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-emerald-100 dark:border-emerald-800" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <button 
                  onClick={onLogout}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="লগআউট"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 text-sm bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">গুগল দিয়ে লগইন</span>
                <span className="sm:hidden">লগইন</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;