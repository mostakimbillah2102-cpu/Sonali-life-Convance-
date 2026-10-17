import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Sparkles, Building2 } from 'lucide-react';
import { BRANCH_DATABASE, toBanglaDigits, toEnglishDigits } from '../constants';
import { BranchData, BranchDatabase } from '../types';

interface AllBranchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToBill: (code: string, data: BranchData) => void;
  branchesMap?: BranchDatabase;
  onOpenBranchManager?: () => void;
}

const AllBranchesModal: React.FC<AllBranchesModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddToBill,
  branchesMap = BRANCH_DATABASE,
  onOpenBranchManager
}) => {
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'all' | 'metro'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const branches = Object.entries(branchesMap).map(([code, data]) => ({ 
    code, 
    ...data,
    isMetro: data.branch.includes('মেট্রো') || data.branch.includes('Metro')
  }));
  
  const filteredBranches = branches.filter(item => {
     if (tab === 'metro' && !item.isMetro) return false;
     if (!filter) return true;
     const searchStr = toEnglishDigits(filter.toLowerCase()).normalize('NFC');
     const full = (item.code + item.branch + item.name + (item.mobile || '')).toLowerCase().normalize('NFC');
     return full.includes(searchStr);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 transition-colors overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div>
            <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <Building2 size={22} className="text-emerald-600" />
              সকল ব্রাঞ্চ তালিকা
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                {toBanglaDigits(branches.length)} টি
              </span>
            </h2>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">যেকোনো ব্রাঞ্চ দ্রুত বিলে অন্তর্ভুক্ত করুন</p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenBranchManager && (
              <button
                onClick={onOpenBranchManager}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all"
              >
                <Plus size={15} />
                <span>নতুন ব্রাঞ্চ</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter & Tabs */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20 flex flex-col sm:flex-row gap-3 items-center justify-between transition-colors">
            <div className="relative w-full sm:max-w-md">
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="কোড, শাখা বা কর্মকর্তা দিয়ে খুঁজুন..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                {filter && (
                  <button onClick={() => setFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === 'all'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                সকল ব্রাঞ্চ
              </button>
              <button
                onClick={() => setTab('metro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === 'metro'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                মেট্রো ব্রাঞ্চ
              </button>
            </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-0 scroll-smooth">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-gray-50/80 dark:bg-gray-900/80 sticky top-0 z-10 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 backdrop-blur-md">
              <tr>
                <th className="p-3.5 text-center w-16">কোড</th>
                <th className="p-3.5">শাখার নাম</th>
                <th className="p-3.5">কর্মকর্তা</th>
                <th className="p-3.5 hidden sm:table-cell">মোবাইল</th>
                <th className="p-3.5 text-right w-28">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredBranches.map((item) => (
                <tr key={item.code} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors group">
                  <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    {toBanglaDigits(item.code)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{item.branch}</span>
                      {item.isCustom && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Sparkles size={10} /> কাস্টম
                        </span>
                      )}
                    </div>
                    <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{item.mobile}</div>
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">{item.name}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400 font-mono hidden sm:table-cell">{item.mobile}</td>
                  <td className="p-3 text-right">
                    <button 
                        onClick={() => { onAddToBill(item.code, item); }}
                        className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg font-bold transition-all border border-emerald-200 dark:border-emerald-800 active:scale-95 shadow-sm"
                    >
                        <Plus size={14} />
                        <span>যোগ</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBranches.length === 0 && (
                  <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400 dark:text-gray-500">
                          <Search size={36} className="mx-auto mb-2 opacity-20" />
                          <span>কোনো ব্রাঞ্চ পাওয়া যায়নি</span>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 transition-colors">
            <span>প্রদর্শিত হচ্ছে {toBanglaDigits(filteredBranches.length)} টি ব্রাঞ্চ</span>
            <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 font-bold rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all">
              বন্ধ করুন
            </button>
        </div>
      </div>
    </div>
  );
};

export default AllBranchesModal;
