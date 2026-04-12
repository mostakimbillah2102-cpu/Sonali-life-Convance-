import React, { useState, useEffect } from 'react';
import { X, Trash2, FolderOpen, Clock } from 'lucide-react';
import { toBanglaDigits } from '../constants';
import { BillItem } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

interface SavedBill {
  id: string;
  name: string;
  items: string;
  createdAt: string;
  updatedAt: string;
}

interface SavedBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  onLoadBill: (items: BillItem[]) => void;
}

const SavedBillsModal: React.FC<SavedBillsModalProps> = ({ isOpen, onClose, userId, onLoadBill }) => {
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const q = query(collection(db, `users/${userId}/savedBills`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bills: SavedBill[] = [];
      snapshot.forEach((doc) => {
        bills.push({ id: doc.id, ...doc.data() } as SavedBill);
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

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (window.confirm('আপনি কি নিশ্চিত যে এই বিলটি মুছে ফেলতে চান?')) {
      try {
        await deleteDoc(doc(db, `users/${userId}/savedBills`, id));
      } catch (error) {
        console.error("Error deleting bill:", error);
      }
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-white/20">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-blue-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-blue-900">সেভ করা বিলসমূহ</h2>
            <p className="text-sm text-blue-600 font-medium mt-0.5">আপনার আগের সেভ করা বিলগুলো</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all shadow-sm border border-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">লোড হচ্ছে...</div>
          ) : savedBills.length === 0 ? (
            <div className="text-center py-12 text-gray-400 flex flex-col items-center">
              <FolderOpen size={48} className="mb-3 opacity-20" />
              <p>কোনো সেভ করা বিল পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedBills.map(bill => {
                const itemsCount = JSON.parse(bill.items).length;
                const date = new Date(bill.createdAt).toLocaleDateString('bn-BD', {
                  year: 'numeric', month: 'long', day: 'numeric'
                });
                
                return (
                  <div key={bill.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{bill.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><FolderOpen size={14} /> {toBanglaDigits(itemsCount)} টি ব্রাঞ্চ</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleLoad(bill.items)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-sm transition-all"
                      >
                        ওপেন করুন
                      </button>
                      <button 
                        onClick={() => handleDelete(bill.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedBillsModal;
