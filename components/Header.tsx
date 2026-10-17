import { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, LogOut, Cloud, Download, Moon, Sun, BarChart3, Database, HardDriveDownload, Keyboard, Menu, X, QrCode, Building2, Calendar, Bell, UserCheck, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfileData } from '../types';
import { ROLE_LABELS, isAdminEmail } from '../utils/authRoles';

interface HeaderProps {
  user?: User | null;
  currentUserProfile?: UserProfileData | null;
  unreadNotificationCount?: number;
  onLogin?: () => void;
  onLogout?: () => void;
  isSyncing?: boolean;
  onOpenBranchManager?: () => void;
  onOpenAnalytics?: () => void;
  onOpenBackup?: () => void;
  onOpenShortcuts?: () => void;
  onOpenTracking?: () => void;
  onOpenBranchEntry?: () => void;
  onOpenDateReport?: () => void;
  onOpenRoleManager?: () => void;
  onOpenNotificationCenter?: () => void;
}

const Header = ({ 
  user, 
  currentUserProfile,
  unreadNotificationCount = 0,
  onLogin, 
  onLogout, 
  isSyncing,
  onOpenBranchManager,
  onOpenAnalytics,
  onOpenBackup,
  onOpenShortcuts,
  onOpenTracking,
  onOpenBranchEntry,
  onOpenDateReport,
  onOpenRoleManager,
  onOpenNotificationCenter
}: HeaderProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      e.preventDefault();
      setDeferredPrompt(e);
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
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const userEmail = currentUserProfile?.email || user?.email;
  const isAdmin = isAdminEmail(userEmail);

  return (
    <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-emerald-100 dark:border-gray-800 shadow-sm sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-2.5 rounded-2xl text-white shadow-md shadow-emerald-600/25">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-300 leading-tight tracking-tight">
                সোনালী লাইফ
              </h1>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 hidden sm:inline-block font-sans">
                v2.0 Pro
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium tracking-wide">
              স্মার্ট ব্রাঞ্চ বিলিং ও ভাউচার ম্যানেজমেন্ট
            </p>
          </div>
        </div>

        {/* Center Navigation / Tool Bar - Only available after login */}
        {user && (
          <div className="hidden lg:flex items-center gap-1.5 bg-gray-50/80 dark:bg-gray-800/80 p-1.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
            {onOpenBranchEntry && (
              <button
                onClick={onOpenBranchEntry}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 rounded-xl transition-all shadow-sm border border-emerald-300 dark:border-emerald-700"
                title="শাখা ও কর্মকর্তা বিল এন্ট্রি পোর্টাল"
              >
                <Building2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>শাখা বিল এন্ট্রি</span>
              </button>
            )}

            {isAdmin && onOpenDateReport && (
              <button
                onClick={onOpenDateReport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-600/25 active:scale-95"
                title="তারিখ ভিত্তিক রিপোর্ট ও অটো বিলিং (শুধুমাত্র অ্যাডমিন)"
              >
                <Calendar size={14} />
                <span>তারিখ ভিত্তিক রিপোর্ট</span>
              </button>
            )}

            {onOpenTracking && (
              <button
                onClick={onOpenTracking}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60 rounded-xl transition-all shadow-sm border border-emerald-300/60 dark:border-emerald-700/60"
                title="QR Code ও বিল ট্র্যাকিং স্ট্যাটাস"
              >
                <QrCode size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>QR Tracking</span>
              </button>
            )}

            {isAdmin && onOpenBranchManager && (
              <button
                onClick={onOpenBranchManager}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl transition-all shadow-sm"
                title="নতুন শাখা যোগ বা কাস্টমাইজ করুন (Ctrl+Shift+B)"
              >
                <Database size={14} className="text-emerald-600" />
                <span>ব্রাঞ্চ ম্যানেজার</span>
              </button>
            )}

            {isAdmin && onOpenAnalytics && (
              <button
                onClick={onOpenAnalytics}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl transition-all shadow-sm"
                title="খরচ ও বিলের পরিসংখ্যান দেখুন"
              >
                <BarChart3 size={14} className="text-blue-600" />
                <span>অ্যানালিটিক্স</span>
              </button>
            )}

            {isAdmin && onOpenBackup && (
              <button
                onClick={onOpenBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:text-purple-700 dark:hover:text-purple-400 rounded-xl transition-all shadow-sm"
                title="পুরো সিস্টেমের ব্যাকআপ ও রিস্টোর"
              >
                <HardDriveDownload size={14} className="text-purple-600" />
                <span>ব্যাকআপ</span>
              </button>
            )}

            {isAdmin && onOpenShortcuts && (
              <button
                onClick={onOpenShortcuts}
                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"
                title="কীবোর্ড শর্টকাট (Ctrl + /)"
              >
                <Keyboard size={16} />
              </button>
            )}
          </div>
        )}
        
        {/* Right Section: Theme, Install, Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Notification Center Bell - Only for logged-in user */}
          {user && (
            <button
              onClick={onOpenNotificationCenter}
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              title="নোটিফিকেশন সেন্টার (Notifications)"
            >
              <Bell size={18} />
              {unreadNotificationCount > 0 && (
                <span className="absolute 0.5 top-0.5 right-0.5 bg-red-500 text-white font-bold text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* Role Badge - Only for logged-in user */}
          {user && currentUserProfile ? (
            isAdmin ? (
              <button
                onClick={onOpenRoleManager}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                  ROLE_LABELS[currentUserProfile.role]?.bg || 'bg-purple-50 text-purple-700 border-purple-200'
                } hover:opacity-90 active:scale-95`}
                title="রোল ও পারমিশন কন্ট্রোল (Admin Access)"
              >
                <UserCheck size={13} className="text-purple-600" />
                <span className="text-purple-700 dark:text-purple-300">
                  {ROLE_LABELS[currentUserProfile.role]?.enLabel || 'Super Admin'}
                </span>
              </button>
            ) : (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-sm bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                title="সাধারণ ব্যবহারকারী (শাখা কর্মকর্তা)"
              >
                <UserCheck size={13} className="text-emerald-600" />
                <span>সাধারণ ব্যবহারকারী</span>
                {currentUserProfile.branchCode && (
                  <span className="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/60 px-1 rounded font-mono">
                    #{currentUserProfile.branchCode}
                  </span>
                )}
              </div>
            )
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <Lock size={12} className="text-amber-600 dark:text-amber-400" />
              <span>লগইন আবশ্যক</span>
            </div>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            title="ডার্ক মোড টগল করুন"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-all font-bold shadow-sm"
              title="অ্যাপটি ইন্সটল করুন"
            >
              <Download size={15} />
              <span>ইন্সটল অ্যাপ</span>
            </button>
          )}

          {isSyncing && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 font-mono">
              <Cloud size={13} className="animate-pulse" />
              <span>সিঙ্ক হচ্ছে...</span>
            </div>
          )}
          
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <p className="text-[11px] text-gray-400">লগইন করা আছে</p>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate max-w-[130px]">{user.displayName || user.email}</p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-emerald-200 dark:border-emerald-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <button 
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                title="লগআউট করুন"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 sm:px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <LogIn size={15} />
              <span className="hidden sm:inline">গুগল দিয়ে লগইন</span>
              <span className="sm:hidden">লগইন</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
            title="মেনু"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 flex flex-col gap-2 animate-in slide-in-from-top-2">
          {!user ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-center space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <Lock size={15} />
                <span>লগইন প্রয়োজন</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                সিস্টেমের কোনো ফিচার বা ডাটা ব্যবহার করতে অনুগ্রহ করে গুগল দিয়ে সাইন-ইন করুন।
              </p>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogin?.();
                }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn size={14} />
                <span>Google দিয়ে সাইন-ইন করুন</span>
              </button>
            </div>
          ) : (
            <>
              {isAdmin && onOpenRoleManager && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenRoleManager(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 rounded-xl transition-all border border-purple-200 dark:border-purple-800 shadow-sm"
                >
                  <UserCheck size={16} className="text-purple-600" />
                  <span>রোল ও ইউজার পারমিশন ({currentUserProfile ? (ROLE_LABELS[currentUserProfile.role]?.enLabel || currentUserProfile.role) : 'রোল পরিবর্তন'})</span>
                </button>
              )}

              {onOpenNotificationCenter && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenNotificationCenter(); }}
                  className="flex items-center justify-between p-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded-xl transition-all border border-amber-200 dark:border-amber-800 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-amber-600" />
                    <span>নোটিফিকেশন ও অ্যালার্ট সেন্টার</span>
                  </div>
                  {unreadNotificationCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {unreadNotificationCount} টি নতুন
                    </span>
                  )}
                </button>
              )}

              {onOpenBranchEntry && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenBranchEntry(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 rounded-xl transition-all border border-emerald-300 dark:border-emerald-700 shadow-sm"
                >
                  <Building2 size={16} className="text-emerald-600" />
                  <span>শাখা ও কর্মকর্তা বিল এন্ট্রি (Branch Portal)</span>
                </button>
              )}

              {isAdmin && onOpenDateReport && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenDateReport(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl transition-all shadow-md shadow-blue-600/20"
                >
                  <Calendar size={16} />
                  <span>তারিখ ভিত্তিক বিল রিপোর্ট ও অটো বিলিং (অ্যাডমিন)</span>
                </button>
              )}

              {onOpenTracking && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenTracking(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl transition-all border border-emerald-200 dark:border-emerald-800"
                >
                  <QrCode size={16} className="text-emerald-600" />
                  <span>বিল ট্র্যাকিং ও কিউআর ভেরিফিকেশন</span>
                </button>
              )}

              {isAdmin && onOpenBranchManager && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenBranchManager(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                >
                  <Database size={16} className="text-emerald-600" />
                  <span>ব্রাঞ্চ ম্যানেজার (নতুন শাখা যোগ/সম্পাদনা)</span>
                </button>
              )}

              {isAdmin && onOpenAnalytics && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenAnalytics(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all"
                >
                  <BarChart3 size={16} className="text-blue-600" />
                  <span>বিল অ্যানালিটিক্স ও রিপোর্ট</span>
                </button>
              )}

              {isAdmin && onOpenBackup && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenBackup(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-all"
                >
                  <HardDriveDownload size={16} className="text-purple-600" />
                  <span>ডেটা ব্যাকআপ ও রিস্টোর</span>
                </button>
              )}

              {isAdmin && onOpenShortcuts && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenShortcuts(); }}
                  className="flex items-center gap-2 p-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <Keyboard size={16} className="text-gray-600" />
                  <span>কীবোর্ড শর্টকাট গাইড</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
