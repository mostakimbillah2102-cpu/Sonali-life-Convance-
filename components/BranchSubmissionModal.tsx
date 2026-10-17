import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  User, 
  Phone, 
  Calendar, 
  Receipt, 
  FileText, 
  Clock, 
  Search, 
  PlusCircle, 
  Copy, 
  ChevronDown, 
  Upload, 
  Paperclip, 
  Eye, 
  Trash2, 
  Download, 
  AlertCircle,
  Zap,
  Tag,
  Plus,
  RefreshCw,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { BranchDatabase, BranchSubmission, UserProfileData } from '../types';
import { 
  submitBranchBill, 
  generateBranchTrackingId, 
  generateUniqueVoucherNumber,
  detectDuplicateBill,
  getLocalCachedSubmissions, 
  EXPENSE_CATEGORIES,
  VOUCHER_ATTACHMENT_LABELS,
  processMultipleVoucherFiles,
  formatFileSize,
  ProcessedAttachment
} from '../utils/branchSubmissions';

interface BranchSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchesMap: BranchDatabase;
  onSuccessToast?: (msg: string) => void;
  currentUserProfile?: UserProfileData;
  editingSubmission?: BranchSubmission | null;
  initialBranchCode?: string;
}

export const BranchSubmissionModal: React.FC<BranchSubmissionModalProps> = ({
  isOpen,
  onClose,
  branchesMap,
  onSuccessToast,
  currentUserProfile,
  editingSubmission,
  initialBranchCode
}) => {
  // Form State
  const [branchQuery, setBranchQuery] = useState('');
  const [selectedBranchCode, setSelectedBranchCode] = useState('');
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const [officerName, setOfficerName] = useState('');
  const [officerPhone, setOfficerPhone] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [voucherNo, setVoucherNo] = useState('');
  const [autoVoucherNo, setAutoVoucherNo] = useState(() => generateUniqueVoucherNumber());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Multiple Voucher Attachments State
  const [attachments, setAttachments] = useState<ProcessedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewAttachmentModal, setPreviewAttachmentModal] = useState<{
    dataUrl: string;
    fileName: string;
    fileType: string;
    title?: string;
    label?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<BranchSubmission | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Recent submissions cache
  const [recentList, setRecentList] = useState<BranchSubmission[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Duplicate warning detection
  const duplicateCheck = useMemo(() => {
    if (!selectedBranchCode || !billDate || !amount) return { isDuplicate: false };
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { isDuplicate: false };

    return detectDuplicateBill(
      selectedBranchCode,
      billDate,
      numAmount,
      category,
      voucherNo,
      editingSubmission?.id
    );
  }, [selectedBranchCode, billDate, amount, category, voucherNo, editingSubmission]);

  // Load previous officer preferences or editing submission (UNLOCKED FOR ALL USERS)
  useEffect(() => {
    if (!isOpen) return;

    const cached = getLocalCachedSubmissions();
    setRecentList(cached.slice(0, 5));

    if (editingSubmission) {
      // Editing returned bill or resubmitting
      setSelectedBranchCode(editingSubmission.branchCode);
      setSelectedBranchName(editingSubmission.branchName);
      setBranchQuery(`${editingSubmission.branchCode} - ${editingSubmission.branchName}`);
      setOfficerName(editingSubmission.officerName || '');
      setOfficerPhone(editingSubmission.officerPhone || '');
      setOfficerEmail(editingSubmission.officerEmail || '');
      setBillDate(editingSubmission.billDate || new Date().toISOString().split('T')[0]);
      setCategory(editingSubmission.category || EXPENSE_CATEGORIES[0]);
      setVoucherNo(editingSubmission.voucherNo || '');
      setAutoVoucherNo(editingSubmission.autoVoucherNo || generateUniqueVoucherNumber());
      setAmount(editingSubmission.amount ? editingSubmission.amount.toString() : '');
      setDescription(editingSubmission.description || '');
      if (editingSubmission.voucherAttachments) {
        setAttachments(editingSubmission.voucherAttachments.map(a => ({
          ...a,
          originalSize: a.fileSize,
          compressionRatio: 0
        })));
      }
      return;
    }

    // Default branch selection without locking:
    let defaultCode = initialBranchCode || '';
    let savedOfficerData: any = null;
    const savedOfficer = localStorage.getItem('sonali_last_officer');
    if (savedOfficer) {
      try {
        savedOfficerData = JSON.parse(savedOfficer);
      } catch (e) {}
    }

    if (!defaultCode && savedOfficerData?.branchCode && branchesMap[savedOfficerData.branchCode]) {
      defaultCode = savedOfficerData.branchCode;
    } else if (!defaultCode && currentUserProfile?.branchCode && branchesMap[currentUserProfile.branchCode]) {
      defaultCode = currentUserProfile.branchCode;
    }

    if (defaultCode && branchesMap[defaultCode]) {
      const bData = branchesMap[defaultCode];
      setSelectedBranchCode(defaultCode);
      setSelectedBranchName(bData.branch);
      setBranchQuery(`${defaultCode} - ${bData.branch}`);
    }

    // Default officer particulars
    if (savedOfficerData?.name) {
      setOfficerName(savedOfficerData.name);
    } else if (currentUserProfile?.displayName) {
      setOfficerName(currentUserProfile.displayName);
    }

    if (savedOfficerData?.phone) {
      setOfficerPhone(savedOfficerData.phone);
    } else if (currentUserProfile?.phoneNumber) {
      setOfficerPhone(currentUserProfile.phoneNumber);
    }

    if (savedOfficerData?.email) {
      setOfficerEmail(savedOfficerData.email);
    } else if (currentUserProfile?.email) {
      setOfficerEmail(currentUserProfile.email);
    }

    setAutoVoucherNo(generateUniqueVoucherNumber());
  }, [isOpen, editingSubmission, currentUserProfile, branchesMap, initialBranchCode]);

  // Search filtered branches
  const filteredBranches = useMemo(() => {
    if (!branchQuery.trim()) return Object.entries(branchesMap).slice(0, 15);
    const q = branchQuery.toLowerCase().trim();
    return Object.entries(branchesMap).filter(([code, data]) => {
      return code.toLowerCase().includes(q) ||
        data.branch.toLowerCase().includes(q) ||
        data.name.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [branchQuery, branchesMap]);

  const handleSelectBranch = (code: string, name: string, officer?: string, mobile?: string) => {
    setSelectedBranchCode(code);
    setSelectedBranchName(name);
    setBranchQuery(`${code} - ${name}`);
    setIsDropdownOpen(false);

    if (officer && !officerName) setOfficerName(officer);
    if (mobile && !officerPhone) setOfficerPhone(mobile);
  };

  // Multiple File Processing and Smart Auto-Compression handler
  const handleFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const processedList = await processMultipleVoucherFiles(files, 'ক্যাশ মেমো / ভাউচার', attachments.length);
      setAttachments(prev => {
        const combined = [...prev, ...processedList];
        if (combined.length > 8) {
          setUploadError('সর্বোচ্চ ৮টি ভাউচার ফাইল একসাথে সংযুক্ত করা যাবে। অতিরিক্ত ফাইল বাদ দেওয়া হয়েছে।');
          return combined.slice(0, 8);
        }
        return combined;
      });
    } catch (err: any) {
      console.error('File process error', err);
      setUploadError(err.message || 'ফাইল প্রসেসিং ব্যর্থ হয়েছে');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
    setUploadError(null);
  };

  const updateAttachmentLabel = (id: string, newLabel: string) => {
    setAttachments(prev => prev.map(att => att.id === id ? { ...att, label: newLabel } : att));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedBranchCode) {
      setFormError('অনুগ্রহ করে শাখা কোড বা নাম নির্বাচন করুন।');
      return;
    }
    if (!officerName.trim()) {
      setFormError('কর্মকর্তার নাম লিখুন।');
      return;
    }
    if (!officerPhone.trim()) {
      setFormError('মোবাইল নম্বর লিখুন।');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('সঠিক টাকার পরিমাণ উল্লেখ করুন।');
      return;
    }

    setIsSubmitting(true);

    try {
      const trackingId = editingSubmission?.trackingId || generateBranchTrackingId(selectedBranchCode, billDate);

      const record = await submitBranchBill({
        ...(editingSubmission?.id ? { id: editingSubmission.id } : {}),
        trackingId,
        autoVoucherNo,
        branchCode: selectedBranchCode,
        branchName: selectedBranchName || branchesMap[selectedBranchCode]?.branch || 'Branch',
        officerName: officerName.trim(),
        officerPhone: officerPhone.trim(),
        ...(officerEmail.trim() ? { officerEmail: officerEmail.trim() } : {}),
        billDate,
        category,
        ...(voucherNo.trim() ? { voucherNo: voucherNo.trim() } : {}),
        voucherAttachments: attachments,
        ...(attachments[0]?.dataUrl ? { voucherAttachment: attachments[0].dataUrl } : {}),
        ...(attachments[0]?.fileName ? { voucherFileName: attachments[0].fileName } : {}),
        ...(attachments[0]?.fileType ? { voucherFileType: attachments[0].fileType } : {}),
        amount: numAmount,
        description: description.trim() || `${category} বাবদ খরচ`,
        status: 'submitted',
        actorRole: currentUserProfile?.role || 'branch_officer'
      });

      // Save preference for next time
      localStorage.setItem('sonali_last_officer', JSON.stringify({
        name: officerName.trim(),
        phone: officerPhone.trim(),
        email: officerEmail.trim(),
        branchCode: selectedBranchCode,
      }));
      localStorage.setItem('sonali_user_filter_branch', selectedBranchCode);

      setSubmittedRecord(record);
      setRecentList(prev => [record, ...prev]);

      if (onSuccessToast) {
        onSuccessToast(`বিল সফলভাবে সাবমিট হয়েছে! ট্র্যাকিং আইডি: ${trackingId}`);
      }
    } catch (err: any) {
      console.error('Submission error', err);
      setFormError('বিল সংরক্ষণে সমস্যা হয়েছে, দয়া করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedRecord(null);
    setAmount('');
    setDescription('');
    setVoucherNo('');
    setAttachments([]);
    setUploadError(null);
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyTracking = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (!isOpen) return null;

  // Compute total compressed size vs original size
  const totalOriginalBytes = attachments.reduce((acc, curr) => acc + (curr.originalSize || curr.fileSize), 0);
  const totalCompressedBytes = attachments.reduce((acc, curr) => acc + curr.fileSize, 0);
  const totalSavingsRatio = totalOriginalBytes > 0 
    ? Math.max(0, Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 sm:p-6 text-white flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Receipt size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  শাখা বিল ও ভাউচার সাবমিশন
                </h2>
                <span className="text-[10px] font-bold uppercase bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-md font-mono">
                  Branch Portal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 mt-0.5 font-medium">
                ভাউচার, মেমো ও কুরিয়ার স্লিপসহ শাখার খরচ সাবমিট করুন
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-all relative z-10"
            title="বন্ধ করুন"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 max-h-[82vh] overflow-y-auto space-y-6">
          
          {submittedRecord ? (
            /* Success State */
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/30 rounded-3xl p-6 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  বিল সফলভাবে সাবমিট হয়েছে!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  হেড অফিস এটি সরাসরি যাচাই ও বিল শিটে অনুমোদন করতে পারবে।
                </p>
              </div>

              {/* Tracking ID Badge */}
              <div className="bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl max-w-md mx-auto shadow-sm space-y-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  বিল ট্র্যাকিং আইডি (Tracking ID)
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    {submittedRecord.trackingId}
                  </span>
                  <button 
                    onClick={() => handleCopyTracking(submittedRecord.trackingId)}
                    className="p-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded-xl transition-all"
                    title="কপি করুন"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                {copiedTracking && (
                  <p className="text-xs text-emerald-600 font-bold">কপি করা হয়েছে!</p>
                )}
              </div>

              {/* Bill Summary Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left max-w-lg mx-auto bg-white/70 dark:bg-gray-800/70 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">শাখা:</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{submittedRecord.branchCode} - {submittedRecord.branchName}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">তারিখ:</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{submittedRecord.billDate}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">খাত:</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{submittedRecord.category}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">টাকার পরিমাণ:</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">৳ {submittedRecord.amount.toLocaleString('en-US')}</p>
                </div>

                {/* Multiple Attachments Summary List */}
                {submittedRecord.voucherAttachments && submittedRecord.voucherAttachments.length > 0 && (
                  <div className="col-span-2 sm:col-span-4 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-2 mt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <Paperclip size={14} />
                        <span>সংযুক্ত ভাউচার ফাইলসমূহ ({submittedRecord.voucherAttachments.length} টি):</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {submittedRecord.voucherAttachments.map((att, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 truncate">
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              {att.label || 'সংযুক্তি'}
                            </span>
                            <span className="truncate text-gray-700 dark:text-gray-300">{att.fileName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewAttachmentModal({
                              dataUrl: att.dataUrl,
                              fileName: att.fileName,
                              fileType: att.fileType,
                              title: `ভাউচার কপি - ট্র্যাকিং: ${submittedRecord.trackingId}`,
                              label: att.label
                            })}
                            className="p-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                            title="দেখুন"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleResetForm}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
                >
                  <PlusCircle size={16} />
                  <span>আরেকটি বিল এন্ট্রি দিন</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-sm transition-all"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          ) : (
            /* Entry Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Return for Correction Banner (if editing returned bill) */}
              {editingSubmission?.status === 'returned' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
                  <RotateCcw size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-300">
                      সংশোধনের জন্য শাখায় ফেরত পাঠানো বিল (Correction Required):
                    </h4>
                    <p className="mt-1 text-amber-700 dark:text-amber-300 leading-relaxed">
                      {editingSubmission.returnReason || 'হেড অফিস থেকে বিলটি পুনরায় নিরীক্ষার জন্য পাঠানো হয়েছে। ভুল সংশোধন করে সাবমিট করুন।'}
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicate Bill Warning Banner */}
              {duplicateCheck.isDuplicate && (
                <div className="p-4 bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-700 rounded-2xl flex items-start gap-3 text-xs text-red-900 dark:text-red-200 animate-in shake duration-300">
                  <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-bounce" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-red-800 dark:text-red-300 text-sm">
                        সতর্কতা: সম্ভাব্য ডুপ্লিকেট বিল সনাক্ত হয়েছে! (Duplicate Detected)
                      </h4>
                      <span className="text-[10px] bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full font-bold">
                        Warning
                      </span>
                    </div>
                    <p className="mt-1 text-red-700 dark:text-red-300 leading-relaxed font-medium">
                      {duplicateCheck.reason}
                    </p>
                    <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 font-semibold">
                      একই বিল একাধিকবার পরিশোধ হওয়া প্রতিরোধ করতে পুনরায় তারিখ, খাত ও টাকা যাচাই করুন।
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: Branch Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">১</span>
                    <span>শাখা নির্বাচন করুন (Branch Code or Name)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 font-medium px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-xs">
                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>শাখা আনলক করা (যেকোনো শাখা নির্বাচন করুন)</span>
                  </span>
                </div>
                
                <div className="relative" ref={branchDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input 
                      type="text"
                      value={branchQuery}
                      onChange={(e) => {
                        setBranchQuery(e.target.value);
                        setIsDropdownOpen(true);
                        if (!e.target.value.trim()) {
                          setSelectedBranchCode('');
                          setSelectedBranchName('');
                        }
                      }}
                      onFocus={() => {
                        setIsDropdownOpen(true);
                      }}
                      onClick={() => {
                        setIsDropdownOpen(true);
                      }}
                      placeholder="শাখা কোড (যেমন: 453) বা শাখার নাম লিখুন..."
                      className="w-full pl-10 pr-20 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-gray-800 cursor-text"
                    />
                    <div className="absolute right-3 top-2.5 flex items-center gap-1">
                      {selectedBranchCode && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBranchCode('');
                            setSelectedBranchName('');
                            setBranchQuery('');
                            setIsDropdownOpen(true);
                          }}
                          title="শাখা পরিবর্তন করতে মুছে ফেলুন"
                          className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <X size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                        title="শাখা তালিকা খুলুন"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-40 divide-y divide-gray-100 dark:divide-gray-700/50 animate-in fade-in duration-150">
                      <div className="p-2 bg-gray-50 dark:bg-gray-800/90 text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center justify-between sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                        <span>মোট পাওয়া গেছে: {filteredBranches.length} টি শাখা</span>
                        <span>ক্লিক করে শাখা বাছাই করুন</span>
                      </div>
                      {filteredBranches.length > 0 ? (
                        filteredBranches.map(([code, data]) => {
                          const isSelected = selectedBranchCode === code;
                          return (
                            <div 
                              key={code}
                              onClick={() => handleSelectBranch(code, data.branch, data.name, data.mobile)}
                              className={`p-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 font-semibold text-emerald-900 dark:text-emerald-200' 
                                  : 'hover:bg-emerald-50/50 dark:hover:bg-gray-700/60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                  isSelected 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                }`}>
                                  {code}
                                </span>
                                <span className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-200">{data.branch}</span>
                                {data.name && (
                                  <span className="text-[11px] text-gray-400 hidden sm:inline">({data.name})</span>
                                )}
                              </div>
                              <div className="text-right text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
                                <span className="font-mono">{data.mobile}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-500">
                          &quot;{branchQuery}&quot; দিয়ে কোনো শাখা পাওয়া যায়নি। সঠিক শাখা কোড বা নাম লিখুন।
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Officer Particulars */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">২</span>
                  <span>কর্মকর্তার তথ্য (Officer Info)</span>
                  <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                      কর্মকর্তার নাম <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <input 
                        type="text"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                        placeholder="কর্মকর্তার পূর্ণ নাম..."
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                      মোবাইল নম্বর <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <input 
                        type="tel"
                        value={officerPhone}
                        onChange={(e) => setOfficerPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Bill Particulars */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">৩</span>
                  <span>খরচ ও ভাউচারের বিবরণ (Expense Details)</span>
                  <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                      বিল বা খরচের তারিখ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <input 
                        type="date"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                      খরচের খাত (Category) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                      টাকার পরিমাণ (BDT) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-emerald-600 font-bold">৳</span>
                      <input 
                        type="number"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        স্বয়ংক্রিয় ভাউচার নং
                      </label>
                      <button
                        type="button"
                        onClick={() => setAutoVoucherNo(generateUniqueVoucherNumber())}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                        title="নতুন ভাউচার নম্বর তৈরি করুন"
                      >
                        <RefreshCw size={10} />
                        <span>নতুন কোড</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Receipt className="absolute left-3 top-2.5 text-emerald-600 w-4 h-4" />
                      <input 
                        type="text"
                        value={autoVoucherNo}
                        readOnly
                        className="w-full pl-9 pr-3 py-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                      কাগুজে মেমো / ক্যাশ রসিদ নং
                    </label>
                    <div className="relative">
                      <Receipt className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                      <input 
                        type="text"
                        value={voucherNo}
                        onChange={(e) => setVoucherNo(e.target.value)}
                        placeholder="যেমন: MEMO-2026-09"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block font-medium">
                      খরচের উদ্দেশ্য ও সংক্ষিপ্ত বিবরণ
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                      <input 
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="যেমন: সেপ্টেম্বর মাসের অফিস ভাড়া..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Multiple Voucher Files Upload & Auto-Compression */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">৪</span>
                    <span>ভাউচার ও মেমো ফাইল সংযুক্তি (Multiple Vouchers & Slips)</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Zap size={13} />
                    <span>ইমেজ অটো-কম্প্রেশন সক্রিয়</span>
                  </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  একসাথে ক্যাশ মেমো, কুরিয়ার স্লিপ, ডেলিভারি চালান বা অন্যান্য রসিদ আপলোড করুন। বড় সাইজের ছবি স্বয়ংক্রিয়ভাবে ঝকঝকে রেখে কম্প্রেস হয়ে যাবে।
                </p>

                {/* Hidden Native File Input (multiple support) */}
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                />

                {/* Uploaded Attachments List */}
                {attachments.length > 0 && (
                  <div className="space-y-2.5">
                    {/* Summary bar */}
                    <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-full text-[11px] font-bold">
                          {attachments.length} টি ফাইল সংযুক্ত
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          মোট কম্প্রেসড সাইজ: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{formatFileSize(totalCompressedBytes)}</strong>
                        </span>
                      </div>
                      {totalSavingsRatio > 0 && (
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                          <Zap size={11} /> {formatFileSize(totalOriginalBytes)} থেকে {totalSavingsRatio}% সাশ্রয়
                        </span>
                      )}
                    </div>

                    {/* Cards list for each attached file */}
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <div 
                          key={att.id}
                          className="bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-emerald-400 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Thumbnail */}
                            {att.fileType.startsWith('image/') ? (
                              <div 
                                onClick={() => setPreviewAttachmentModal({
                                  dataUrl: att.dataUrl,
                                  fileName: att.fileName,
                                  fileType: att.fileType,
                                  title: voucherNo ? `ভাউচার নং: ${voucherNo}` : 'সংযুক্ত ভাউচার',
                                  label: att.label
                                })}
                                className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 border border-emerald-300 dark:border-emerald-700 shrink-0 cursor-pointer group relative shadow-xs"
                                title="বড় করে দেখতে ক্লিক করুন"
                              >
                                <img 
                                  src={att.dataUrl} 
                                  alt="Voucher Preview" 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Eye size={16} />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                                PDF
                              </div>
                            )}

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-xs">
                                  {att.fileName}
                                </span>
                                {att.compressionRatio > 0 && (
                                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono">
                                    <Zap size={10} /> {att.compressionRatio}% কমপ্রেসড
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                                <span>সাইজ: {formatFileSize(att.fileSize)}</span>
                                {att.originalSize > att.fileSize && (
                                  <span className="text-[10px] text-gray-400 line-through">
                                    মূল: {formatFileSize(att.originalSize)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Category Tag Selector & Actions */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700/60">
                            {/* Document Type Selector */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-700">
                              <Tag size={12} className="text-emerald-600 shrink-0" />
                              <select
                                value={att.label}
                                onChange={(e) => updateAttachmentLabel(att.id, e.target.value)}
                                className="text-xs font-semibold bg-transparent outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
                              >
                                {VOUCHER_ATTACHMENT_LABELS.map(lbl => (
                                  <option key={lbl} value={lbl}>{lbl}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewAttachmentModal({
                                  dataUrl: att.dataUrl,
                                  fileName: att.fileName,
                                  fileType: att.fileType,
                                  title: voucherNo ? `ভাউচার নং: ${voucherNo}` : 'সংযুক্ত ভাউচার',
                                  label: att.label
                                })}
                                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="বড় করে প্রিভিউ দেখুন"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => removeAttachment(att.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                                title="এই ফাইলটি মুছে ফেলুন"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Zone & Add More Button */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 scale-[1.01]' 
                      : 'border-gray-300 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 hover:bg-emerald-50/40 dark:hover:bg-gray-800 hover:border-emerald-400'
                  }`}
                >
                  {isUploading ? (
                    <div className="py-2 flex flex-col items-center gap-2 text-emerald-600">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold">ভাউচার ফাইলগুলো প্রসেস ও কমপ্রেস হচ্ছে...</span>
                    </div>
                  ) : (
                    <div className="py-1 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                        {attachments.length > 0 ? <Plus size={20} /> : <Upload size={20} />}
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {attachments.length > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 underline decoration-dotted underline-offset-2">
                              + আরও ভাউচার / স্লিপ ফাইল যুক্ত করুন
                            </span>
                          ) : (
                            <>
                              <span className="text-emerald-600 dark:text-emerald-400 underline decoration-dotted underline-offset-2">
                                এখানে ক্লিক করে এক বা একাধিক ফাইল নির্বাচন করুন
                              </span> বা টেনে এনে ছাড়ুন
                            </>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          ক্যাশ মেমো, কুরিয়ার স্লিপ, চালান বা রসিদের ছবি (JPG, PNG, WebP) অথবা PDF কপি (একসাথে একাধিক ফাইল নির্বাচনযোগ্য)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Duplicate Bill Detection Warning Banner */}
              {duplicateCheck.isDuplicate && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-600 rounded-2xl flex items-start gap-3 animate-pulse">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <span>⚠️ ডুপ্লিকেট বিল সতর্কতা (Duplicate Bill Warning)</span>
                      <span className="text-[10px] bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded font-mono">শনাক্ত হয়েছে</span>
                    </div>
                    <p className="text-amber-700 dark:text-amber-300 font-medium">
                      {duplicateCheck.reason}
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      ভুলবশত একই বিল একাধিকবার জমা দেওয়া থেকে সতর্ক থাকুন। এটি নতুন বা ভিন্ন বিল হলে সাবমিট করতে পারেন।
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3.5 px-6 rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Send size={18} />
                  <span>{isSubmitting ? 'সাবমিট হচ্ছে...' : 'বিল সাবমিট করুন (Submit Bill)'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Recent Submissions Section */}
          {recentList.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>সম্প্রতি দাখিলকৃত বিলসমূহ (Recent Claims)</span>
                </h4>
                <span className="text-[11px] text-gray-400">সর্বশেষ ৫টি বিল</span>
              </div>

              <div className="space-y-2">
                {recentList.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="font-mono bg-white dark:bg-gray-900 px-2.5 py-1 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-emerald-700 dark:text-emerald-400 text-xs shrink-0">
                        {item.branchCode}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-gray-800 dark:text-gray-200 truncate">
                          {item.branchName} • {item.category}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 font-mono">
                          <span>{item.billDate}</span>
                          <span>•</span>
                          <span className="text-gray-600 dark:text-gray-300">{item.trackingId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                          ৳ {item.amount.toLocaleString('en-US')}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {item.voucherAttachments && item.voucherAttachments.length > 0 
                            ? `${item.voucherAttachments.length}টি ভাউচার ফাইল` 
                            : item.voucherAttachment ? '১টি ভাউচার ফাইল' : 'ভাউচার নেই'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {previewAttachmentModal && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 truncate">
                <Receipt size={18} className="text-emerald-600 shrink-0" />
                <div className="truncate">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {previewAttachmentModal.title || 'ভাউচার প্রিভিউ'}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {previewAttachmentModal.label && (
                      <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded mr-1.5 font-bold">
                        {previewAttachmentModal.label}
                      </span>
                    )}
                    {previewAttachmentModal.fileName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachmentModal.dataUrl}
                  download={previewAttachmentModal.fileName}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-xs"
                  title="ডাউনলোড করুন"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachmentModal(null)}
                  className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-950/5 dark:bg-black/50 min-h-[300px]">
              {previewAttachmentModal.fileType.startsWith('application/pdf') ? (
                <iframe 
                  src={previewAttachmentModal.dataUrl} 
                  title="PDF Preview"
                  className="w-full h-[65vh] rounded-xl border border-gray-200 dark:border-gray-800 bg-white"
                />
              ) : (
                <img 
                  src={previewAttachmentModal.dataUrl} 
                  alt="Voucher Full View" 
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-gray-200 dark:border-gray-800"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
