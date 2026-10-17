import React from 'react';
import { 
  X, 
  History, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText, 
  AlertCircle, 
  RotateCcw, 
  CreditCard,
  Printer
} from 'lucide-react';
import { BranchSubmission, ApprovalHistoryItem } from '../types';

interface ApprovalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: BranchSubmission | null;
}

export const ApprovalHistoryModal: React.FC<ApprovalHistoryModalProps> = ({
  isOpen,
  onClose,
  submission
}) => {
  if (!isOpen || !submission) return null;

  const historyList: ApprovalHistoryItem[] = submission.history && submission.history.length > 0
    ? submission.history
    : [
        {
          id: 'initial',
          date: submission.createdAt,
          action: 'বিল দাখিল করা হয়েছে (Submitted)',
          by: submission.officerName,
          role: 'শাখা কর্মকর্তা (Branch Officer)',
          note: submission.description || 'শাখা থেকে সরাসরি দাখিল করা হয়েছে।'
        }
      ];

  const getActionBadge = (action: string) => {
    if (action.includes('অনুমোদন') || action.includes('Approved')) {
      return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' };
    }
    if (action.includes('ফেরত') || action.includes('Return')) {
      return { icon: RotateCcw, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' };
    }
    if (action.includes('পরিশোধ') || action.includes('Paid')) {
      return { icon: CreditCard, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' };
    }
    if (action.includes('যাচাই') || action.includes('Review')) {
      return { icon: Clock, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800' };
    }
    return { icon: FileText, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800' };
  };

  const handlePrintAuditTrail = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-600/20">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  ডিজিটাল অনুমোদন ও অডিট হিস্ট্রি
                </h2>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold font-mono">
                  Audit Trail
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                {submission.trackingId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrintAuditTrail}
              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
              title="অডিট হিস্ট্রি প্রিন্ট করুন"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Overview Banner */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400">শাখা: </span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{submission.branchName} ({submission.branchCode})</span>
          </div>
          <div>
            <span className="text-gray-400">টাকার পরিমাণ: </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">৳ {submission.amount.toLocaleString('bn-BD')}</span>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-blue-500 before:to-purple-500">
            {historyList.map((item, idx) => {
              const { icon: ActionIcon, color } = getActionBadge(item.action);

              return (
                <div key={item.id || idx} className="relative group">
                  {/* Indicator Dot */}
                  <div className="absolute -left-[27px] top-1 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-emerald-500 dark:border-emerald-400 flex items-center justify-center shadow-xs">
                    <ActionIcon size={12} className="text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${color} shadow-xs`}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {item.action}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {new Date(item.date).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                      <User size={12} className="text-gray-400 shrink-0" />
                      <span>সম্পাদনকারী: <strong>{item.by}</strong></span>
                      <span className="text-[10px] bg-white/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 font-sans">
                        {item.role}
                      </span>
                    </div>

                    {item.note && (
                      <div className="mt-2 text-xs bg-white/70 dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                        {item.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {submission.returnReason && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  সর্বশেষ সংশোধনের নির্দেশ (Correction Notice):
                </h5>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  {submission.returnReason}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-mono">
            স্বয়ংক্রিয় ডিজিটাল রেকর্ড - অননুমোদিত পরিবর্তন সুরক্ষিত
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
