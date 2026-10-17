import React, { useState } from 'react';
import { X, GitMerge, CheckSquare, Square, Layers } from 'lucide-react';
import { BillItem, SavedBill } from '../types';
import { toBanglaDigits, toEnglishDigits } from '../constants';

interface MergeBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBills: SavedBill[];
  onMergeBills: (mergedItems: BillItem[], mergedName: string) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const MergeBillsModal: React.FC<MergeBillsModalProps> = ({
  isOpen,
  onClose,
  savedBills,
  onMergeBills,
  addToast,
}) => {
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [mergedName, setMergedName] = useState(`কম্বাইন্ড বিল - ${new Date().toLocaleDateString('bn-BD')}`);
  const [duplicateMode, setDuplicateMode] = useState<'combine_amounts' | 'keep_all' | 'skip_duplicates'>('combine_amounts');

  if (!isOpen) return null;

  const toggleSelectBill = (id: string) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBillIds.length === savedBills.length) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(savedBills.map(b => b.id));
    }
  };

  const handleExecuteMerge = () => {
    if (selectedBillIds.length < 2) {
      addToast('কমপক্ষে ২টি বিল সিলেক্ট করতে হবে', 'error');
      return;
    }

    const billsToMerge = savedBills.filter(b => selectedBillIds.includes(b.id));
    const mergedList: BillItem[] = [];
    const codeMap: { [code: string]: BillItem } = {};

    billsToMerge.forEach(bill => {
      try {
        const items: BillItem[] = JSON.parse(bill.items);
        items.forEach(item => {
          if (duplicateMode === 'combine_amounts') {
            if (codeMap[item.code]) {
              // Combine amounts
              const existingAmt = parseFloat(toEnglishDigits(codeMap[item.code].amount || '0')) || 0;
              const newAmt = parseFloat(toEnglishDigits(item.amount || '0')) || 0;
              const sum = existingAmt + newAmt;
              codeMap[item.code].amount = sum.toString();
              
              // Append serials if different
              if (item.serial && !codeMap[item.code].serial.includes(item.serial)) {
                codeMap[item.code].serial = codeMap[item.code].serial 
                  ? `${codeMap[item.code].serial}, ${item.serial}` 
                  : item.serial;
              }
            } else {
              codeMap[item.code] = { ...item };
            }
          } else if (duplicateMode === 'skip_duplicates') {
            if (!codeMap[item.code]) {
              codeMap[item.code] = { ...item };
            }
          } else {
            // Keep all as separate rows
            mergedList.push({ ...item });
          }
        });
      } catch (e) {
        console.error("Error parsing bill items in merge", e);
      }
    });

    const finalItems = (duplicateMode === 'keep_all') ? mergedList : Object.values(codeMap);

    onMergeBills(finalItems, mergedName.trim() || 'মার্জড বিল');
    addToast(`${toBanglaDigits(selectedBillIds.length)} টি বিল সফলভাবে একত্রিত করা হয়েছে!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/30">
              <GitMerge size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">একাধিক বিল একত্রীকরণ (Merge Bills)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">সেভ করা বিলগুলো থেকে পছন্দমতো সিলেক্ট করে একটি মাস্টার বিল তৈরি করুন</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {savedBills.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500">
              <Layers size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-gray-700 dark:text-gray-300">কোনো সংরক্ষিত বিল পাওয়া যায়নি</p>
              <p className="text-xs mt-1">মার্জ করার জন্য প্রথমে ২ বা ততোধিক বিল সেভ করুন।</p>
            </div>
          ) : (
            <>
              {/* Target Bill Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  একত্রিত বিলের নাম
                </label>
                <input
                  type="text"
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  placeholder="যেমন: মাসিক চূড়ান্ত বিল..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Duplicate Handling Options */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  ডুপ্লিকেট ব্রাঞ্চ হ্যান্ডলিং নিয়ম
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'combine_amounts', label: 'টাকা যোগ করুন', desc: 'একই ব্রাঞ্চের টাকা একসাথে যোগ হবে' },
                    { id: 'skip_duplicates', label: 'একবার রাখুন', desc: 'ডুপ্লিকেট ব্রাঞ্চ অগ্রাহ্য করবে' },
                    { id: 'keep_all', label: 'সব আলাদা রাখুন', desc: 'প্রতিটি বিলের লাইন আলাদা থাকবে' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDuplicateMode(mode.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        duplicateMode === mode.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <p className="text-xs font-bold">{mode.label}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Selection List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    মার্জ করার জন্য বিল সিলেক্ট করুন ({toBanglaDigits(selectedBillIds.length)} / {toBanglaDigits(savedBills.length)})
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                  >
                    {selectedBillIds.length === savedBills.length ? 'সব বাদ দিন' : 'সব সিলেক্ট করুন'}
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedBills.map((bill) => {
                    const isSelected = selectedBillIds.includes(bill.id);
                    let itemCount = 0;
                    try {
                      itemCount = JSON.parse(bill.items).length;
                    } catch (e) {}

                    return (
                      <div
                        key={bill.id}
                        onClick={() => toggleSelectBill(bill.id)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="text-blue-600" size={20} />
                          ) : (
                            <Square className="text-gray-400" size={20} />
                          )}
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{bill.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(bill.createdAt).toLocaleDateString('bn-BD')} • {toBanglaDigits(itemCount)} টি ব্রাঞ্চ
                            </p>
                          </div>
                        </div>
                        {bill.totalAmount !== undefined && (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm font-mono">
                            ৳{toBanglaDigits(bill.totalAmount)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between transition-colors">
          <span className="text-xs text-gray-500">
            সিলেক্টেড: <strong className="text-gray-800 dark:text-gray-200">{toBanglaDigits(selectedBillIds.length)}</strong> টি বিল
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-all"
            >
              বাতিল
            </button>
            <button
              disabled={selectedBillIds.length < 2}
              onClick={handleExecuteMerge}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
            >
              <GitMerge size={16} />
              <span>মার্জ করে লোড করুন</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MergeBillsModal;
