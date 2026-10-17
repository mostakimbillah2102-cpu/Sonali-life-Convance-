import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Download, 
  Upload, 
  Building2, 
  Sparkles, 
  AlertTriangle, 
  RotateCcw, 
  Info, 
  CheckCircle2, 
  HelpCircle
} from 'lucide-react';
import { BRANCH_DATABASE, toBanglaDigits, toEnglishDigits } from '../constants';
import { BranchData, BranchDatabase, BillItem } from '../types';

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allBranches: BranchDatabase;
  customBranches: BranchDatabase;
  billItems?: BillItem[];
  onSaveBranch: (code: string, data: BranchData) => void;
  onDeleteBranch?: (code: string, permanent?: boolean) => void;
  onRestoreBranch?: (code: string) => void;
  onDeleteCustomBranch?: (code: string) => void;
  onImportCustomBranches: (imported: BranchDatabase) => void;
  onAddToBill: (code: string, data: BranchData) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface DeleteTarget {
  code: string;
  branch: string;
  name: string;
  mobile: string;
  isCustom: boolean;
  isPermanent?: boolean;
}

const BranchManagerModal: React.FC<BranchManagerModalProps> = ({
  isOpen,
  onClose,
  allBranches,
  customBranches,
  billItems = [],
  onSaveBranch,
  onDeleteBranch,
  onRestoreBranch,
  onDeleteCustomBranch,
  onImportCustomBranches,
  onAddToBill,
  addToast,
}) => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'metro' | 'custom' | 'deleted'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // In-app Delete Confirmation Dialog State (No window.confirm!)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Form State
  const [formData, setFormData] = useState<BranchData & { code: string }>({
    code: '',
    branch: '',
    name: '',
    mobile: '',
    ext: '-',
    email: '',
    zone: 'ঢাকা'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Combine default database, allBranches, and customBranches
  const { allList, activeList, metroList, customList, deletedList } = useMemo(() => {
    const combinedMap: BranchDatabase = {
      ...BRANCH_DATABASE,
      ...allBranches,
      ...customBranches,
    };

    const all = Object.entries(combinedMap).map(([code, data]) => {
      const customEntry = customBranches[code];
      const isDeleted = customEntry?.isDeleted === true || data.isDeleted === true;
      const isCustom = !BRANCH_DATABASE[code] || !!data.isCustom;
      const isMetro = data.branch.includes('মেট্রো') || data.branch.includes('Metro');
      return {
        code,
        ...data,
        isCustom,
        isDeleted,
        isMetro,
      };
    });

    const active = all.filter(item => !item.isDeleted);
    const metro = active.filter(item => item.isMetro);
    const custom = active.filter(item => item.isCustom);
    const deleted = all.filter(item => item.isDeleted);

    return {
      allList: all,
      activeList: active,
      metroList: metro,
      customList: custom,
      deletedList: deleted,
    };
  }, [allBranches, customBranches]);

  if (!isOpen) return null;

  // Choose the source list based on active category tab
  let currentTabList = activeList;
  if (categoryFilter === 'metro') currentTabList = metroList;
  if (categoryFilter === 'custom') currentTabList = customList;
  if (categoryFilter === 'deleted') currentTabList = deletedList;

  // Filter with query
  const filteredBranches = currentTabList.filter((item) => {
    if (!filter) return true;
    const searchStr = toEnglishDigits(filter.toLowerCase()).normalize('NFC');
    const fullText = (
      item.code + ' ' + 
      item.branch + ' ' + 
      item.name + ' ' + 
      item.mobile + ' ' + 
      (item.email || '')
    ).toLowerCase().normalize('NFC');
    return fullText.includes(searchStr);
  });

  const handleStartAdd = () => {
    setFormData({
      code: '',
      branch: '',
      name: '',
      mobile: '',
      ext: '-',
      email: '',
      zone: 'ঢাকা'
    });
    setEditingCode(null);
    setIsAdding(true);
  };

  const handleStartEdit = (code: string, data: BranchData) => {
    setFormData({
      code,
      branch: data.branch,
      name: data.name,
      mobile: data.mobile,
      ext: data.ext || '-',
      email: data.email || '',
      zone: data.zone || ''
    });
    setEditingCode(code);
    setIsAdding(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = toEnglishDigits(formData.code.trim());
    if (!cleanCode) {
      addToast('অনুগ্রহ করে ব্রাঞ্চ কোড দিন', 'error');
      return;
    }
    if (!formData.branch.trim()) {
      addToast('অনুগ্রহ করে শাখার নাম দিন', 'error');
      return;
    }
    if (!formData.name.trim()) {
      addToast('কর্মকর্তার নাম দিন', 'error');
      return;
    }

    const payload: BranchData = {
      branch: formData.branch.trim(),
      name: formData.name.trim(),
      mobile: formData.mobile.trim() || '০১৭০০-০০০০০০',
      ext: formData.ext.trim() || '-',
      email: formData.email.trim() || `${cleanCode}@sonalilife.com`,
      isCustom: true,
      isDeleted: false,
      zone: formData.zone?.trim() || ''
    };

    onSaveBranch(cleanCode, payload);
    addToast(editingCode ? 'ব্রাঞ্চ তথ্য আপডেট হয়েছে!' : 'নতুন ব্রাঞ্চ সফলভাবে যোগ হয়েছে!', 'success');
    setIsAdding(false);
    setEditingCode(null);
  };

  // Safe In-App Delete Confirmation Handler
  const promptDeleteBranch = (item: { code: string; branch: string; name: string; mobile: string; isCustom: boolean }, isPermanent = false) => {
    setDeleteTarget({
      code: item.code,
      branch: item.branch,
      name: item.name,
      mobile: item.mobile,
      isCustom: item.isCustom,
      isPermanent,
    });
  };

  const confirmDeleteExecution = () => {
    if (!deleteTarget) return;
    const { code, branch, isPermanent } = deleteTarget;

    if (onDeleteBranch) {
      onDeleteBranch(code, isPermanent);
    } else if (onDeleteCustomBranch) {
      onDeleteCustomBranch(code);
    }

    if (isPermanent) {
      addToast(`কাস্টম ব্রাঞ্চ '${branch}' স্থায়ীভাবে মুছে ফেলা হয়েছে!`, 'info');
    } else {
      addToast(`ব্রাঞ্চ '${branch}' মুছে ফেলা হয়েছে (প্রয়োজনে পুনরুদ্ধার করা যাবে)`, 'info');
    }

    setDeleteTarget(null);
  };

  const handleRestoreBranch = (code: string, branchName: string) => {
    if (onRestoreBranch) {
      onRestoreBranch(code);
      addToast(`ব্রাঞ্চ '${branchName}' সফলভাবে সক্রিয় তালিকায় পুনরুদ্ধার করা হয়েছে!`, 'success');
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allBranches, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sonali_all_branches_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('সম্পূর্ণ ব্রাঞ্চ তালিকা ডাউনলোড হয়েছে', 'success');
  };

  const handleExportCSV = () => {
    let csvContent = "\uFEFFকোড,শাখা,কর্মকর্তা,মোবাইল,এক্সটেনশন,ইমেইল,কাস্টম,স্ট্যাটাস\n";
    allList.forEach(b => {
      csvContent += `"${toBanglaDigits(b.code)}","${b.branch}","${b.name}","${b.mobile}","${b.ext}","${b.email}","${b.isCustom ? 'হ্যাঁ' : 'না'}","${b.isDeleted ? 'মুছে ফেলা' : 'সক্রিয়'}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonali_branches_${Date.now()}.csv`;
    link.click();
    addToast('ব্রাঞ্চ CSV ফাইল ডাউনলোড হয়েছে', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          onImportCustomBranches(parsed);
          addToast('কাস্টম ব্রাঞ্চসমূহ সফলভাবে ইম্পোর্ট হয়েছে!', 'success');
        } else {
          addToast('ফাইল ফরম্যাট সঠিক নয়', 'error');
        }
      } catch (err) {
        addToast('JSON ফাইলটি পড়া সম্ভব হয়নি', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Check if target branch is in current bill draft
  const isTargetInDraftBill = deleteTarget ? billItems.some(item => item.code === deleteTarget.code) : false;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors relative">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/30">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                ব্রাঞ্চ ও ডেটাবেজ ম্যানেজমেন্ট
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                  {toBanglaDigits(activeList.length)} টি সক্রিয়
                </span>
                {deletedList.length > 0 && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full font-mono">
                    {toBanglaDigits(deletedList.length)} টি মুছে ফেলা
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">নতুন ব্রাঞ্চ যোগ, এডিট, ডিলিট বা সম্পূর্ণ তালিকা পরিচালনা করুন</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="p-2 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl transition-all shadow-sm border border-emerald-200 dark:border-emerald-800/60"
              title="ব্রাঞ্চ ডিলিট ও ম্যানেজমেন্ট নির্দেশিকা"
            >
              <HelpCircle size={18} />
            </button>

            {!isAdding && (
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Plus size={16} />
                <span>নতুন ব্রাঞ্চ</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Collapsible Help & Deletion Guide Banner */}
        {showHelpGuide && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 p-4 animate-in slide-in-from-top duration-200">
            <div className="flex items-start justify-between gap-3 max-w-3xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl mt-0.5">
                  <Info size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 dark:text-amber-200 text-sm mb-1.5">
                    ব্রাঞ্চ ডিলিট ও ডেটাবেজ ম্যানেজমেন্ট সংক্রান্ত তথ্য ও নির্দেশিকা
                  </h4>
                  <ul className="text-xs text-amber-900/90 dark:text-amber-300/90 space-y-1.5 list-disc pl-4 font-medium leading-relaxed">
                    <li>
                      <strong>ব্রাঞ্চ ডিলিট করার নিয়ম:</strong> তালিকার যেকোনো শাখার ডানে থাকা লাল <strong>ট্র্যাশ (🗑️)</strong> আইকনে ক্লিক করে নিশ্চিত করলেই ব্রাঞ্চটি সাধারণ তালিকা ও সার্চ থেকে লুকানো হয়ে যাবে।
                    </li>
                    <li>
                      <strong>ভুলবশত ডিলিট হলে:</strong> চিন্তার কোনো কারণ নেই! উপরে <strong>'মুছে ফেলা ব্রাঞ্চ'</strong> ট্যাবে ক্লিক করে <strong>'পুনরুদ্ধার করুন' (🔄)</strong> বাটনে চাপ দিলেই শাখাটি সঙ্গে সঙ্গে সক্রিয় তালিকায় ফিরে আসবে।
                    </li>
                    <li>
                      <strong>পূর্বের সংরক্ষিত বিলের নিরাপত্তা:</strong> কোনো ব্রাঞ্চ ডিলিট করলেও পূর্বে সংরক্ষিত বিল বা মেমো ফাইলে কোনো প্রভাব পড়বে না।
                    </li>
                    <li>
                      <strong>ক্লাউড সিঙ্ক:</strong> আপনি গুগল লগইন অবস্থায় থাকলে ব্রাঞ্চের সকল ডিলিট বা পরিবর্তন সরাসরি ফায়ারবেস ক্লাউডে স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে।
                    </li>
                  </ul>
                </div>
              </div>
              <button 
                onClick={() => setShowHelpGuide(false)}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit Form View OR Branch List Table View */}
        {isAdding ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-emerald-50/30 to-white dark:from-gray-900/40 dark:to-gray-800 animate-in fade-in duration-200">
            {/* Sub-header for Form */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg">
                    {editingCode ? 'ব্রাঞ্চ তথ্য পরিবর্তন / সম্পাদনা' : 'নতুন শাখা / ব্রাঞ্চ যুক্ত করুন'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {editingCode ? `কোড: ${toBanglaDigits(editingCode)} এর তথ্য আপডেট করুন` : 'সঠিক তথ্য দিয়ে নতুন ব্রাঞ্চ ডেটাবেজে যুক্ত করুন'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingCode(null); }}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                ← তালিকায় ফিরে যান
              </button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              <form id="branch-form" onSubmit={handleFormSubmit} className="max-w-2xl mx-auto space-y-5">
                
                {/* Live Preview Card */}
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 size={13} /> লাইভ প্রিভিউ (তালিকার ডিসপ্লে)
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span>{formData.branch || 'শাখার নাম...'}</span>
                        <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-md font-mono">
                          কোড: {formData.code ? toBanglaDigits(formData.code) : '---'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-3">
                        <span>ইনচার্জ: {formData.name || 'কর্মকর্তার নাম...'}</span>
                        <span className="font-mono">মোবাইল: {formData.mobile ? toBanglaDigits(formData.mobile) : '---'}</span>
                      </div>
                    </div>
                    {formData.email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formData.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {/* Branch Code */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      ব্রাঞ্চ কোড <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: ৪৫৩ বা ৪৬৭"
                      disabled={!!editingCode}
                      value={toBanglaDigits(formData.code)}
                      onChange={(e) => setFormData({ ...formData, code: toEnglishDigits(e.target.value) })}
                      className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                    />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">সংখ্যায় ব্রাঞ্চ কোড লিখুন (যেমন: 453)</p>
                  </div>

                  {/* Branch Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      শাখার নাম <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: বাঙ্গরাবাজার (মেট্রো)"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium text-gray-900 dark:text-gray-100 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all"
                    />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">মেট্রো শাখা হলে নামের শেষে (মেট্রো) লিখুন</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {/* Incharge Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      কর্মকর্তা / ইনচার্জের নাম <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: আল ইসলাম"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium text-gray-900 dark:text-gray-100 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      মোবাইল নম্বর
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: ০১৬৩০-৮৫৭০০৯"
                      value={toBanglaDigits(formData.mobile)}
                      onChange={(e) => setFormData({ ...formData, mobile: toEnglishDigits(e.target.value) })}
                      className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium text-gray-900 dark:text-gray-100 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none font-mono transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                  {/* Extension */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      এক্সটেনশন (Ext)
                    </label>
                    <input
                      type="text"
                      placeholder="-"
                      value={toBanglaDigits(formData.ext)}
                      onChange={(e) => setFormData({ ...formData, ext: toEnglishDigits(e.target.value) })}
                      className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base text-center font-bold text-gray-900 dark:text-gray-100 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  {/* Official Email */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      অফিসিয়াল ইমেইল
                    </label>
                    <input
                      type="email"
                      placeholder="branch@sonalilife.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Form Actions Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-end gap-3 transition-colors">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingCode(null); }}
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                form="branch-form"
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Save size={18} />
                <span>{editingCode ? 'আপডেট সম্পন্ন করুন' : 'নতুন শাখা সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar: Search, Filters & Export/Import */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row gap-3 items-center justify-between transition-colors">
              {/* Search box */}
              <div className="relative w-full sm:max-w-xs">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="কোড, শাখা বা কর্মকর্তা দিয়ে ফিল্টার..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                {filter && (
                  <button onClick={() => setFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  সকল সক্রিয় ({toBanglaDigits(activeList.length)})
                </button>
                <button
                  onClick={() => setCategoryFilter('metro')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === 'metro'
                      ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  মেট্রো ({toBanglaDigits(metroList.length)})
                </button>
                <button
                  onClick={() => setCategoryFilter('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                    categoryFilter === 'custom'
                      ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Sparkles size={12} />
                  কাস্টম ({toBanglaDigits(customList.length)})
                </button>
                <button
                  onClick={() => setCategoryFilter('deleted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                    categoryFilter === 'deleted'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 shadow-sm border border-red-200 dark:border-red-900/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                  }`}
                >
                  <Trash2 size={12} />
                  মুছে ফেলা ({toBanglaDigits(deletedList.length)})
                </button>
              </div>

              {/* Export / Import buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-colors"
                  title="CSV ডাউনলোড করুন"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-colors"
                  title="JSON ব্যাকআপ নিন"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">JSON</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-colors"
                  title="কাস্টম ব্রাঞ্চ ফাইল ইম্পোর্ট করুন"
                >
                  <Upload size={13} />
                  <span className="hidden sm:inline">ইম্পোর্ট</span>
                </button>
              </div>
            </div>

            {/* Scrollable Branch Table */}
            <div className="flex-1 overflow-y-auto p-0 scroll-smooth">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead className="bg-gray-50/80 dark:bg-gray-900/80 sticky top-0 z-10 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 backdrop-blur-md">
                  <tr>
                    <th className="p-3.5 w-16 text-center">কোড</th>
                    <th className="p-3.5">শাখার নাম</th>
                    <th className="p-3.5">ইনচার্জ / কর্মকর্তা</th>
                    <th className="p-3.5 hidden sm:table-cell">মোবাইল</th>
                    <th className="p-3.5 hidden md:table-cell">ইমেইল</th>
                    <th className="p-3.5 text-right w-36">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredBranches.map((item) => (
                    <tr 
                      key={item.code} 
                      className={`hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors group ${
                        item.isDeleted ? 'bg-red-50/30 dark:bg-red-950/10 opacity-80' : ''
                      }`}
                    >
                      <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                        {toBanglaDigits(item.code)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold ${item.isDeleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                            {item.branch}
                          </span>
                          {item.isCustom && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                              কাস্টম
                            </span>
                          )}
                          {item.isDeleted && (
                            <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Trash2 size={10} /> মুছে ফেলা
                            </span>
                          )}
                        </div>
                        <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{item.mobile}</div>
                      </td>
                      <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">
                        {item.name}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400 font-mono hidden sm:table-cell">
                        {item.mobile}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-gray-400 text-xs truncate max-w-[140px] hidden md:table-cell">
                        {item.email || '-'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.isDeleted ? (
                            /* Actions for Deleted Branches: Restore & Permanent Delete */
                            <>
                              <button
                                onClick={() => handleRestoreBranch(item.code, item.branch)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-600 dark:bg-emerald-900/50 dark:hover:bg-emerald-600 text-emerald-800 hover:text-white dark:text-emerald-300 dark:hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                title="পুনরুদ্ধার করুন"
                              >
                                <RotateCcw size={13} />
                                <span>পুনরুদ্ধার</span>
                              </button>
                              {item.isCustom && (
                                <button
                                  onClick={() => promptDeleteBranch(item, true)}
                                  className="p-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 rounded-lg transition-all"
                                  title="স্থায়ীভাবে মুছে ফেলুন"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          ) : (
                            /* Actions for Active Branches: Add to bill, Edit, Delete */
                            <>
                              <button
                                onClick={() => onAddToBill(item.code, item)}
                                className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 rounded-lg transition-all"
                                title="বিলে যোগ করুন"
                              >
                                <Plus size={15} />
                              </button>
                              <button
                                onClick={() => handleStartEdit(item.code, item)}
                                className="p-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-blue-600 hover:text-white text-gray-600 dark:text-gray-300 rounded-lg transition-all"
                                title="এডিট করুন"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => promptDeleteBranch(item, false)}
                                className="p-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-red-600 hover:text-white text-gray-400 hover:text-white rounded-lg transition-all"
                                title="ব্রাঞ্চ মুছে ফেলুন"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredBranches.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400 dark:text-gray-500">
                        <Building2 size={40} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">
                          {categoryFilter === 'deleted' ? 'কোনো মুছে ফেলা ব্রাঞ্চ নেই' : 'কোনো ব্রাঞ্চ খুঁজে পাওয়া যায়নি'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 transition-colors">
              <div className="flex items-center gap-3">
                <span>প্রদর্শিত হচ্ছে {toBanglaDigits(filteredBranches.length)} টি ব্রাঞ্চ</span>
                {categoryFilter === 'deleted' && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    (যেগুলো মুছে ফেলা হয়েছে তা যেকোনো সময় পুনরুদ্ধার করা যাবে)
                  </span>
                )}
              </div>
              <button 
                onClick={onClose} 
                className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold border border-gray-200 dark:border-gray-700 transition-all shadow-sm"
              >
                বন্ধ করুন
              </button>
            </div>
          </>
        )}

        {/* In-App Safe Delete Confirmation Dialog (Iframe-safe, No window.confirm) */}
        {deleteTarget && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/60 p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {deleteTarget.isPermanent ? 'স্থায়ীভাবে ডিলিট নিশ্চিতকরণ' : 'ব্রাঞ্চ মুছে ফেলার নিশ্চিতকরণ'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    আপনি কি নিশ্চিত যে নিচের ব্রাঞ্চটি মুছে ফেলতে চান?
                  </p>
                </div>
              </div>

              {/* Branch Snapshot Box */}
              <div className="mt-4 p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">শাখার নাম:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{deleteTarget.branch}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">ব্রাঞ্চ কোড:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{toBanglaDigits(deleteTarget.code)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">কর্মকর্তা / ইনচার্জ:</span>
                  <span className="text-gray-700 dark:text-gray-300">{deleteTarget.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">মোবাইল:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">{deleteTarget.mobile}</span>
                </div>
              </div>

              {/* Warning if branch is currently in draft bill */}
              {isTargetInDraftBill && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>সতর্কতা:</strong> এই শাখাটি আপনার বর্তমান বিল তৈরির ড্রাফটে রয়েছে। এটি ডিলিট করলেও আপনার বর্তমান বিল ড্রাফট বা পূর্বের ডেটা মুছে যাবে না।
                  </span>
                </div>
              )}

              {deleteTarget.isPermanent ? (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ এটি একটি কাস্টম শাখা। স্থায়ীভাবে মুছে ফেললে ডেটাবেজ থেকে সম্পূর্ণ মুছে যাবে।
                </p>
              ) : (
                <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="shrink-0" />
                  ভুলবশত ডিলিট হলেও 'মুছে ফেলা ব্রাঞ্চ' ট্যাব থেকে যেকোনো সময় আবার ফিরিয়ে আনতে পারবেন।
                </p>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteExecution}
                  className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 transition-all active:scale-95"
                >
                  <Trash2 size={14} />
                  <span>{deleteTarget.isPermanent ? 'স্থায়ীভাবে মুছুন' : 'হ্যাঁ, মুছে ফেলুন'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BranchManagerModal;
