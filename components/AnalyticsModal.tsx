import React from 'react';
import { X, TrendingUp, BarChart3, Award } from 'lucide-react';
import { SavedBill, BillItem } from '../types';
import { toBanglaDigits, toEnglishDigits } from '../constants';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBills: SavedBill[];
  currentBillItems?: BillItem[];
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  savedBills,
}) => {
  if (!isOpen) return null;

  // Calculate stats
  let totalSpentAllTime = 0;
  let totalBilledBranchesCount = 0;
  const branchFrequencyMap: { [branch: string]: { count: number; totalAmount: number; name: string } } = {};
  const monthlySpendingMap: { [monthKey: string]: number } = {};

  savedBills.forEach(bill => {
    try {
      const items: BillItem[] = JSON.parse(bill.items);
      let billSum = 0;

      items.forEach(item => {
        const amt = parseFloat(toEnglishDigits(item.amount || '0')) || 0;
        billSum += amt;
        totalBilledBranchesCount += 1;

        if (!branchFrequencyMap[item.branch]) {
          branchFrequencyMap[item.branch] = { count: 0, totalAmount: 0, name: item.name };
        }
        branchFrequencyMap[item.branch].count += 1;
        branchFrequencyMap[item.branch].totalAmount += amt;
      });

      totalSpentAllTime += billSum;

      // Group by Year-Month
      const d = new Date(bill.createdAt);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySpendingMap[mKey] = (monthlySpendingMap[mKey] || 0) + billSum;
    } catch (e) {}
  });

  const topBranches = Object.entries(branchFrequencyMap)
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 5);

  const averagePerBill = savedBills.length > 0 ? Math.round(totalSpentAllTime / savedBills.length) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/30">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">খরচ ও বিলিং অ্যানালিটিক্স</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">সংরক্ষিত বিল ও মাসিক খরচের সার্বিক পরিসংখ্যান</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Analytics Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">মোট দাবীকৃত বিল</span>
              <p className="text-lg sm:text-2xl font-bold text-emerald-900 dark:text-emerald-100 font-mono">
                ৳{toBanglaDigits(totalSpentAllTime)}
              </p>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-1 block">সকল সেভ করা বিল</span>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block mb-1">মোট সংরক্ষিত বিল</span>
              <p className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100 font-mono">
                {toBanglaDigits(savedBills.length)} টি
              </p>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400 mt-1 block">ভাউচার ফাইল</span>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 block mb-1">গড় বিলের পরিমাণ</span>
              <p className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100 font-mono">
                ৳{toBanglaDigits(averagePerBill)}
              </p>
              <span className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-1 block">প্রতি ভাউচারে</span>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block mb-1">মোট অন্তর্ভুক্ত শাখা</span>
              <p className="text-lg sm:text-2xl font-bold text-amber-900 dark:text-amber-100 font-mono">
                {toBanglaDigits(totalBilledBranchesCount)} টি
              </p>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-1 block">এন্ট্রি রেকর্ড</span>
            </div>
          </div>

          {/* Top Billed Branches */}
          <div className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-3 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              সর্বোচ্চ বিল গ্রহণকারী শীর্ষ ৫ শাখা
            </h3>

            {topBranches.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">বিল সংরক্ষণ করলে শীর্ষ শাখার তালিকা এখানে প্রদর্শিত হবে।</p>
            ) : (
              <div className="space-y-3">
                {topBranches.map(([branchName, stats], idx) => {
                  const percent = totalSpentAllTime > 0 ? (stats.totalAmount / totalSpentAllTime) * 100 : 0;
                  return (
                    <div key={branchName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-gray-800 dark:text-gray-200 font-bold">
                          {toBanglaDigits(idx + 1)}. {branchName} <span className="text-gray-400 font-normal">({stats.name})</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ৳{toBanglaDigits(stats.totalAmount)} ({toBanglaDigits(stats.count)} বার)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Spending Breakdown */}
          <div className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-3 flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-600" />
              মাসিক খরচ বিশ্লেষণ
            </h3>

            {Object.keys(monthlySpendingMap).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">কোনো সংরক্ষিত বিলের মাসিক ডাটা পাওয়া যায়নি।</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(monthlySpendingMap).map(([monthStr, amount]) => (
                  <div key={monthStr} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono block">{monthStr}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 font-mono">৳{toBanglaDigits(amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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

export default AnalyticsModal;
