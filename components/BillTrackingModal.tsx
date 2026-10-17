import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Send, 
  BadgeCheck, 
  Banknote, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { BillItem, BillStatus, SavedBill, VoucherConfig } from '../types';
import { toBanglaDigits, formatCurrency } from '../constants';
import { BILL_STATUS_MAP, generateQrDataUrl, generateQrPayload } from '../utils/qrTracker';

interface BillTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBills: SavedBill[];
  currentBillItems: BillItem[];
  currentTotal: number;
  currentConfig: VoucherConfig;
  onLoadBillToEditor: (items: BillItem[], config?: VoucherConfig, name?: string) => void;
  onOpenPrintPreview: (items: BillItem[], total: number, config: VoucherConfig) => void;
  onUpdateBillStatus?: (billId: string, newStatus: BillStatus) => void;
  initialTrackingId?: string;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BillTrackingModal: React.FC<BillTrackingModalProps> = ({
  isOpen,
  onClose,
  savedBills,
  currentBillItems,
  currentTotal,
  currentConfig,
  onLoadBillToEditor,
  onOpenPrintPreview,
  onUpdateBillStatus,
  initialTrackingId,
  addToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackingId, setSelectedTrackingId] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Derive all trackable bills (including saved bills + active current draft)
  const trackableBills = useMemo(() => {
    const list: Array<{
      trackingId: string;
      title: string;
      status: BillStatus;
      date: string;
      items: BillItem[];
      totalAmount: number;
      config: VoucherConfig;
      billId?: string;
      isCurrentDraft?: boolean;
      updatedAt?: string;
    }> = [];

    // Add current active bill in editor if it has items
    if (currentBillItems.length > 0) {
      const currentTrackId = currentConfig.trackingId || 'SLI-CURRENT-DRAFT';
      list.push({
        trackingId: currentTrackId,
        title: 'বর্তমান এডিটরের বিল (Active Draft)',
        status: currentConfig.status || 'draft',
        date: currentConfig.date || new Date().toLocaleDateString('bn-BD'),
        items: currentBillItems,
        totalAmount: currentTotal,
        config: { ...currentConfig, trackingId: currentTrackId },
        isCurrentDraft: true,
      });
    }

    // Add all saved bills
    savedBills.forEach(sb => {
      let parsedItems: BillItem[] = [];
      try {
        parsedItems = JSON.parse(sb.items);
      } catch (e) {
        parsedItems = [];
      }

      let parsedConfig: VoucherConfig = { ...currentConfig };
      if (sb.voucherConfig) {
        try {
          parsedConfig = { ...parsedConfig, ...JSON.parse(sb.voucherConfig) };
        } catch (e) {}
      }

      const billTrackId = sb.trackingId || `SLI-${sb.id.slice(0, 8).toUpperCase()}`;
      parsedConfig.trackingId = billTrackId;
      parsedConfig.status = sb.status || 'approved';

      list.push({
        trackingId: billTrackId,
        title: sb.name,
        status: sb.status || 'approved',
        date: parsedConfig.date || new Date(sb.createdAt).toLocaleDateString('bn-BD'),
        items: parsedItems,
        totalAmount: sb.totalAmount || parsedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
        config: parsedConfig,
        billId: sb.id,
        updatedAt: sb.updatedAt || sb.createdAt,
      });
    });

    return list;
  }, [savedBills, currentBillItems, currentTotal, currentConfig]);

  // Set initial selected bill on open or initialTrackingId change
  useEffect(() => {
    if (!isOpen) return;

    if (initialTrackingId) {
      setSearchQuery(initialTrackingId);
      const match = trackableBills.find(b => 
        b.trackingId.toLowerCase() === initialTrackingId.toLowerCase() || 
        b.billId === initialTrackingId
      );
      if (match) {
        setSelectedTrackingId(match.trackingId);
        return;
      }
    }

    if (trackableBills.length > 0 && !selectedTrackingId) {
      setSelectedTrackingId(trackableBills[0].trackingId);
    }
  }, [isOpen, initialTrackingId, trackableBills, selectedTrackingId]);

  // Current active matched bill
  const activeBill = useMemo(() => {
    if (!selectedTrackingId) return trackableBills[0] || null;
    return trackableBills.find(b => b.trackingId === selectedTrackingId) || trackableBills[0] || null;
  }, [selectedTrackingId, trackableBills]);

  // Generate QR Code data URL whenever active bill changes
  useEffect(() => {
    if (!activeBill) {
      setQrCodeUrl('');
      return;
    }

    const payload = generateQrPayload(
      activeBill.trackingId,
      activeBill.totalAmount,
      activeBill.items.length,
      activeBill.config.subject || 'শাখা বিল',
      activeBill.config.refNo || 'SLICL/HO/EXP',
      activeBill.date,
      activeBill.status
    );

    generateQrDataUrl(payload, 300).then(url => {
      setQrCodeUrl(url);
    });
  }, [activeBill]);

  // Filter bills based on search query
  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return trackableBills;
    const q = searchQuery.toLowerCase().trim();
    return trackableBills.filter(b => 
      b.trackingId.toLowerCase().includes(q) ||
      b.title.toLowerCase().includes(q) ||
      (b.billId && b.billId.toLowerCase().includes(q)) ||
      b.items.some(item => item.branch.toLowerCase().includes(q) || item.name.toLowerCase().includes(q))
    );
  }, [trackableBills, searchQuery]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!activeBill) return;
    const origin = window.location.origin || 'https://sonalilife.com';
    const link = `${origin}/?track=${encodeURIComponent(activeBill.trackingId)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    addToast('অনলাইন ট্র্যাকিং লিংক কপি হয়েছে!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyTrackingId = () => {
    if (!activeBill) return;
    navigator.clipboard.writeText(activeBill.trackingId);
    setCopiedId(true);
    addToast('ট্র্যাকিং আইডি কপি হয়েছে', 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl || !activeBill) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR_${activeBill.trackingId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('QR কোড ইমেজ ডাউনলোড হয়েছে', 'success');
  };

  const handleStatusChange = (newStatus: BillStatus) => {
    if (!activeBill) return;
    if (activeBill.billId && onUpdateBillStatus) {
      onUpdateBillStatus(activeBill.billId, newStatus);
      addToast(`স্ট্যাটাস পরিবর্তন করা হয়েছে: ${BILL_STATUS_MAP[newStatus].label}`, 'success');
    } else {
      activeBill.status = newStatus;
      activeBill.config.status = newStatus;
      addToast(`স্ট্যাটাস আপডেট হয়েছে: ${BILL_STATUS_MAP[newStatus].label}`, 'info');
    }
  };

  const currentStep = activeBill ? BILL_STATUS_MAP[activeBill.status]?.step || 1 : 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col border border-emerald-100 dark:border-gray-800 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-gray-900 dark:to-teal-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md shadow-emerald-600/30">
              <QrCode size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  বিল ট্র্যাকিং ও কিউআর কোড ভেরিফিকেশন
                </h2>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                  লাইভ সিস্টেম
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                যেকোনো বিলের ট্র্যাকিং আইডি বা QR কোড স্ক্যান করে তাৎক্ষণিক স্ট্যাটাস ও তথ্য জানুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 bg-gray-50/80 dark:bg-gray-850 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ট্র্যাকিং আইডি (যেমন: SLI-2026-...), বিলের নাম বা ব্রাঞ্চ লিখে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs sm:text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                মুছুন
              </button>
            )}
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3.5 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 whitespace-nowrap shadow-sm">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>মোট ট্র্যাকযোগ্য বিল: <strong>{toBanglaDigits(trackableBills.length)}</strong> টি</span>
          </div>
        </div>

        {/* Content Body: Left List + Right Active Details */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left Column: Bills Selection List (5 cols) */}
          <div className="lg:col-span-4 border-r border-gray-100 dark:border-gray-800 overflow-y-auto max-h-[320px] lg:max-h-full bg-gray-50/40 dark:bg-gray-900/40 p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 pt-1">
              ট্র্যাকিং তালিকা ({toBanglaDigits(filteredBills.length)})
            </p>

            {filteredBills.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <AlertCircle size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">কোনো বিল খুঁজে পাওয়া যায়নি</p>
              </div>
            ) : (
              filteredBills.map((bill) => {
                const isSelected = activeBill?.trackingId === bill.trackingId;
                const statusMeta = BILL_STATUS_MAP[bill.status] || BILL_STATUS_MAP.draft;

                return (
                  <button
                    key={bill.trackingId}
                    onClick={() => setSelectedTrackingId(bill.trackingId)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
                        {bill.trackingId}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}>
                        {statusMeta.label.split(' ')[0]}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                      {bill.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                      <span>{toBanglaDigits(bill.items.length)} টি ব্রাঞ্চ</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        ৳{formatCurrency(bill.totalAmount.toString())}/-
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Active Bill Deep Tracking & Verification (8 cols) */}
          <div className="lg:col-span-8 p-4 sm:p-6 overflow-y-auto bg-white dark:bg-gray-900 space-y-6">
            
            {activeBill ? (
              <>
                {/* Top Status & Verification Banner */}
                <div className="bg-gradient-to-br from-gray-50 to-emerald-50/40 dark:from-gray-800/80 dark:to-emerald-950/20 p-4 sm:p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  {/* Left info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-emerald-600 text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl shadow-sm">
                        {activeBill.trackingId}
                      </span>
                      <button
                        onClick={handleCopyTrackingId}
                        className="text-gray-400 hover:text-emerald-600 transition-colors p-1"
                        title="ট্র্যাকিং আইডি কপি করুন"
                      >
                        {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${BILL_STATUS_MAP[activeBill.status]?.badgeClass}`}>
                        {BILL_STATUS_MAP[activeBill.status]?.label}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                      {activeBill.title}
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      তারিখ: <strong className="text-gray-700 dark:text-gray-300">{activeBill.date}</strong> | বিষয়: {activeBill.config.subject || 'শাখা বিল'}
                    </p>
                  </div>

                  {/* QR Code Preview Thumbnail */}
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm self-stretch md:self-auto justify-between md:justify-start">
                    {qrCodeUrl ? (
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code" 
                        className="w-16 h-16 rounded-lg border border-gray-100" 
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode size={24} className="text-gray-400" />
                      </div>
                    )}
                    <div className="space-y-1 text-right">
                      <button
                        onClick={handleDownloadQr}
                        className="flex items-center gap-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all"
                      >
                        <Download size={13} />
                        <span>QR ডাউনলোড</span>
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-1 text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all"
                      >
                        {copiedLink ? <Check size={13} /> : <ExternalLink size={13} />}
                        <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক শেয়ার'}</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* 4-Step Lifecycle Status Stepper */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-3xl border border-gray-200/80 dark:border-gray-750 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                      <Clock size={15} className="text-emerald-600" />
                      <span>বিলের বর্তমান জীবনচক্র ও অগ্রগতি</span>
                    </h4>

                    {/* Status Changer Select */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 hidden sm:inline">স্ট্যাটাস পরিবর্তন:</span>
                      <select
                        value={activeBill.status}
                        onChange={(e) => handleStatusChange(e.target.value as BillStatus)}
                        className="text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="draft">🟡 খসড়া (Draft)</option>
                        <option value="dispatched">🔵 প্রেরিত (Dispatched)</option>
                        <option value="approved">🟣 অনুমোদিত (Approved)</option>
                        <option value="paid">🟢 পরিশোধিত (Paid)</option>
                      </select>
                    </div>
                  </div>

                  {/* Stepper Visuals */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2">
                    {[
                      { key: 'draft', step: 1, title: '১. ড্রাফট তৈরি', icon: FileText, desc: 'সিস্টেমে প্রস্তুত' },
                      { key: 'dispatched', step: 2, title: '২. শাখায় প্রেরণ', icon: Send, desc: 'দপ্তরে পাঠানো হয়েছে' },
                      { key: 'approved', step: 3, title: '৩. বিল অনুমোদন', icon: BadgeCheck, desc: 'কর্তৃপক্ষ অনুমোদিত' },
                      { key: 'paid', step: 4, title: '৪. পরিশোধ সম্পন্ন', icon: Banknote, desc: 'অর্থ বিতরণ সম্পন্ন' },
                    ].map((st) => {
                      const isCompleted = currentStep >= st.step;
                      const isCurrent = currentStep === st.step;
                      const Icon = st.icon;

                      return (
                        <div
                          key={st.key}
                          className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 ${
                            isCurrent
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                              : isCompleted
                              ? 'bg-gray-50 dark:bg-gray-850 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                              : 'bg-gray-50/50 dark:bg-gray-900/50 border-dashed border-gray-200 dark:border-gray-800 opacity-60'
                          }`}
                        >
                          <div className={`p-2 rounded-xl text-white ${
                            isCompleted ? 'bg-emerald-600' : 'bg-gray-400'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <span className="text-xs font-bold leading-tight">
                            {st.title}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {st.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Status explanation */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-850 rounded-2xl text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-750 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{BILL_STATUS_MAP[activeBill.status]?.description}</span>
                  </div>
                </div>

                {/* Itemized Branch Breakdown Table */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-3xl border border-gray-200/80 dark:border-gray-750 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <FileText size={15} className="text-blue-600" />
                      <span>অন্তর্ভুক্ত ব্রাঞ্চ ও অফিসারদের তালিকা ({toBanglaDigits(activeBill.items.length)} টি)</span>
                    </h4>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      সর্বমোট: ৳{formatCurrency(activeBill.totalAmount.toString())}/-
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-[220px] rounded-2xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 dark:bg-gray-850 text-gray-600 dark:text-gray-300 sticky top-0 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="p-2.5 text-center w-10">#</th>
                          <th className="p-2.5">শাখা ও কোড</th>
                          <th className="p-2.5">অফিসারের নাম</th>
                          <th className="p-2.5 text-center">মোবাইল</th>
                          <th className="p-2.5 text-center">সিরিয়াল</th>
                          <th className="p-2.5 text-right">টাকা (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                        {activeBill.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/80 dark:hover:bg-gray-750/50">
                            <td className="p-2.5 text-center font-mono text-gray-400">{toBanglaDigits(idx + 1)}</td>
                            <td className="p-2.5 font-bold text-gray-900 dark:text-gray-100">
                              {item.branch} <span className="font-mono text-gray-400 font-normal">({toBanglaDigits(item.code)})</span>
                            </td>
                            <td className="p-2.5">{item.name}</td>
                            <td className="p-2.5 text-center font-mono text-gray-500">{toBanglaDigits(item.mobile)}</td>
                            <td className="p-2.5 text-center font-mono">{toBanglaDigits(item.serial) || '-'}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                              ৳{formatCurrency(item.amount || '০')}/-
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Interactive Actions */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      onLoadBillToEditor(activeBill.items, activeBill.config, activeBill.title);
                      onClose();
                      addToast('বিলটি বর্তমান এডিটরে লোড করা হয়েছে', 'success');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    <FileText size={15} />
                    <span>এডিটরে খুলুন (Edit Bill)</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenPrintPreview(activeBill.items, activeBill.totalAmount, activeBill.config);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-emerald-600/30 active:scale-95"
                  >
                    <Printer size={15} />
                    <span>প্রিন্ট ও ভাউচার প্রিভিউ (QR সহ)</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <QrCode size={40} className="mx-auto mb-3 opacity-40 text-emerald-600" />
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">কোনো বিল নির্বাচন করা হয়নি</h4>
                <p className="text-xs text-gray-500 mt-1">বামপাশের তালিকা থেকে একটি বিল বেছে নিন অথবা উপরে সার্চ করুন।</p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default BillTrackingModal;
