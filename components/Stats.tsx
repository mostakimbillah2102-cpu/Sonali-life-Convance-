import React from 'react';
import { toBanglaDigits } from '../constants';
import { BarChart3, Clock, Coins, Search } from 'lucide-react';

interface StatsProps {
  totalBranches: number;
  searchedToday: number;
  totalAmount: number;
}

const Stats: React.FC<StatsProps> = ({ totalBranches, searchedToday, totalAmount }) => {
  const lastUpdated = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
          <BarChart3 size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">মোট ব্রাঞ্চ</p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{toBanglaDigits(totalBranches)}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
          <Search size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">আজকের সার্চ</p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{toBanglaDigits(searchedToday)}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
          <Coins size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">মোট টাকা</p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{toBanglaDigits(totalAmount)}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">আপডেট</p>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{lastUpdated}</h3>
        </div>
      </div>
    </div>
  );
};

export default Stats;