import React, { useRef } from 'react';
import { X, Database, Download, Upload, ShieldCheck, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { BillItem, SavedBill, BranchDatabase } from '../types';
import { toBanglaDigits } from '../constants';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBills: SavedBill[];
  draftBill: BillItem[];
  customBranches: BranchDatabase;
  onRestoreBackup: (data: { savedBills?: SavedBill[]; customBranches?: BranchDatabase; draftBill?: BillItem[] }) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  savedBills,
  draftBill,
  customBranches,
  onRestoreBackup,
  addToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportFullBackup = () => {
    const backupObj = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      savedBills,
      draftBill,
      customBranches,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sonali_life_full_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast('সম্পূর্ণ সিস্টেম ব্যাকআপ JSON ডাউনলোড হয়েছে!', 'success');
  };

  const handleExportAllBillsCSV = () => {
    let csvContent = "\uFEFFবিল আইডি,বিলের নাম,তারিখ,মোট ব্রাঞ্চ,মোট টাকা\n";
    savedBills.forEach(bill => {
      let count = 0;
      try { count = JSON.parse(bill.items).length; } catch (e) {}
      csvContent += `"${bill.id}","${bill.name}","${new Date(bill.createdAt).toLocaleDateString('bn-BD')}","${toBanglaDigits(count)}","${toBanglaDigits(bill.totalAmount || 0)}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonali_saved_bills_${Date.now()}.csv`;
    link.click();

    addToast('সকল বিলের CSV রিপোর্ট ডাউনলোড হয়েছে!', 'success');
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.savedBills || parsed.customBranches || parsed.draftBill)) {
          onRestoreBackup(parsed);
          addToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!', 'success');
          onClose();
        } else {
          addToast('সঠিক ব্যাকআপ ফাইল নয়', 'error');
        }
      } catch (err) {
        addToast('ব্যাকআপ ফাইলটি পড়া যায়নি', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/30">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">ডাটা ব্যাকআপ ও রিস্টোর</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">আপনার তৈরি করা সকল বিল ও কাস্টম ব্রাঞ্চ ব্যাকআপ রাখুন</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Card 1: Full JSON Backup */}
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" />
                সম্পূর্ণ সিস্টেম ব্যাকআপ (JSON)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                সকল সংরক্ষিত বিল ({toBanglaDigits(savedBills.length)}টি), ড্রাফট ও কাস্টম ব্রাঞ্চ একসাথে সংরক্ষণ
              </p>
            </div>
            <button
              onClick={handleExportFullBackup}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Download size={14} />
              ডাউনলোড
            </button>
          </div>

          {/* Card 2: Excel / CSV Report */}
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <FileSpreadsheet size={16} className="text-blue-600" />
                সংরক্ষিত বিলের এক্সেল/CSV রিপোর্ট
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                এক্সেল শিটে দেখার উপযোগী সম্পূর্ণ বিল সারাংশ
              </p>
            </div>
            <button
              onClick={handleExportAllBillsCSV}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Download size={14} />
              CSV ফাইল
            </button>
          </div>

          {/* Card 3: Restore */}
          <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <RefreshCw size={16} className="text-emerald-600" />
                ব্যাকআপ ফাইল থেকে রিস্টোর
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                পূর্বে সেভ করা JSON ব্যাকআপ ফাইল আপলোড করুন
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-gray-700 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Upload size={14} />
              রিস্টোর করুন
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-end transition-colors">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-all shadow-sm"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};

export default DataBackupModal;
