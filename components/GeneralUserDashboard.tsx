import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  CreditCard, 
  FileText, 
  History, 
  AlertCircle, 
  Paperclip, 
  Printer, 
  Search, 
  QrCode, 
  RefreshCw,
  Edit
} from 'lucide-react';
import { BranchDatabase, BranchSubmission, UserProfileData, SubmissionStatus } from '../types';
import { getLocalCachedSubmissions, normalizeSubmission } from '../utils/branchSubmissions';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toBanglaDigits } from '../constants';

interface GeneralUserDashboardProps {
  currentUserProfile?: UserProfileData | null;
  branchesMap: BranchDatabase;
  onOpenNewSubmission: (branchCode?: string) => void;
  onOpenEditSubmission: (sub: BranchSubmission) => void;
  onOpenHistory: (sub: BranchSubmission) => void;
  onOpenTracking: (trackingId?: string) => void;
}

export const GeneralUserDashboard: React.FC<GeneralUserDashboardProps> = ({
  currentUserProfile,
  branchesMap,
  onOpenNewSubmission,
  onOpenEditSubmission,
  onOpenHistory,
  onOpenTracking
}) => {
  const [submissions, setSubmissions] = useState<BranchSubmission[]>(() => {
    return getLocalCachedSubmissions();
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  // Unlocked Branch Selection: can be 'all' or specific branchCode
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>(() => {
    return localStorage.getItem('sonali_user_filter_branch') || currentUserProfile?.branchCode || 'all';
  });

  const activeBranchData = selectedBranchCode !== 'all' ? branchesMap[selectedBranchCode] : null;
  const activeBranchName = selectedBranchCode === 'all' 
    ? 'সকল শাখা (All Branches)' 
    : (activeBranchData?.branch || currentUserProfile?.branchName || `শাখা #${selectedBranchCode}`);

  // Live Firestore subscription for selected branch or all branches
  useEffect(() => {
    setLoading(true);
    try {
      const colRef = collection(db, 'branch_submissions');
      const q = selectedBranchCode && selectedBranchCode !== 'all'
        ? query(colRef, where('branchCode', '==', selectedBranchCode))
        : query(colRef);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: BranchSubmission[] = [];
        snapshot.forEach((docSnap) => {
          items.push(normalizeSubmission(docSnap.data()));
        });
        // Sort descending by billDate / createdAt
        items.sort((a, b) => (b.billDate || '').localeCompare(a.billDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
        setSubmissions(items);
        setLoading(false);
      }, (err) => {
        console.warn('Live subscription error, using local fallback:', err);
        const cached = getLocalCachedSubmissions().filter(s => selectedBranchCode === 'all' || s.branchCode === selectedBranchCode);
        setSubmissions(cached);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch {
      const cached = getLocalCachedSubmissions().filter(s => selectedBranchCode === 'all' || s.branchCode === selectedBranchCode);
      setSubmissions(cached);
      setLoading(false);
    }
  }, [selectedBranchCode]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      // Must match branch if a specific branch is selected
      if (selectedBranchCode !== 'all' && sub.branchCode !== selectedBranchCode) return false;

      // Status filter
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tracking = (sub.trackingId || '').toLowerCase();
        const cat = (sub.category || '').toLowerCase();
        const voucherNo = (sub.voucherNo || '').toLowerCase();
        const desc = (sub.description || '').toLowerCase();
        const officer = (sub.officerName || '').toLowerCase();
        const bName = (sub.branchName || '').toLowerCase();
        const bCode = (sub.branchCode || '').toLowerCase();
        if (!tracking.includes(q) && !cat.includes(q) && !voucherNo.includes(q) && !desc.includes(q) && !officer.includes(q) && !bName.includes(q) && !bCode.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, selectedBranchCode, statusFilter, searchQuery]);

  // Counts by status
  const counts = useMemo(() => {
    const list = submissions.filter(s => selectedBranchCode === 'all' || s.branchCode === selectedBranchCode);
    return {
      total: list.length,
      submitted: list.filter(s => s.status === 'submitted' || s.status === 'under_review').length,
      returned: list.filter(s => s.status === 'returned').length,
      approved: list.filter(s => s.status === 'approved').length,
      paid: list.filter(s => s.status === 'paid' || s.status === 'billed').length,
      totalAmount: list.reduce((acc, curr) => acc + (curr.amount || 0), 0)
    };
  }, [submissions, selectedBranchCode]);

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} /> অনুমোদিত
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
            <RotateCcw size={12} /> সংশোধনের জন্য ফেরত
          </span>
        );
      case 'paid':
      case 'billed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <CreditCard size={12} /> পরিশোধিত
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock size={12} /> পর্যালোচনায়
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            <Clock size={12} /> জমা হয়েছে
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      


      {/* Main Action Cards & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Submit New Bill Action */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-600/20 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
              <PlusCircle size={26} className="text-white" />
            </div>
            <h3 className="text-lg font-bold">নতুন বিল ও ভাউচার দাখিল করুন</h3>
            <p className="text-xs text-emerald-100 mt-1.5 leading-relaxed">
              শাখার অফিস ভাড়া, বিদ্যুৎ বিল, স্টেশনারি বা অন্যান্য খরচের মেমো আপলোড করে এক ক্লিকে হেড অফিসে সাবমিট করুন।
            </p>
          </div>
          <button
            onClick={() => onOpenNewSubmission(selectedBranchCode !== 'all' ? selectedBranchCode : undefined)}
            className="mt-5 w-full py-3 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle size={18} />
            <span>নতুন বিল এন্ট্রি দিন</span>
          </button>
        </div>

        {/* Card 2: Branch Info & Switcher */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Building2 size={22} />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {selectedBranchCode === 'all' ? 'সকল শাখা' : `#${selectedBranchCode}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">সক্রিয় শাখা ফিল্টার</h4>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 size={10} /> আনলক করা
              </span>
            </div>

            {/* Branch Selector Dropdown */}
            <div className="mt-2">
              <label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">শাখা পরিবর্তন করুন:</label>
              <select
                value={selectedBranchCode}
                onChange={(e) => {
                  setSelectedBranchCode(e.target.value);
                  localStorage.setItem('sonali_user_filter_branch', e.target.value);
                }}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="all">🌐 সকল শাখা (সকল বিল দেখুন)</option>
                {Object.entries(branchesMap).map(([code, data]) => (
                  <option key={code} value={code}>
                    {code} - {data.branch}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5">
              কর্মকর্তা: <strong>{currentUserProfile?.displayName || 'সাধারণ কর্মকর্তা'}</strong>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">
              {currentUserProfile?.email || 'officer@sonalilife.com'}
            </p>
          </div>
          <button
            onClick={() => onOpenTracking()}
            className="mt-4 w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl transition-all border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 cursor-pointer"
          >
            <QrCode size={16} />
            <span>অনলাইন কিউআর ট্র্যাকিং</span>
          </button>
        </div>

        {/* Card 3: Summary Stats */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">শাখার বিল পরিসংখ্যান</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gray-50 dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-500">মোট জমাকৃত</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{toBanglaDigits(counts.total)} টি</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">অনুমোদিত</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{toBanglaDigits(counts.approved)} টি</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900">
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">ফেরত এসেছে</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{toBanglaDigits(counts.returned)} টি</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900">
                <p className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">পরিশোধিত</p>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{toBanglaDigits(counts.paid)} টি</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
            <span className="text-gray-500">সর্বমোট দাখিলকৃত টাকা:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">৳{toBanglaDigits(counts.totalAmount.toLocaleString('en-US'))}</span>
          </div>
        </div>
      </div>

      {/* Submissions Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Table Filter Toolbar */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                জমাকৃত বিল ও ভাউচার তালিকা ({activeBranchName})
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                মোট বিল: {toBanglaDigits(filteredSubmissions.length)} টি
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Branch Filter Dropdown */}
            <select
              value={selectedBranchCode}
              onChange={(e) => {
                setSelectedBranchCode(e.target.value);
                localStorage.setItem('sonali_user_filter_branch', e.target.value);
              }}
              className="w-full sm:w-auto px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="all">🌐 সকল শাখা</option>
              {Object.entries(branchesMap).map(([code, data]) => (
                <option key={code} value={code}>
                  {code} - {data.branch}
                </option>
              ))}
            </select>

            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="আইডি, শাখা, বিবরণ..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">সকল স্ট্যাটাস</option>
              <option value="submitted">জমা হয়েছে</option>
              <option value="under_review">পর্যালোচনায়</option>
              <option value="approved">অনুমোদিত</option>
              <option value="returned">সংশোধনের জন্য ফেরত</option>
              <option value="paid">পরিশোধিত</option>
            </select>
          </div>
        </div>

        {/* Returned Bills Alert Card if any */}
        {counts.returned > 0 && (
          <div className="m-5 p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                মনোযোগ দিন: {toBanglaDigits(counts.returned)} টি বিল হেড অফিস থেকে সংশোধনের জন্য ফেরত পাঠানো হয়েছে!
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                অনুগ্রহ করে নিচের তালিকা থেকে ফেরত আসা বিলের পাশের <strong>&quot;সংশোধন ও পুনরায় দাখিল&quot;</strong> বাটনে ক্লিক করে ভুল ঠিক করে আবার জমা দিন।
              </p>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-5">ট্র্যাকিং আইডি ও ভাউচার</th>
                <th className="p-3.5">শাখা (Branch)</th>
                <th className="p-3.5">তারিখ ও ক্যাটাগরি</th>
                <th className="p-3.5">কর্মকর্তা ও বিবরণ</th>
                <th className="p-3.5 text-right">টাকার পরিমাণ</th>
                <th className="p-3.5 text-center">বর্তমান স্ট্যাটাস</th>
                <th className="p-3.5 pr-5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 dark:text-gray-500">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-emerald-600" />
                        <span>বিল লোড হচ্ছে...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">কোনো বিলের তথ্য পাওয়া যায়নি</p>
                        <button
                          onClick={() => onOpenNewSubmission(selectedBranchCode !== 'all' ? selectedBranchCode : undefined)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          প্রথম বিল দাখিল করুন
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isReturned = sub.status === 'returned';

                  return (
                    <tr 
                      key={sub.id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors ${
                        isReturned ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Tracking ID & Voucher */}
                      <td className="p-3.5 pl-5">
                        <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {sub.trackingId}
                        </div>
                        {sub.voucherNo && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            ভাউচার নং: {sub.voucherNo}
                          </div>
                        )}
                        {sub.autoVoucherNo && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                            Auto: {sub.autoVoucherNo}
                          </div>
                        )}
                      </td>

                      {/* Branch column */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            #{sub.branchCode}
                          </span>
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                            {sub.branchName}
                          </span>
                        </div>
                      </td>

                      {/* Date & Category */}
                      <td className="p-3.5">
                        <div className="font-bold text-gray-800 dark:text-gray-200">
                          {sub.billDate}
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                          {sub.category}
                        </div>
                      </td>

                      {/* Officer & Description */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {sub.officerName}
                        </div>
                        {sub.description && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {sub.description}
                          </p>
                        )}

                        {/* Return Reason Banner if Returned */}
                        {isReturned && sub.returnReason && (
                          <div className="mt-1.5 p-2 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-[11px]">
                            <span className="font-bold">হেড অফিসের মন্তব্য: </span>
                            <span>{sub.returnReason}</span>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 text-right font-bold text-gray-900 dark:text-gray-100">
                        <span className="text-sm">৳{toBanglaDigits((sub.amount || 0).toLocaleString('en-US'))}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          
                          {/* If Returned: Highlighted Edit & Resubmit Action */}
                          {isReturned && (
                            <button
                              type="button"
                              onClick={() => onOpenEditSubmission(sub)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              title="সংশোধন করে পুনরায় হেড অফিসে দাখিল করুন"
                            >
                              <Edit size={12} />
                              <span>সংশোধন করুন</span>
                            </button>
                          )}

                          {/* Digital History Button */}
                          <button
                            type="button"
                            onClick={() => onOpenHistory(sub)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="অনুমোদন ইতিহাস ও অডিট ট্রেইল দেখুন"
                          >
                            <History size={15} />
                          </button>

                          {/* Attachment Button */}
                          {sub.voucherAttachments && sub.voucherAttachments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const att = sub.voucherAttachments?.[0]?.dataUrl || sub.voucherAttachment;
                                if (att) setSelectedAttachment(att);
                              }}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                              title={`${sub.voucherAttachments.length} টি ভাউচার সংযুক্তি দেখুন`}
                            >
                              <Paperclip size={15} />
                            </button>
                          )}

                          {/* Print Receipt Button */}
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                            title="বিল ভাউচার স্লিপ প্রিন্ট"
                          >
                            <Printer size={15} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Attachment Preview Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl max-w-2xl w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">ভাউচার মেমো প্রিভিউ</h4>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img 
                src={selectedAttachment} 
                alt="Voucher attachment" 
                className="max-h-full max-w-full object-contain rounded-xl shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
