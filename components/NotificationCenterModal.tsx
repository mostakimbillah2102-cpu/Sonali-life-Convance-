import React from 'react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Building2, 
  CheckCheck, 
  ExternalLink,
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onSelectSubmission?: (submissionId: string) => void;
  onOpenSubmission?: (trackingId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAsRead,
  onMarkAllRead,
  onSelectSubmission,
  onOpenSubmission
}) => {
  if (!isOpen) return null;

  const markReadHandler = onMarkRead || onMarkAsRead;
  const selectSubmissionHandler = onOpenSubmission || onSelectSubmission;
  const unreadCount = notifications.filter(n => !(n.isRead || (n as any).read)).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'returned':
        return <RotateCcw size={18} className="text-amber-500" />;
      case 'paid':
        return <CreditCard size={18} className="text-blue-500" />;
      case 'submission':
        return <Building2 size={18} className="text-teal-500" />;
      default:
        return <AlertCircle size={18} className="text-gray-500" />;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('bn-BD');
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  নোটিফিকেশন সেন্টার
                </h2>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} নতুন
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                নতুন বিল দাখিল, অনুমোদন ও সংশোধনের লাইভ আপডেট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="p-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all flex items-center gap-1"
                title="সব পঠিত মার্ক করুন"
              >
                <CheckCheck size={16} />
                <span className="hidden sm:inline">সব পঠিত</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 divide-y divide-gray-100 dark:divide-gray-800">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Bell size={36} className="mx-auto opacity-30 text-gray-500" />
              <p className="text-xs font-bold">এখন কোনো নোটিফিকেশন নেই</p>
              <p className="text-[11px]">নতুন বিল দাখিল বা অনুমোদন হলে এখানে সাথে সাথে দেখতে পাবেন।</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!(notif.isRead || (notif as any).read) && markReadHandler) {
                    markReadHandler(notif.id);
                  }
                  if (selectSubmissionHandler) {
                    selectSubmissionHandler(notif.trackingId || notif.submissionId || '');
                    onClose();
                  }
                }}
                className={`pt-2.5 pb-2.5 px-3 rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                  !notif.isRead
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs shrink-0 mt-0.5">
                  {getNotifIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0 font-mono">
                      <Clock size={10} />
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.trackingId && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                        {notif.trackingId}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <span>বিস্তারিত দেখুন</span>
                        <ExternalLink size={10} />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between text-xs text-gray-500">
          <span>মোট {notifications.length} টি নোটিফিকেশন</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
