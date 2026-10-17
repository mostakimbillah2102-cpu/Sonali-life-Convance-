import React from 'react';
import { 
  X, 
  Check, 
  Crown, 
  UserCheck, 
  Eye, 
  Briefcase, 
  Lock,
  ShieldCheck
} from 'lucide-react';
import { UserRole, UserProfileData, BranchDatabase } from '../types';
import { ROLE_LABELS, isAdminEmail } from '../utils/authRoles';

interface RoleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile?: UserProfileData | null;
  currentProfile?: UserProfileData;
  onProfileUpdated?: (updates: UserProfileData) => void;
  onUpdateProfile?: (updates: Partial<UserProfileData>) => void;
  branchesMap?: BranchDatabase;
  allBranches?: BranchDatabase;
  onSuccessToast?: (msg: string) => void;
}

export const RoleManagerModal: React.FC<RoleManagerModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  currentProfile,
  onProfileUpdated,
  onUpdateProfile,
  branchesMap,
  allBranches,
  onSuccessToast
}) => {
  if (!isOpen) return null;

  const profile = currentProfile || currentUserProfile || {
    uid: 'guest',
    email: 'admin@sonalilife.com',
    displayName: 'ব্যবহারকারী',
    role: 'super_admin' as UserRole,
    branchCode: '58',
    branchName: 'বকশীগঞ্জ মেট্রো'
  };
  const branches = allBranches || branchesMap || {};

  const rolesList: { role: UserRole; title: string; desc: string; icon: any; color: string; badge: string; permissions: string[] }[] = [
    {
      role: 'super_admin',
      title: 'সুপার অ্যাডমিন (Super Admin)',
      desc: 'সর্বোচ্চ প্রশাসনিক ক্ষমতা। সব শাখা, সব বিল, অনুমোদন, পেমেন্ট, ডিলিট ও রোল নিয়ন্ত্রণ।',
      icon: Crown,
      color: 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
      badge: 'bg-purple-600 text-white',
      permissions: [
        'সমস্ত শাখার বিল তৈরি, সম্পাদনা ও মোছা (Delete)',
        'একক ও এক ক্লিকে বাল্ক অনুমোদন (Bulk Approve)',
        'বিল সংশোধনের জন্য শাখায় ফেরত পাঠানো (Return for Correction)',
        'বিল পরিশোধিত (Paid) মার্ক করা',
        'সম্পূর্ণ ডিজিটাল অডিট লগ ও অনুমোদন ইতিহাস দেখা',
        'মাসিক ও শাখাভিত্তিক এক্সেল (Excel) রিপোর্ট ডাউনলোড'
      ]
    },
    {
      role: 'head_office_admin',
      title: 'হেড অফিস অ্যাডমিন (Head Office Admin)',
      desc: 'হেড অফিস হিসাব ও অনুমোদন বিভাগ। বিল যাচাই, অনুমোদন, পেমেন্ট ও রিপোর্ট এক্সপোর্ট।',
      icon: ShieldCheck,
      color: 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-600 text-white',
      permissions: [
        'সমস্ত শাখার দাখিলকৃত বিল যাচাই ও আন্ডার রিভিউ করা',
        'বিল অনুমোদন (Approve) ও পরিশোধিত (Paid) করা',
        'ভুল বিল কারণসহ শাখায় ফেরত পাঠানো (Return for Correction)',
        'সকল শাখার তারিখ ভিত্তিক রিপোর্ট ও এক্সেল ডাউনলোড',
        'বিল ডিলিট করার অনুমতি নেই (শুধুমাত্র সুপার অ্যাডমিনের অনুমতি আছে)'
      ]
    },
    {
      role: 'branch_officer',
      title: 'শাখা কর্মকর্তা (Branch Officer)',
      desc: 'শাখা পর্যায়ের বিল এন্ট্রি ও পরিচালনা। অন্য শাখার বিলে কোনো হস্তক্ষেপ করতে পারবে না।',
      icon: Briefcase,
      color: 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-600 text-white',
      permissions: [
        'শুধুমাত্র নিজ শাখার খরচের ভাউচার ও বিল দাখিল করা',
        'নিজ শাখার দাখিলকৃত বিলের স্ট্যাটাস ও ট্র্যাকিং দেখা',
        'ফেরত আসা বিল (Returned for Correction) সংশোধন করে পুনরায় জমা দেওয়া',
        'অনুমোদিত বা পরিশোধিত বিল এডিট বা ডিলিট করার কোনো অধিকার নেই',
        'অন্য কোনো শাখার বিল পরিবর্তন বা স্পর্শ করা সম্পূর্ণ নিষিদ্ধ (Firebase Security Rule Enforced)'
      ]
    },
    {
      role: 'viewer',
      title: 'ভিউয়ার / অডিটর (Viewer)',
      desc: 'শুধুমাত্র রিড-অনলি এক্সেস। কোনো তথ্য তৈরি, সংশোধন বা অনুমোদন করতে পারবে না।',
      icon: Eye,
      color: 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-600 text-white',
      permissions: [
        'বিল ও তারিখ ভিত্তিক খরচের রিপোর্ট দেখা',
        'এক্সেল (Excel) ও ভাউচার প্যাড কপি প্রিন্ট/ডাউনলোড',
        'কোনো বিল তৈরি, অনুমোদন, সংশোধন বা মুছে ফেলার অনুমতি নেই'
      ]
    }
  ];

  const isProfileAdmin = isAdminEmail(profile.email);

  const handleSelectRole = (newRole: UserRole) => {
    if (!isProfileAdmin && (newRole === 'super_admin' || newRole === 'head_office_admin')) {
      onSuccessToast?.('অ্যাক্সেস সংরক্ষিত: শুধুমাত্র sonalilifegroupclaim@gmail.com ও mostakim.billah2102@gmail.com অ্যাডমিন হিসেবে অনুমোদিত।');
      return;
    }
    const updated = { ...profile, role: newRole };
    if (onUpdateProfile) onUpdateProfile({ role: newRole });
    if (onProfileUpdated) onProfileUpdated(updated);
    onSuccessToast?.(`রোল পরিবর্তিত হয়েছে: ${ROLE_LABELS[newRole].enLabel}`);
  };

  const handleSelectBranch = (branchCode: string) => {
    const branch = branches[branchCode];
    const updated = {
      ...profile,
      branchCode,
      branchName: branch ? branch.branch : ` শাখা #${branchCode}`
    };
    if (onUpdateProfile) onUpdateProfile({ branchCode, branchName: updated.branchName });
    if (onProfileUpdated) onProfileUpdated(updated);
    onSuccessToast?.(`নির্ধারিত শাখা কোড: ${branchCode}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  রোল ও পারমিশন কন্ট্রোল (RBAC)
                </h2>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Security Level 1
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                সোনালী লাইফ ইন্সুরেন্স - চার স্তরের দায়িত্বভিত্তিক এক্সেস ও নিরাপত্তা ব্যবস্থা
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Current User Info Card */}
          <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">বর্তমান সক্রিয় ব্যবহারকারী</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {profile.displayName || 'ব্যবহারকারী'}
                </p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm ${ROLE_LABELS[profile.role]?.badge || 'bg-gray-600 text-white'}`}>
                  {ROLE_LABELS[profile.role]?.enLabel || profile.role}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                {profile.email || 'guest@sonalilife.com'}
              </p>
            </div>

            {/* Branch Selector if Branch Officer */}
            <div className="w-full sm:w-auto flex flex-col items-start sm:items-end">
              <label className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">নিযুক্ত শাখা কোড</label>
              <select
                value={profile.branchCode || '58'}
                onChange={(e) => handleSelectBranch(e.target.value)}
                className="mt-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {Object.entries(branches).slice(0, 30).map(([code, b]) => (
                  <option key={code} value={code}>
                    {code} - {b.branch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-2xl flex items-start gap-3">
            <Lock size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
              <strong>অ্যাডমিন নীতি ও নিরাপত্তা:</strong> শুধুমাত্র <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono text-[11px]">sonalilifegroupclaim@gmail.com</code> এবং <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono text-[11px]">mostakim.billah2102@gmail.com</code> অ্যাডমিন হিসেবে অ্যাক্সেস পাবেন। সাধারণ ব্যবহারকারীদের জন্য একক অনুসন্ধান, তারিখ ভিত্তিক রিপোর্ট ও কাস্টম বিল তালিকা বন্ধ থাকবে।
            </p>
          </div>

          {/* Role Options */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              সক্রিয় ভূমিকা (Role) তালিকা:
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {rolesList.map((item) => {
                const isSelected = profile.role === item.role;
                const isLocked = !isProfileAdmin && (item.role === 'super_admin' || item.role === 'head_office_admin');
                const IconComponent = item.icon;

                return (
                  <div
                    key={item.role}
                    onClick={() => handleSelectRole(item.role)}
                    className={`border-2 rounded-2xl p-4 transition-all ${
                      isLocked
                        ? 'opacity-60 bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                        : isSelected 
                          ? `${item.color} shadow-md ring-2 ring-emerald-500/30 cursor-pointer` 
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl text-white shadow-sm shrink-0 ${item.badge}`}>
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {item.title}
                            </h4>
                            {isLocked ? (
                              <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock size={10} /> অ্যাডমিন ইমেইল আবশ্যক
                              </span>
                            ) : isSelected ? (
                              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check size={10} /> সক্রিয়
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                            {item.desc}
                          </p>

                          {/* Permissions summary */}
                          <ul className="mt-2.5 space-y-1">
                            {item.permissions.map((p, pIdx) => (
                              <li key={pIdx} className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-1.5 font-medium">
                                <span className="text-emerald-500 font-bold shrink-0">•</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'border-emerald-600 bg-emerald-600 text-white' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <Check size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            সম্পন্ন করুন (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
