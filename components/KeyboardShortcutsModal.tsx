import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'সার্চ বক্সে দ্রুত ফোকাস ও অনুসন্ধান' },
  { keys: ['Ctrl', 'B'], desc: 'বাল্ক কোড ইনপুটে ফোকাস (একাধিক কোড যোগ)' },
  { keys: ['Ctrl', 'P'], desc: 'প্রিন্ট প্রিভিউ ও সরাসরি প্রিন্ট উইন্ডো' },
  { keys: ['Ctrl', 'S'], desc: 'বিলের ড্রাফট দ্রুত সেভ করা' },
  { keys: ['Ctrl', 'M'], desc: 'সংরক্ষিত বিলের তালিকা ও মার্জ উইন্ডো' },
  { keys: ['Ctrl', 'Shift', 'D'], desc: 'তারিখ ভিত্তিক রিপোর্ট ও অটো বিলিং' },
  { keys: ['Ctrl', 'Shift', 'E'], desc: 'শাখা ও কর্মকর্তা বিল এন্ট্রি পোর্টাল' },
  { keys: ['Ctrl', 'Shift', 'T'], desc: 'কিউআর কোড ও অনলাইন বিল ট্র্যাকিং' },
  { keys: ['Ctrl', 'Shift', 'B'], desc: 'ব্রাঞ্চ ও ডেটাবেজ ম্যানেজমেন্ট মোডাল' },
  { keys: ['Ctrl', '/'], desc: 'কীবোর্ড শর্টকাট গাইড দেখা' },
  { keys: ['Esc'], desc: 'যেকোনো খোলা পপআপ বা মোডাল বন্ধ করা' },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/30">
              <Keyboard size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">কীবোর্ড শর্টকাট</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">কীবোর্ড ব্যবহার করে দ্রুত কাজ করার শর্টকাটসমূহ</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-6 divide-y divide-gray-100 dark:divide-gray-700 space-y-3">
          {SHORTCUTS.map((sc, i) => (
            <div key={i} className="flex items-center justify-between pt-3 first:pt-0">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {sc.desc}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {sc.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold font-mono text-gray-800 dark:text-gray-200 shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-end transition-colors">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
          >
            ঠিক আছে
          </button>
        </div>

      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
