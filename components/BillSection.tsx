import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Trash2, 
  AlertCircle, 
  Plus, 
  Eraser, 
  RotateCcw as ResetIcon, 
  Check, 
  X as CloseIcon, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  User, 
  Save, 
  FolderOpen, 
  Download, 
  Eye, 
  Sliders, 
  Share2, 
  Calculator,
  QrCode
} from 'lucide-react';
import { BRANCH_DATABASE, DEFAULT_VOUCHER_CONFIG, toBanglaDigits, toEnglishDigits } from '../constants';
import { BillItem, BranchDatabase, VoucherConfig } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import SavedBillsModal from './SavedBillsModal';
import PrintPreviewModal from './PrintPreviewModal';
import VoucherSettingsModal from './VoucherSettingsModal';
import SaveBillModal from './SaveBillModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface BillSectionProps {
  billItems: BillItem[];
  setBillItems: React.Dispatch<React.SetStateAction<BillItem[]>>;
  totalAmount: number;
  user: FirebaseUser | null;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  lastSaved?: Date | null;
  onSave?: () => Promise<void>;
  branchesMap?: BranchDatabase;
  voucherConfig?: VoucherConfig;
  onUpdateVoucherConfig?: (config: VoucherConfig) => void;
  onOpenMergeBills?: () => void;
  onOpenTracking?: (trackingId?: string) => void;
}

const BillSection: React.FC<BillSectionProps> = ({ 
  billItems, 
  setBillItems, 
  totalAmount, 
  user, 
  addToast, 
  lastSaved, 
  onSave,
  branchesMap = BRANCH_DATABASE,
  voucherConfig = DEFAULT_VOUCHER_CONFIG,
  onUpdateVoucherConfig,
  onOpenMergeBills,
  onOpenTracking
}) => {
  const [inputCodes, setInputCodes] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [notFoundCodes, setNotFoundCodes] = useState<string[]>([]);
  
  // Modal states
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavedBillsModalOpen, setIsSavedBillsModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isVoucherSettingsOpen, setIsVoucherSettingsOpen] = useState(false);

  type SortField = 'branch' | 'serial' | 'amount' | null;
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Keyboard shortcut Ctrl+S for bill save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (billItems.length > 0) {
          setIsSaveModalOpen(true);
        } else {
          addToast('সেভ করার মতো কোনো শাখা আইটেম নেই', 'info');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [billItems.length, addToast]);

  // Auto-reset confirmation buttons after 3 seconds
  useEffect(() => {
    let timer: number;
    if (isConfirmingClear) {
      timer = window.setTimeout(() => setIsConfirmingClear(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [isConfirmingClear]);

  useEffect(() => {
    let timer: number;
    if (isConfirmingReset) {
      timer = window.setTimeout(() => setIsConfirmingReset(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [isConfirmingReset]);

  const handleGenerateList = () => {
    if (!inputCodes.trim()) return;

    setLoading(true);
    setNotFoundCodes([]);
    
    const codes = inputCodes.split(/[\s,]+/).map(c => toEnglishDigits(c.trim())).filter(c => c);
    
    setTimeout(() => {
      const newItems: BillItem[] = [];
      const missing: string[] = [];
      const duplicates: string[] = [];

      codes.forEach(code => {
        const branchData = branchesMap[code] || BRANCH_DATABASE[code];
        if (branchData) {
          if (billItems.some(item => item.code === code) || newItems.some(item => item.code === code)) {
            duplicates.push(toBanglaDigits(code));
          } else {
            newItems.push({
              ...branchData,
              code: code,
              serial: '',
              amount: '',
              calculation: ''
            });
          }
        } else {
          missing.push(toBanglaDigits(code));
        }
      });

      setBillItems(prev => [...prev, ...newItems]);
      setNotFoundCodes(missing);
      setInputCodes('');
      setLoading(false);
      
      if (duplicates.length > 0) {
        addToast(`ইতোমধ্যে লিস্টে আছে: ${duplicates.join(', ')}`, 'info');
      }
      if (newItems.length > 0) {
        addToast(`${toBanglaDigits(newItems.length)} টি ব্রাঞ্চ যোগ করা হয়েছে`, 'success');
      }
    }, 200);
  };

  const handleInputChange = (index: number, field: 'serial' | 'amount' | 'calculation', value: string) => {
    const newItems = [...billItems];
    newItems[index][field] = value;

    // Auto-calculate amount if calculation field changed
    if (field === 'calculation') {
      try {
        const englishCalc = toEnglishDigits(value);
        if (/^[0-9+\-*/.\s()]+$/.test(englishCalc) && englishCalc.trim() !== '') {
          // eslint-disable-next-line no-eval
          const result = Function(`'use strict'; return (${englishCalc})`)();
          if (typeof result === 'number' && !isNaN(result)) {
            newItems[index].amount = Math.round(result).toString();
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    setBillItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = billItems.filter((_, i) => i !== index);
    setBillItems(newItems);
  };

  const handleClearAll = () => {
    if (isConfirmingClear) {
      setBillItems([]);
      setNote('');
      setIsConfirmingClear(false);
      addToast('সব ব্রাঞ্চ মুছে ফেলা হয়েছে', 'info');
    } else {
      setIsConfirmingClear(true);
    }
  };

  const handleResetData = () => {
    if (isConfirmingReset) {
      const resetItems = billItems.map(item => ({ ...item, serial: '', amount: '', calculation: '' }));
      setBillItems(resetItems);
      setIsConfirmingReset(false);
      addToast('সিরিয়াল ও টাকার ঘর রিসেট করা হয়েছে', 'info');
    } else {
      setIsConfirmingReset(true);
    }
  };

  const handleSort = (field: SortField) => {
    if (!field) return;
    const isAsc = sortField === field && sortOrder === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    
    setSortField(field);
    setSortOrder(newOrder);

    const sorted = [...billItems].sort((a, b) => {
      if (field === 'branch') {
        return newOrder === 'asc' 
          ? a.branch.localeCompare(b.branch, 'bn')
          : b.branch.localeCompare(a.branch, 'bn');
      }
      if (field === 'serial') {
        const numA = parseInt(toEnglishDigits(a.serial || '0'), 10) || 0;
        const numB = parseInt(toEnglishDigits(b.serial || '0'), 10) || 0;
        return newOrder === 'asc' ? numA - numB : numB - numA;
      }
      if (field === 'amount') {
        const numA = parseFloat(toEnglishDigits(a.amount || '0')) || 0;
        const numB = parseFloat(toEnglishDigits(b.amount || '0')) || 0;
        return newOrder === 'asc' ? numA - numB : numB - numA;
      }
      return 0;
    });

    setBillItems(sorted);
  };

  const moveItemUp = (idx: number) => {
    if (idx === 0) return;
    const newItems = [...billItems];
    const temp = newItems[idx - 1];
    newItems[idx - 1] = newItems[idx];
    newItems[idx] = temp;
    setBillItems(newItems);
  };

  const moveItemDown = (idx: number) => {
    if (idx === billItems.length - 1) return;
    const newItems = [...billItems];
    const temp = newItems[idx + 1];
    newItems[idx + 1] = newItems[idx];
    newItems[idx] = temp;
    setBillItems(newItems);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sonali Life Insurance - Bill Voucher', 14, 20);
    
    const tableColumn = ["#", "Code", "Branch", "Name", "Mobile", "Serial", "Amount (Tk)"];
    const tableRows = billItems.map((item, idx) => [
      idx + 1,
      item.code,
      item.branch,
      item.name,
      item.mobile || '-',
      item.serial || '-',
      item.amount || '0'
    ]);

    // @ts-ignore
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [40, 167, 69] },
      foot: [['', '', '', '', '', 'Total:', totalAmount.toString()]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`sonali_life_bill_${Date.now()}.pdf`);
    addToast('PDF ফাইল ডাউনলোড হচ্ছে...', 'success');
  };

  const handleDownloadCSV = () => {
    let content = "\uFEFFক্রমিক,কোড,শাখা,কর্মকর্তা,মোবাইল,সিরিয়াল নং,টাকা\n";
    billItems.forEach((item, idx) => {
      content += `"${toBanglaDigits(idx + 1)}","${toBanglaDigits(item.code)}","${item.branch}","${item.name}","${toBanglaDigits(item.mobile || '')}","${toBanglaDigits(item.serial || '')}","${toBanglaDigits(item.amount || '0')}"\n`;
    });
    content += `,,,,,"সর্বমোট=","${toBanglaDigits(totalAmount)}"\n`;

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonali_bill_${Date.now()}.csv`;
    link.click();
    addToast('Excel/CSV ফাইল ডাউনলোড সম্পন্ন হয়েছে', 'success');
  };

  const handleCopySummaryWhatsApp = () => {
    let msg = `*সোনালী লাইফ ইন্স্যুরেন্স - পেমেন্ট ভাউচার সারসংক্ষেপ*\n`;
    msg += `তারিখ: ${new Date().toLocaleDateString('bn-BD')}\n`;
    msg += `মোট শাখা: ${toBanglaDigits(billItems.length)} টি | সর্বমোট: ৳${toBanglaDigits(totalAmount)}\n\n`;
    billItems.forEach((item, idx) => {
      msg += `${toBanglaDigits(idx + 1)}. ${item.branch} (${toBanglaDigits(item.code)}) - ${item.name}: ৳${toBanglaDigits(item.amount || '0')}\n`;
    });
    if (note) {
      msg += `\n*নোট:* ${note}\n`;
    }

    navigator.clipboard.writeText(msg).then(() => {
      addToast('হোয়াটসঅ্যাপ সামারি ক্লিপবোর্ডে কপি করা হয়েছে!', 'success');
    }).catch(() => {
      addToast('ক্লিপবোর্ডে কপি করতে সমস্যা হয়েছে', 'error');
    });
  };

  const handleSaveBill = () => {
    if (billItems.length === 0) {
      addToast('সেভ করার মতো কোনো শাখা আইটেম নেই', 'error');
      return;
    }
    setIsSaveModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-7 rounded-3xl shadow-xl border border-emerald-100 dark:border-gray-700 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-700 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-orange-500 text-white w-9 h-9 flex items-center justify-center rounded-2xl font-bold shadow-md shadow-orange-500/20">২</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">বিল / তালিকা তৈরি <span className="text-base font-semibold text-orange-600 dark:text-orange-400 font-sans">(Custom List)</span></h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">একাধিক শাখা কোড দিয়ে দ্রুত বিল শিট তৈরি করুন</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {onOpenTracking && (
              <button 
                onClick={() => onOpenTracking(voucherConfig.trackingId)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl font-bold text-xs transition-all border border-emerald-200 dark:border-emerald-800 shadow-sm active:scale-95"
                title="বিলের কিউআর কোড ও অনলাইন ট্র্যাকিং স্ট্যাটাস"
              >
                <QrCode size={15} />
                <span>কিউআর ট্র্যাকিং</span>
              </button>
            )}

            <button 
              onClick={() => setIsVoucherSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-xl font-bold text-xs transition-all border border-purple-200 dark:border-purple-800"
              title="নোট শীট ও সাক্ষর কাস্টমাইজেশন"
            >
              <Sliders size={15} />
              <span>ভাউচার ফরম্যাট</span>
            </button>

            <button 
              onClick={() => setIsSavedBillsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl font-bold text-xs transition-all border border-blue-200 dark:border-blue-800"
            >
              <FolderOpen size={15} />
              <span>সেভ করা বিল</span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 font-bold text-xs sm:text-sm mb-2">
            বাল্ক কোড ইনপুট (কমা, স্পেস বা নতুন লাইনে কোড লিখুন)
          </label>
          <div className="relative">
            <textarea
                value={inputCodes}
                onChange={(e) => setInputCodes(e.target.value)}
                placeholder="যেমন: ৩৪১, ২৮৫, ১৮৫, ২৮৪, ৪৫৩..."
                className="w-full h-24 p-4 border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-2xl focus:border-orange-500 dark:focus:border-orange-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all resize-none text-base sm:text-lg font-mono font-medium"
            />
            {inputCodes && (
                <button 
                    onClick={() => setInputCodes('')}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                    title="ক্লিয়ার করুন"
                >
                    <Eraser size={16} />
                </button>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerateList}
          disabled={loading || !inputCodes.trim()}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          {loading ? 'প্রসেসিং হচ্ছে...' : <><Plus size={20} /> তালিকায় যোগ করুন</>}
        </button>
        
        {notFoundCodes.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-2 text-xs sm:text-sm border border-red-200 dark:border-red-800/50 animate-in fade-in">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>পাওয়া যায়নি এমন কোড: {notFoundCodes.join(', ')}</span>
            </div>
        )}
      </div>

      {/* Bill Table Card */}
      {billItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-7 rounded-3xl shadow-xl border border-emerald-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    পেমেন্ট তালিকা
                  </h3>
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">
                    {toBanglaDigits(billItems.length)} টি শাখা
                  </span>
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">
                    সর্বমোট: ৳{toBanglaDigits(totalAmount)}
                  </span>
                </div>
                {lastSaved && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      অটো-সেভ: {lastSaved.toLocaleTimeString('bn-BD')}
                    </span>
                )}
            </div>
            
            {/* Toolbar Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                {/* Save Draft Button */}
                {onSave && (
                    <button 
                      onClick={onSave}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs active:scale-95"
                      title="অটো ড্রাফট সেভ করুন"
                    >
                        <Save size={14} /> 
                        <span className="hidden sm:inline">ড্রাফট সেভ</span>
                    </button>
                )}

                {/* Save Named Bill Button */}
                <button 
                  onClick={handleSaveBill}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs active:scale-95"
                  title="বিল অনলাইন বা লোকাল ডাটাবেজে সংরক্ষণ করুন (Ctrl + S)"
                >
                    <Save size={14} /> 
                    <span>সেভ করুন</span>
                </button>

                {/* WhatsApp Share */}
                <button 
                  onClick={handleCopySummaryWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs active:scale-95"
                  title="হোয়াটসঅ্যাপ মেসেজ ফরম্যাট কপি করুন"
                >
                    <Share2 size={14} />
                    <span className="hidden sm:inline">শেয়ার</span>
                </button>

                {/* 2-Step Reset Button */}
                <button 
                  onClick={handleResetData} 
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shadow-sm font-bold text-xs border ${
                    isConfirmingReset 
                    ? 'bg-amber-500 text-white border-amber-600 scale-105' 
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                  }`}
                >
                    {isConfirmingReset ? <><Check size={14} /> নিশ্চিত?</> : <><ResetIcon size={14} /> রিসেট</>}
                </button>

                {/* 2-Step Clear All Button */}
                <button 
                  onClick={handleClearAll} 
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shadow-sm font-bold text-xs border ${
                    isConfirmingClear 
                    ? 'bg-red-600 text-white border-red-700 scale-105 animate-pulse' 
                    : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-600 hover:text-white'
                  }`}
                >
                    {isConfirmingClear ? <><Check size={14} /> মুছবেন?</> : <><Trash2 size={14} /> সব মুছুন</>}
                </button>

                <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-700 mx-0.5 hidden sm:block"></div>
                
                {/* Print Preview Button (Opens interactive modal) */}
                <button 
                  onClick={() => setIsPrintPreviewOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-md shadow-purple-600/20 font-bold text-xs active:scale-95"
                >
                    <Eye size={14} /> 
                    <span>প্রিভিউ ও প্রিন্ট <span className="font-sans font-normal opacity-90">(Print)</span></span>
                </button>

                <button 
                  onClick={handleDownloadPDF} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs active:scale-95 font-sans"
                  title="PDF ডাউনলোড"
                >
                    <Download size={14} /> 
                    <span className="hidden sm:inline">PDF ডাউনলোড</span>
                </button>

                <button 
                  onClick={handleDownloadCSV} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs active:scale-95 font-sans"
                  title="Excel / CSV ডাউনলোড"
                >
                    <FileSpreadsheet size={14} /> 
                    <span className="hidden sm:inline">Excel ডাউনলোড</span>
                </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th 
                    className="p-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    onClick={() => handleSort('branch')}
                  >
                    <div className="flex items-center gap-1">
                      <span>বিবরণ (শাখা ও কর্মকর্তা)</span>
                      <span className="text-gray-400 group-hover:text-emerald-600">
                        {sortField === 'branch' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="p-3.5 w-28 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    onClick={() => handleSort('serial')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>সিরিয়াল নং</span>
                      <span className="text-gray-400 group-hover:text-emerald-600">
                        {sortField === 'serial' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th className="p-3.5 w-36 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400">
                      <Calculator size={13} />
                      <span>লাইভ হিসাব (+ - * /)</span>
                    </div>
                  </th>
                  <th 
                    className="p-3.5 w-32 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>টাকা (৳)</span>
                      <span className="text-gray-400 group-hover:text-emerald-600">
                        {sortField === 'amount' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th className="p-3.5 w-24 text-center">ক্রম / অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {billItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors group">
                    <td className="p-3.5 text-gray-400 font-bold text-xs text-center font-mono">
                      {toBanglaDigits(idx + 1)}
                    </td>
                    <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] font-mono border border-emerald-100 dark:border-emerald-900/40">
                                  {toBanglaDigits(item.code)}
                                </span>
                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                  {item.branch}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <User size={12} className="text-gray-400 shrink-0" />
                                <span className="truncate max-w-[160px] sm:max-w-none">{item.name}</span>
                                {item.mobile && (
                                  <span className="font-mono text-gray-400 text-[11px]">({item.mobile})</span>
                                )}
                            </div>
                        </div>
                    </td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={toBanglaDigits(item.serial || '')}
                        onChange={(e) => handleInputChange(idx, 'serial', toEnglishDigits(e.target.value))}
                        placeholder="-"
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-xs sm:text-sm focus:border-emerald-500 outline-none bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-medium"
                      />
                    </td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={item.calculation || ''}
                        onChange={(e) => handleInputChange(idx, 'calculation', e.target.value)}
                        placeholder="যেমন: 500+250"
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-xs font-mono focus:border-blue-500 outline-none bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                        title="এখানে যোগ বিয়োগ গুণ ভাগ লিখলে টাকায় স্বয়ংক্রিয়ভাবে হিসাব হবে"
                      />
                    </td>
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={toBanglaDigits(item.amount || '')}
                        onChange={(e) => handleInputChange(idx, 'amount', toEnglishDigits(e.target.value))}
                        placeholder="০"
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-right font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none bg-gray-50/50 dark:bg-gray-900 font-mono"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                            <button 
                                onClick={() => moveItemUp(idx)}
                                disabled={idx === 0}
                                className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all disabled:opacity-20"
                                title="উপরে নিন"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button 
                                onClick={() => moveItemDown(idx)}
                                disabled={idx === billItems.length - 1}
                                className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all disabled:opacity-20"
                                title="নিচে নিন"
                            >
                                <ArrowDown size={14} />
                            </button>
                            <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                            <button 
                                onClick={() => removeItem(idx)}
                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                                title="মুছে ফেলুন"
                            >
                                <CloseIcon size={14} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50/60 dark:bg-emerald-950/30 font-bold border-t border-emerald-100 dark:border-emerald-900/40">
                <tr>
                    <td colSpan={4} className="p-4 text-right text-gray-600 dark:text-gray-400 text-xs sm:text-sm uppercase tracking-wider">
                      সর্বমোট বিলের পরিমাণ:
                    </td>
                    <td className="p-4 text-right text-emerald-800 dark:text-emerald-300 text-lg sm:text-xl font-black font-mono">
                      ৳{toBanglaDigits(totalAmount)}
                    </td>
                    <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-600 text-white w-6 h-6 flex items-center justify-center rounded-lg font-bold text-xs">৩</span>
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                বিশেষ নোট <span className="text-xs text-gray-500 font-sans font-normal">(Optional)</span>
              </h3>
            </div>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="বিল সম্পর্কিত কোনো বিশেষ মন্তব্য বা নোট থাকলে এখানে লিখুন (প্রিন্ট কপিতে প্রদর্শিত হবে)..."
                className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-emerald-500 outline-none text-xs sm:text-sm min-h-[90px] bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-all"
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <SavedBillsModal 
        isOpen={isSavedBillsModalOpen}
        onClose={() => setIsSavedBillsModalOpen(false)}
        userId={user?.uid}
        onLoadBill={(items) => {
          setBillItems(items);
          addToast('বিল সফলভাবে লোড হয়েছে!', 'success');
        }}
        onOpenMerge={onOpenMergeBills}
        onOpenTracking={onOpenTracking}
      />

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        billItems={billItems}
        totalAmount={totalAmount}
        note={note}
        config={voucherConfig}
        addToast={addToast}
      />

      <VoucherSettingsModal
        isOpen={isVoucherSettingsOpen}
        onClose={() => setIsVoucherSettingsOpen(false)}
        config={voucherConfig}
        addToast={addToast}
        onSaveConfig={(cfg) => {
          if (onUpdateVoucherConfig) {
            onUpdateVoucherConfig(cfg);
          }
          addToast('ভাউচার ফরম্যাট সফলভাবে সংরক্ষিত হয়েছে!', 'success');
        }}
      />

      <SaveBillModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        billItems={billItems}
        totalAmount={totalAmount}
        note={note}
        voucherConfig={voucherConfig}
        user={user}
        onBillSaved={(savedBill) => {
          if (onUpdateVoucherConfig && savedBill.trackingId) {
            onUpdateVoucherConfig({
              ...voucherConfig,
              trackingId: savedBill.trackingId,
              status: savedBill.status || 'draft',
            });
          }
        }}
        addToast={addToast}
      />
    </div>
  );
};

export default BillSection;
