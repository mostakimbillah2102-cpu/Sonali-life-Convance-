import React, { useState } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { BRANCH_DATABASE, toBanglaDigits, toEnglishDigits } from '../constants';
import { BranchData } from '../types';

interface AllBranchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToBill: (code: string, data: BranchData) => void;
}

const AllBranchesModal: React.FC<AllBranchesModalProps> = ({ isOpen, onClose, onAddToBill }) => {
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const branches = Object.entries(BRANCH_DATABASE).map(([code, data]) => ({ code, ...data }));
  
  const filteredBranches = branches.filter(item => {
     if(!filter) return true;
     const searchStr = filter.toLowerCase();
     return (
         item.code.includes(searchStr) || 
         item.branch.toLowerCase().includes(searchStr) || 
         item.name.toLowerCase().includes(searchStr)
     );
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-white/20">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-emerald-900">সকল ব্রাঞ্চ তালিকা</h2>
            <p className="text-sm text-emerald-600 font-medium mt-0.5">মোট {toBanglaDigits(branches.length)} টি ব্রাঞ্চ</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all shadow-sm border border-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter */}
        <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-20">
            <div className="relative max-w-md mx-auto">
                <input 
                    type="text" 
                    placeholder="কোড বা নাম দিয়ে খুঁজুন..." 
                    value={filter}
                    onChange={(e) => setFilter(toEnglishDigits(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all text-sm font-medium"
                    autoFocus
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-0 scroll-smooth">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider shadow-sm">
              <tr>
                <th className="p-4 border-b border-gray-200">কোড</th>
                <th className="p-4 border-b border-gray-200">শাখার নাম</th>
                <th className="p-4 border-b border-gray-200">কর্মকর্তা</th>
                <th className="p-4 border-b border-gray-200 hidden sm:table-cell">মোবাইল</th>
                <th className="p-4 border-b border-gray-200 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBranches.map((item) => (
                <tr key={item.code} className="hover:bg-emerald-50/50 transition-colors group">
                  <td className="p-4 font-bold text-emerald-700 font-mono text-base">{toBanglaDigits(item.code)}</td>
                  <td className="p-4 font-medium text-gray-800">
                      {item.branch}
                      <div className="sm:hidden text-xs text-gray-500 mt-1">{item.mobile}</div>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{item.name}</td>
                  <td className="p-4 text-gray-600 text-sm font-mono hidden sm:table-cell">{item.mobile}</td>
                  <td className="p-4 text-right">
                    <button 
                        onClick={() => { onAddToBill(item.code, item); }}
                        className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-3 py-1.5 rounded-lg font-bold transition-all border border-emerald-100 hover:border-emerald-600 active:scale-95"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">যোগ করুন</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBranches.length === 0 && (
                  <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                          <Search size={40} className="mb-2 opacity-20" />
                          <span>কোনো ব্রাঞ্চ পাওয়া যায়নি</span>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-center">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-medium text-sm hover:underline">বন্ধ করুন</button>
        </div>
      </div>
    </div>
  );
};

export default AllBranchesModal;