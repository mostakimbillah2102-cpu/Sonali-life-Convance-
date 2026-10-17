import React, { useState, useEffect, useRef } from 'react';
import { X, Save, CheckCircle2, QrCode, Tag, FileText, RefreshCw, Hash, DollarSign } from 'lucide-react';
import { BillItem, BillStatus, SavedBill, VoucherConfig } from '../types';
import { toBanglaDigits } from '../constants';
import { generateTrackingId, BILL_STATUS_MAP } from '../utils/qrTracker';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SaveBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billItems: BillItem[];
  totalAmount: number;
  note: string;
  voucherConfig: VoucherConfig;
  user: FirebaseUser | null;
  onBillSaved?: (savedBill: SavedBill) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SaveBillModal: React.FC<SaveBillModalProps> = ({
  isOpen,
  onClose,
  billItems,
  totalAmount,
  note,
  voucherConfig,
  user,
  onBillSaved,
  addToast,
}) => {
  const [billName, setBillName] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [status, setStatus] = useState<BillStatus>('draft');
  const [billNote, setBillNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Set default friendly name based on date and voucher type
      const dateStr = new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
      const defaultName = `${voucherConfig.billType || 'ভাউচার বিল'} - ${dateStr}`;
      setBillName(defaultName);
      setTrackingId(voucherConfig.trackingId || generateTrackingId());
      setStatus(voucherConfig.status || 'draft');
      setBillNote(note || '');
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, voucherConfig, note]);

  if (!isOpen) return null;

  const handleRegenerateTrackingId = () => {
    const newId = generateTrackingId();
    setTrackingId(newId);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!billName.trim()) {
      addToast('অনুগ্রহ করে বিলের একটি নাম লিখুন', 'error');
      inputRef.current?.focus();
      return;
    }

    if (billItems.length === 0) {
      addToast('সেভ করার মতো কোনো শাখা আইটেম নেই', 'error');
      return;
    }

    setIsSaving(true);
    const billId = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalTrackingId = trackingId.trim() || generateTrackingId();
    
    const updatedVoucherConfig: VoucherConfig = {
      ...voucherConfig,
      trackingId: finalTrackingId,
      status: status,
    };

    const newBillData: SavedBill = {
      id: billId,
      name: billName.trim(),
      items: JSON.stringify(billItems),
      totalAmount: totalAmount,
      note: billNote,
      trackingId: finalTrackingId,
      status: status,
      voucherConfig: JSON.stringify(updatedVoucherConfig),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (user) {
        await setDoc(doc(db, `users/${user.uid}/savedBills`, billId), {
          ...newBillData,
          uid: user.uid,
        });
      }

      // Always update localStorage as well for offline/instant resilience
      const localKey = 'sonali_saved_bills_local';
      const existing = localStorage.getItem(localKey);
      const list: SavedBill[] = existing ? JSON.parse(existing) : [];
      list.unshift(newBillData);
      localStorage.setItem(localKey, JSON.stringify(list));
      localStorage.setItem('sonali_saved_bills', JSON.stringify(list));

      if (onBillSaved) {
        onBillSaved(newBillData);
      }

      addToast(`বিল সফলভাবে সংরক্ষিত হয়েছে! (ট্র্যাকিং: ${finalTrackingId})`, 'success');
      onClose();
    } catch (error) {
      console.error('Error saving bill:', error);
      addToast('বিল সেভ করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Save size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">বিল সংরক্ষণ করুন</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">অনলাইন ডাটাবেজে সংরক্ষণ ও কিউআর ট্র্যাকিং প্রস্তুত করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Summary Banner */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Hash size={16} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">মোট শাখা</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 font-mono">
                  {toBanglaDigits(billItems.length)} টি
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                <DollarSign size={16} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">সর্বমোট টাকা</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ৳{toBanglaDigits(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Bill Name Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Tag size={14} className="text-emerald-600" />
              <span>বিলের নাম <span className="text-red-500">*</span></span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="যেমন: জানুয়ারি ২০২৬ কুরিয়ার বিল"
              required
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          {/* Tracking ID & Refresh */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <QrCode size={14} className="text-emerald-600" />
                <span>ট্র্যাকিং নম্বর (QR ID)</span>
              </span>
              <button
                type="button"
                onClick={handleRegenerateTrackingId}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <RefreshCw size={11} />
                <span>নতুন কোড</span>
              </button>
            </label>
            <div className="relative">
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="SLI-2026-XXXX"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              বিলের বর্তমান অবস্থা (Status)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(BILL_STATUS_MAP) as BillStatus[]).map((st) => {
                const meta = BILL_STATUS_MAP[st];
                const isSelected = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      isSelected
                        ? `${meta.badgeClass} ring-2 ring-emerald-500/40 scale-[1.02] shadow-sm`
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-emerald-600" />
              <span>মন্তব্য / নোট (ঐচ্ছিক)</span>
            </label>
            <input
              type="text"
              value={billNote}
              onChange={(e) => setBillNote(e.target.value)}
              placeholder="বিল সম্পর্কিত বিশেষ তথ্য বা রেফারেন্স..."
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={isSaving || !billName.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>সংরক্ষণ সম্পন্ন করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveBillModal;
