import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { ADMIN_EMAILS } from '../utils/authRoles';

interface CentralLoginCardProps {
  onLogin: () => Promise<void>;
  isLoggingIn?: boolean;
}

export const CentralLoginCard: React.FC<CentralLoginCardProps> = ({
  onLogin,
  isLoggingIn: externalLoading = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoading = externalLoading || internalLoading;

  const handleSignIn = async () => {
    try {
      setErrorMessage(null);
      setInternalLoading(true);
      await onLogin();
    } catch (err: any) {
      console.error('Login action error:', err);
      setErrorMessage(
        err?.message || 'গুগল সাইন-ইন সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।'
      );
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6 sm:py-12 px-2 sm:px-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-lg">
        
        {/* Ambient Decorative Glow behind card */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-600/20 rounded-3xl blur-xl opacity-75 pointer-events-none" />

        {/* Central Modal Card */}
        <div className="relative bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-3xl shadow-2xl p-6 sm:p-9 text-center backdrop-blur-sm">
          
          {/* Top Brand Crest Icon */}
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/30 mb-5 relative group">
            <ShieldCheck size={38} className="sm:size-10 transition-transform group-hover:scale-105" />
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-gray-900 p-1 rounded-full shadow-md">
              <Lock size={12} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Titles */}
          <div className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 rounded-full text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-2.5">
            নিরাপদ প্রাতিষ্ঠানিক এক্সেস গেটওয়ে
          </div>
          
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            সোনালী লাইফ ইন্স্যুরেন্স পিএলসি
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium mt-1">
            গ্রুপ ক্লেইম, বিলিং ও ভাউচার ম্যানেজমেন্ট সিস্টেম
          </p>

          {/* Security Gate Notice */}
          <div className="mt-5 p-3 sm:p-3.5 bg-slate-50 dark:bg-gray-800/80 border border-slate-200/90 dark:border-gray-700/80 rounded-2xl text-left">
            <div className="flex items-start gap-2.5">
              <div className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg mt-0.5 shrink-0">
                <Lock size={15} />
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                সিস্টেমের নিরাপত্তা নিশ্চিতকরণে <strong>লগইন ছাড়া কোনো ডাটা বা ফিচার ব্যবহার করা যাবে না</strong>। অনুগ্রহ করে অনুমোদিত গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।
              </p>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 text-left animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">লগইন ত্রুটি:</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Main Action: Google Sign-in Button */}
          <div className="mt-6">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-100 font-bold text-sm sm:text-base rounded-2xl border-2 border-emerald-500/80 hover:border-emerald-600 dark:border-emerald-600/80 shadow-md hover:shadow-lg hover:shadow-emerald-600/15 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>গুগল অ্যাকাউন্টে সংযোগ হচ্ছে...</span>
                </>
              ) : (
                <>
                  {/* Official Google G Logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google দিয়ে সাইন-ইন করুন</span>
                </>
              )}
            </button>
          </div>

          {/* Role Policy Explanation Accordion / Guide */}
          <div className="mt-6 pt-5 border-t border-gray-150 dark:border-gray-800 text-left space-y-3">
            <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>ভূমিকা ও প্রবেশাধিকার নির্দেশিকা (Role Policy)</span>
            </h4>

            {/* Admin Policy Item */}
            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                  অ্যাডমিন প্রবেশাধিকার (Super Admin):
                </span>
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300/90 mt-1 leading-relaxed">
                শুধুমাত্র অনুমোদিত দুটি ইমেইল <strong>{ADMIN_EMAILS.join(' ও ')}</strong> সম্পূর্ণ সিস্টেম (দ্রুত অনুসন্ধান, তারিখ ভিত্তিক রিপোর্ট, অটো বিলিং, শাখা ব্যবস্থাপনা) পরিচালনা করতে পারবে।
              </p>
            </div>

            {/* General User Policy Item */}
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  সাধারণ ব্যবহারকারী (General User / Branch Officer):
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 mt-1 leading-relaxed">
                অন্যান্য যেকোনো প্রাতিষ্ঠানিক গুগল একাউন্টে লগইন করলে সরাসরি শাখা বিল ও ভাউচার এন্ট্রি এবং রসিদ পর্যবেক্ষণ পোর্টাল চালু হবে।
              </p>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-500" />
            <span>২৫৬-বিট এনক্রিপশন • প্রাতিষ্ঠানিক নিরাপত্তা নিশ্চিত</span>
          </div>

        </div>
      </div>
    </div>
  );
};
