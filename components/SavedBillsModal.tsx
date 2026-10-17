import React, { useState, useEffect } from 'react';
import { X, Trash2, FolderOpen, Clock, GitMerge, Search, Download, QrCode } from 'lucide-react';
import { toBanglaDigits, toEnglishDigits } from '../constants';
import { BillItem, SavedBill } from '../types';
import { BILL_STATUS_MAP } from '../utils/qrTracker';
import { db } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

interface SavedBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  onLoadBill: (items: BillItem[]) => void;
  onOpenMerge?: () => void;
  onOpenTracking?: (trackingId: string) => void;
}

const SavedBillsModal: React.FC<SavedBillsModalProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  onLoadBill,
  onOpenMerge,
  onOpenTracking
}) => {
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (!isOpen || !userId) {
      // If not logged in, fetch from localStorage fallback
      const localSaved = localStorage.getItem('sonali_saved_bills_local');
      if (localSaved) {
        try {
          setSavedBills(JSON.parse(localSaved));
        } catch (e) {}
      }
      setLoading(false);
      return;
    }

    const q = query(collection(db, `users/${userId}/savedBills`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bills: SavedBill[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        bills.push({ 
          id: docSnap.id, 
          ...data 
        } as SavedBill);
      });
      // Sort by newest first
      bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSavedBills(bills);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching saved bills:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, userId]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-reset delete confirm after 3.5 seconds
  useEffect(() => {
    if (!deleteConfirmId) return;
    const timer = setTimeout(() => setDeleteConfirmId(null), 3500);
    return () => clearTimeout(timer);
  }, [deleteConfirmId]);

  const handleDelete = async (id: string) => {
    if (userId) {
      try {
        await deleteDoc(doc(db, `users/${userId}/savedBills`, id));
      } catch (error) {
        console.error("Error deleting bill:", error);
      }
    } else {
      const updated = savedBills.filter(b => b.id !== id);
      setSavedBills(updated);
      localStorage.setItem('sonali_saved_bills_local', JSON.stringify(updated));
    }
    setDeleteConfirmId(null);
  };

  const handleLoad = (itemsStr: string) => {
    try {
      const items = JSON.parse(itemsStr);
      onLoadBill(items);
      onClose();
    } catch (e) {
      console.error("Error parsing bill items:", e);
    }
  };

  const handleExportSingleCSV = (bill: SavedBill) => {
    try {
      const items: BillItem[] = JSON.parse(bill.items);
      let csvContent = "\uFEFFক্রমিক,কোড,শাখা,কর্মকর্তা,সিরিয়াল নং,টাকা\n";
      items.forEach((item, idx) => {
        csvContent += `"${toBanglaDigits(idx + 1)}","${toBanglaDigits(item.code)}","${item.branch}","${item.name}","${toBanglaDigits(item.serial || '')}","${toBanglaDigits(item.amount || '0')}"\n`;
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bill.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      link.click();
    } catch (e) {
      console.error("Error exporting bill CSV", e);
    }
  };

  if (!isOpen) return null;

  const filteredBills = savedBills.filter(b => 
    !searchFilter || b.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 transition-colors">
          <div>
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <FolderOpen size={22} className="text-blue-600" />
              সংরক্ষিত বিলসমূহ (Saved Bills)
              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-mono">
                {toBanglaDigits(savedBills.length)} টি
              </span>
            </h2>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">পূর্বের তৈরি ও সংরক্ষিত সকল বিল পরিচালনা করুন</p>
          </div>
          
          <div className="flex items-center gap-2">
            {onOpenMerge && savedBills.length >= 2 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMerge();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
              >
                <GitMerge size={14} />
                <span>বিল মার্জ করুন</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="relative">
            <input
              type="text"
              placeholder="বিলের নাম দিয়ে খুঁজুন..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 focus:border-blue-500 outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">লোড হচ্ছে...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 flex flex-col items-center">
              <FolderOpen size={48} className="mb-3 opacity-20" />
              <p className="font-bold text-gray-700 dark:text-gray-300">কোনো সেভ করা বিল পাওয়া যায়নি</p>
              <p className="text-xs mt-1">বিল তৈরি করার পর 'সেভ করুন' বাটনে ক্লিক করে সংরক্ষণ করতে পারবেন।</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBills.map(bill => {
                let itemsCount = 0;
                let calculatedTotal = 0;
                try {
                  const items: BillItem[] = JSON.parse(bill.items);
                  itemsCount = items.length;
                  items.forEach(i => {
                    const val = parseFloat(toEnglishDigits(i.amount || '0'));
                    if (!isNaN(val)) calculatedTotal += val;
                  });
                } catch (e) {}

                const date = new Date(bill.createdAt).toLocaleDateString('bn-BD', {
                  year: 'numeric', month: 'long', day: 'numeric'
                });
                const billTrackId = bill.trackingId || `SLI-${bill.id.slice(0, 8).toUpperCase()}`;
                const statusMeta = BILL_STATUS_MAP[bill.status || 'approved'] || BILL_STATUS_MAP.approved;
                
                return (
                  <div key={bill.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/80 rounded-2xl hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all gap-3 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">{bill.name}</h3>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full font-mono">
                          ৳{toBanglaDigits(bill.totalAmount || calculatedTotal)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}>
                          {statusMeta.label.split(' ')[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{billTrackId}</span>
                        <span className="flex items-center gap-1"><FolderOpen size={13} /> {toBanglaDigits(itemsCount)} টি ব্রাঞ্চ</span>
                        <span className="flex items-center gap-1"><Clock size={13} /> {date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {onOpenTracking && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenTracking(billTrackId);
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95"
                          title="QR কোড ও ট্র্যাকিং স্ট্যাটাস দেখুন"
                        >
                          <QrCode size={14} />
                          <span className="hidden sm:inline">QR ট্র্যাক</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleExportSingleCSV(bill)}
                        className="p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                        title="CSV ডাউনলোড করুন"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => handleLoad(bill.items)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95"
                      >
                        লোড করুন
                      </button>
                      {deleteConfirmId === bill.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(bill.id)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1"
                            title="মুছে ফেলতে নিশ্চিত করুন"
                          >
                            <Trash2 size={13} />
                            <span>মুছুন?</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="বাতিল করুন"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirmId(bill.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between text-xs text-gray-500 transition-colors">
          <span>মোট সংরক্ষিত: {toBanglaDigits(filteredBills.length)} টি</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};

export default SavedBillsModal;

