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
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
          <BarChart3 size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">মোট ব্রাঞ্চ</p>
          <h3 className="text-2xl font-bold text-gray-800">{toBanglaDigits(totalBranches)}</h3>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
          <Search size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">আজকের সার্চ</p>
          <h3 className="text-2xl font-bold text-gray-800">{toBanglaDigits(searchedToday)}</h3>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
          <Coins size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">মোট টাকা</p>
          <h3 className="text-2xl font-bold text-gray-800">{toBanglaDigits(totalAmount)}</h3>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">আপডেট</p>
          <h3 className="text-xl font-bold text-gray-800">{lastUpdated}</h3>
        </div>
      </div>
    </div>
  );
};

export default Stats;