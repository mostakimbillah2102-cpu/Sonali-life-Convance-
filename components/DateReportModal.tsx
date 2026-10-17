import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  CheckSquare, 
  Square, 
  Building2, 
  Sparkles, 
  Filter, 
  ArrowRight,
  Trash2,
  Paperclip,
  Eye,
  Download,
  Receipt,
  ChevronDown,
  History,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  BarChart3,
  Edit,
  Clock
} from 'lucide-react';
import { BranchDatabase, BranchSubmission, BillItem, UserProfileData } from '../types';
import { 
  fetchSubmissionsByDateRange, 
  updateSubmissionStatus, 
  deleteSubmission,
  returnSubmissionForCorrection,
  bulkUpdateSubmissionStatus,
  exportToExcel,
  getMonthlyComparisonData,
  EXPENSE_CATEGORIES
} from '../utils/branchSubmissions';
import { canApproveBill, canReturnBill, canPayBill, canDeleteBill } from '../utils/authRoles';
import { ApprovalHistoryModal } from './ApprovalHistoryModal';

interface DateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchesMap: BranchDatabase;
  onLoadIntoBill: (items: BillItem[], generatedNote: string) => void;
  onSuccessToast?: (msg: string) => void;
  currentUserProfile?: UserProfileData;
  onOpenEditSubmission?: (submission: BranchSubmission) => void;
}

export const DateReportModal: React.FC<DateReportModalProps> = ({
  isOpen,
  onClose,
  branchesMap,
  onLoadIntoBill,
  onSuccessToast,
  currentUserProfile,
  onOpenEditSubmission
}) => {
  // Date State: Default to first of current month and today
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const firstOfMonthStr = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  }, []);

  const [fromDate, setFromDate] = useState(firstOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);

  // Filters
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Query Results
  const [submissions, setSubmissions] = useState<BranchSubmission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Voucher Lightbox State
  const [viewVoucher, setViewVoucher] = useState<BranchSubmission | null>(null);
  const [activeAttachmentIndex, setActiveAttachmentIndex] = useState<number>(0);

  // Helper to extract all attachments normalized
  const getSubAttachments = (sub: BranchSubmission) => {
    if (sub.voucherAttachments && sub.voucherAttachments.length > 0) {
      return sub.voucherAttachments;
    }
    if (sub.voucherAttachment) {
      return [{
        id: 'att-1',
        fileName: sub.voucherFileName || 'voucher.jpg',
        fileType: sub.voucherFileType || 'image/jpeg',
        fileSize: 0,
        dataUrl: sub.voucherAttachment,
        label: 'ক্যাশ মেমো / ভাউচার'
      }];
    }
    return [];
  };

  // View Mode: 'table' | 'vouchers' | 'monthly'
  const [activeTab, setActiveTab] = useState<'table' | 'vouchers' | 'monthly'>('table');
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);

  // Workflow Dialog States
  const [historyModalSubmission, setHistoryModalSubmission] = useState<BranchSubmission | null>(null);
  const [returnModalSubmission, setReturnModalSubmission] = useState<BranchSubmission | null>(null);
  const [returnReasonText, setReturnReasonText] = useState('');
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to escape HTML characters for safe printable template
  const escapeHtml = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Load submissions whenever dates or filters change or on modal open
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSubmissionsByDateRange(
        fromDate,
        toDate,
        filterBranch,
        filterCategory,
        filterStatus
      );
      setSubmissions(data);
      // Select all by default
      setSelectedIds(new Set(data.map(d => d.id)));
    } catch (e) {
      console.error('Failed to fetch submissions', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, fromDate, toDate, filterBranch, filterCategory, filterStatus]);

  // Quick Preset Handlers
  const handleSetPreset = (preset: 'today' | 'this_month' | 'last_month' | 'last_30_days') => {
    const now = new Date();
    if (preset === 'today') {
      const t = now.toISOString().split('T')[0];
      setFromDate(t);
      setToDate(t);
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = now.toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'last_30_days') {
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(now.toISOString().split('T')[0]);
    }
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered submissions including searchQuery and branch officer restriction
  const displaySubmissions = useMemo(() => {
    let list = submissions;

    // If branch officer, restrict to their branch
    if (currentUserProfile?.role === 'branch_officer' && currentUserProfile.branchCode) {
      list = list.filter(s => s.branchCode === currentUserProfile.branchCode);
    }

    // Search query filter (trackingId, officer, category, voucherNo, description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.trackingId.toLowerCase().includes(q) ||
        (s.autoVoucherNo && s.autoVoucherNo.toLowerCase().includes(q)) ||
        s.branchCode.toLowerCase().includes(q) ||
        s.branchName.toLowerCase().includes(q) ||
        s.officerName.toLowerCase().includes(q) ||
        s.officerPhone.includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.voucherNo && s.voucherNo.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [submissions, searchQuery, currentUserProfile]);

  // Breakdown statistics for Smart Dashboard
  const pendingList = useMemo(() => displaySubmissions.filter(s => s.status === 'submitted' || s.status === 'under_review'), [displaySubmissions]);
  const approvedList = useMemo(() => displaySubmissions.filter(s => s.status === 'approved'), [displaySubmissions]);
  const paidList = useMemo(() => displaySubmissions.filter(s => s.status === 'paid' || s.status === 'billed'), [displaySubmissions]);
  const returnedList = useMemo(() => displaySubmissions.filter(s => s.status === 'returned'), [displaySubmissions]);

  const pendingAmount = useMemo(() => pendingList.reduce((acc, c) => acc + (c.amount || 0), 0), [pendingList]);
  const approvedAmount = useMemo(() => approvedList.reduce((acc, c) => acc + (c.amount || 0), 0), [approvedList]);
  const paidAmount = useMemo(() => paidList.reduce((acc, c) => acc + (c.amount || 0), 0), [paidList]);
  const returnedAmount = useMemo(() => returnedList.reduce((acc, c) => acc + (c.amount || 0), 0), [returnedList]);

  const monthlyComparison = useMemo(() => getMonthlyComparisonData(displaySubmissions), [displaySubmissions]);

  // Current User Actor for audit logging
  const currentActor = useMemo(() => {
    return {
      uid: currentUserProfile?.uid || 'admin',
      name: currentUserProfile?.displayName || 'হেড অফিস অ্যাডমিন',
      email: currentUserProfile?.email || 'admin@sonalilife.com',
      role: currentUserProfile?.role || 'head_office_admin'
    };
  }, [currentUserProfile]);

  // Stats Calculations
  const totalSubmissionsCount = displaySubmissions.length;
  const uniqueBranchesCount = useMemo(() => {
    return new Set(displaySubmissions.map(s => s.branchCode)).size;
  }, [displaySubmissions]);

  const totalSumAmount = useMemo(() => {
    return displaySubmissions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [displaySubmissions]);

  const selectedSumAmount = useMemo(() => {
    return displaySubmissions
      .filter(s => selectedIds.has(s.id))
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [displaySubmissions, selectedIds]);

  const vouchersWithAttachment = useMemo(() => {
    return displaySubmissions.filter(s => getSubAttachments(s).length > 0);
  }, [displaySubmissions]);

  const vouchersWithAttachmentCount = vouchersWithAttachment.length;

  const vouchersTotalAmount = useMemo(() => {
    return vouchersWithAttachment.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [vouchersWithAttachment]);

  // Workflow Handlers
  const handleApprove = async (sub: BranchSubmission) => {
    try {
      await updateSubmissionStatus(sub.id, 'approved', currentActor, 'হেড অফিস কর্তৃক অনুমোদিত');
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'approved', approvedBy: currentActor.name } : s));
      onSuccessToast?.(`বিল '${sub.trackingId}' সফলভাবে অনুমোদিত হয়েছে!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenReturnModal = (sub: BranchSubmission) => {
    setReturnModalSubmission(sub);
    setReturnReasonText('');
  };

  const handleConfirmReturn = async () => {
    if (!returnModalSubmission) return;
    if (!returnReasonText.trim()) {
      alert('অনুগ্রহ করে সংশোধনের সুনির্দিষ্ট কারণ বা নির্দেশনা লিখুন।');
      return;
    }
    setIsReturnSubmitting(true);
    try {
      await returnSubmissionForCorrection(returnModalSubmission.id, returnReasonText.trim(), currentActor);
      setSubmissions(prev => prev.map(s => s.id === returnModalSubmission.id ? { 
        ...s, 
        status: 'returned', 
        returnReason: returnReasonText.trim() 
      } : s));
      onSuccessToast?.(`বিলটি সংশোধনের জন্য শাখায় ফেরত পাঠানো হয়েছে।`);
      setReturnModalSubmission(null);
      setReturnReasonText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsReturnSubmitting(false);
    }
  };

  const handleMarkPaid = async (sub: BranchSubmission) => {
    try {
      await updateSubmissionStatus(sub.id, 'paid', currentActor, 'হিসাব বিভাগ কর্তৃক বিল পরিশোধিত');
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'paid', paidBy: currentActor.name } : s));
      onSuccessToast?.(`বিল '${sub.trackingId}' পরিশোধিত হিসেবে চিহ্নিত করা হয়েছে।`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkLoading(true);
    try {
      const { successCount } = await bulkUpdateSubmissionStatus(ids, 'approved', currentActor);
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'approved', approvedBy: currentActor.name } : s));
      onSuccessToast?.(`${successCount} টি বিল এক ক্লিকে সফলভাবে অনুমোদিত হয়েছে!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkMarkPaid = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkLoading(true);
    try {
      const { successCount } = await bulkUpdateSubmissionStatus(ids, 'paid', currentActor);
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'paid', paidBy: currentActor.name } : s));
      onSuccessToast?.(`${successCount} টি বিল সফলভাবে পরিশোধিত চিহ্নিত হয়েছে!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleExportExcelFile = () => {
    if (displaySubmissions.length === 0) {
      alert('এক্সপোর্ট করার জন্য কোনো বিল নেই।');
      return;
    }
    exportToExcel(displaySubmissions, {
      title: 'সোনালী লাইফ শাখা ভাউচার ও ব্যয় বিবরণী রিপোর্ট',
      fromDate,
      toDate,
      filterBranch
    });
    onSuccessToast?.('Excel (.xlsx) রিপোর্ট সফলভাবে ডাউনলোড হয়েছে!');
  };

  // Action: Convert Selected Submissions to Main Bill Sheet (Auto Billing)
  const handleGenerateBill = () => {
    const selectedItems = displaySubmissions.filter(s => selectedIds.has(s.id));
    if (selectedItems.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি বিল নির্বাচন করুন।');
      return;
    }

    // Group or map to BillItem[]
    const billItemsList: BillItem[] = selectedItems.map((sub, idx) => {
      const branchInfo = branchesMap[sub.branchCode] || {
        branch: sub.branchName,
        name: sub.officerName,
        mobile: sub.officerPhone,
        ext: '',
        email: sub.officerEmail || ''
      };

      return {
        code: sub.branchCode,
        serial: String(idx + 1),
        branch: branchInfo.branch,
        name: sub.officerName || branchInfo.name,
        mobile: sub.officerPhone || branchInfo.mobile,
        ext: branchInfo.ext || '',
        email: sub.officerEmail || branchInfo.email || '',
        amount: String(sub.amount),
        calculation: `${sub.category} [${sub.billDate}] ${sub.description ? '(' + sub.description + ')' : ''}`,
      };
    });

    const note = `তারিখঃ ${fromDate} হতে ${toDate} পর্যন্ত বিভিন্ন শাখার দাখিলকৃত বিল বাবদ। মোট অনুমোদিত বিল সংখ্যাঃ ${billItemsList.length} টি, সর্বমোট টাকাঃ ৳ ${selectedSumAmount.toLocaleString('en-US')}/-।`;

    onLoadIntoBill(billItemsList, note);

    // Optionally mark these as 'billed'
    selectedItems.forEach(item => {
      if (item.status === 'submitted') {
        updateSubmissionStatus(item.id, 'billed', currentActor).catch(() => {});
      }
    });

    if (onSuccessToast) {
      onSuccessToast(`${billItemsList.length} টি শাখার বিল সফলভাবে বিল শিটে লোড হয়েছে!`);
    }

    onClose();
  };

  // Action: Export CSV
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('এক্সপোর্ট করার মতো কোনো বিল পাওয়া যায়নি।');
      return;
    }

    const headers = ['SL', 'Tracking ID', 'Bill Date', 'Branch Code', 'Branch Name', 'Officer Name', 'Mobile', 'Category', 'Voucher No', 'Voucher File Attached', 'Voucher File Name', 'Amount (BDT)', 'Description', 'Status'];
    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.trackingId}"`,
      `"${s.billDate}"`,
      `"${s.branchCode}"`,
      `"${s.branchName.replace(/"/g, '""')}"`,
      `"${s.officerName.replace(/"/g, '""')}"`,
      `"${s.officerPhone}"`,
      `"${s.category.replace(/"/g, '""')}"`,
      `"${(s.voucherNo || '').replace(/"/g, '""')}"`,
      `"${s.voucherAttachment ? 'Yes' : 'No'}"`,
      `"${(s.voucherFileName || '').replace(/"/g, '""')}"`,
      s.amount,
      `"${(s.description || '').replace(/"/g, '""')}"`,
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sonali_Life_Branch_Bills_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action: Print Single Voucher Docket (or raw voucher only)
  const handlePrintSingleVoucher = (item: BranchSubmission, rawOnly: boolean = false) => {
    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) return;

    const attachments = getSubAttachments(item);
    if (attachments.length === 0) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${rawOnly ? 'রসিদ ও মেমো' : 'ভাউচার ডসিয়ার'} - ${escapeHtml(item.branchCode)} - ${escapeHtml(item.trackingId)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: ${rawOnly ? '4mm' : '8mm 10mm 10mm 10mm'};
          }
          body {
            font-family: 'SolaimanLipi', 'Kalpurush', 'Inter', Arial, sans-serif;
            color: #111;
            font-size: 12px;
            margin: 0;
            padding: ${rawOnly ? '0' : '10px'};
          }
          .voucher-docket {
            min-height: 94vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
          }
          .voucher-docket:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .voucher-raw-page {
            min-height: 98vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            padding: 0;
            margin: 0;
          }
          .voucher-raw-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .raw-img-box {
            width: 100%;
            height: 100%;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
          }
          .raw-img {
            max-width: 100%;
            max-height: 97vh;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          .header {
            border-bottom: 2px solid #047857;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 11px;
          }
          .meta-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
          }
          .lbl {
            background: #f8fafc;
            font-weight: bold;
            width: 17%;
          }
          .val {
            width: 33%;
          }
          .voucher-box {
            flex: 1;
            border: 1.5px dashed #94a3b8;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            background: #ffffff;
            min-height: 480px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .voucher-img {
            max-width: 98%;
            max-height: 560px;
            object-fit: contain;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.12);
          }
          .footer-sig {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 11px;
          }
          .sig-box {
            border-top: 1px solid #444;
            width: 130px;
            padding-top: 4px;
            font-weight: 600;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${attachments.map((att, attIdx) => {
          if (rawOnly) {
            return `
              <div class="voucher-raw-page">
                <div class="raw-img-box">
                  ${att.fileType?.startsWith('application/pdf') ? `
                    <div style="padding: 50px; text-align: center; color: #334155; border: 1px dashed #cbd5e1; border-radius: 8px; width: 100%;">
                      <div style="font-size: 42px; color: #dc2626; font-weight: bold; margin-bottom: 8px;">PDF</div>
                      <div style="font-size: 14px; font-weight: bold;">সংযুক্ত PDF ভাউচার ফাইলঃ ${escapeHtml(att.fileName)}</div>
                      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">মূল PDF কপিটি সিস্টেম আর্কাইভে সংরক্ষিত আছে</div>
                    </div>
                  ` : `
                    <img src="${att.dataUrl}" class="raw-img" alt="${escapeHtml(att.fileName)}" />
                  `}
                </div>
              </div>
            `;
          }

          return `
            <div class="voucher-docket">
              <div>
                <div class="header">
                  <div>
                    <h1 style="font-size: 18px; color: #047857; margin: 0; font-weight: bold;">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h1>
                    <div style="font-size: 10px; font-weight: bold; color: #059669; font-family: Arial, sans-serif;">SONALI LIFE INSURANCE COMPANY LIMITED</div>
                    <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-top: 3px;">
                      শাখা খরচের সংযুক্ত ভাউচার / মেমো কপি • <span style="color: #047857;">${escapeHtml(att.label || 'ভাউচার')} (${attIdx + 1}/${attachments.length})</span>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #065f46;">
                      ট্র্যাকিং আইডি: ${escapeHtml(item.trackingId)}
                    </div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">সংযুক্তি ${attIdx + 1} / ${attachments.length}</div>
                  </div>
                </div>

                <table class="meta-table">
                  <tbody>
                    <tr>
                      <td class="lbl">শাখার নাম ও কোড:</td>
                      <td class="val"><strong>${escapeHtml(item.branchCode)} - ${escapeHtml(item.branchName)}</strong></td>
                      <td class="lbl">বিলের তারিখ:</td>
                      <td class="val"><strong style="font-family: monospace;">${escapeHtml(item.billDate)}</strong></td>
                    </tr>
                    <tr>
                      <td class="lbl">কর্মকর্তা ও মোবাইল:</td>
                      <td class="val">${escapeHtml(item.officerName)} (${escapeHtml(item.officerPhone)})</td>
                      <td class="lbl">মেমো / ভাউচার নং:</td>
                      <td class="val"><strong style="font-family: monospace; color: #1d4ed8;">${escapeHtml(item.voucherNo || 'N/A')}</strong></td>
                    </tr>
                    <tr>
                      <td class="lbl">খরচের খাত:</td>
                      <td class="val"><strong>${escapeHtml(item.category)}</strong></td>
                      <td class="lbl">টাকার পরিমাণ:</td>
                      <td class="val"><strong style="font-family: monospace; color: #047857; font-size: 14px;">৳ ${item.amount.toLocaleString('en-US')}/-</strong></td>
                    </tr>
                    <tr>
                      <td class="lbl">সংযুক্ত ফাইলের বিবরণ:</td>
                      <td colspan="3" class="val">
                        <strong>${escapeHtml(att.label || 'ভাউচার')}</strong>: ${escapeHtml(att.fileName)}
                        ${item.description ? ` | <span style="color: #555;">${escapeHtml(item.description)}</span>` : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="voucher-box">
                  ${att.fileType?.startsWith('application/pdf') ? `
                    <div style="padding: 40px; text-align: center; color: #334155;">
                      <div style="font-size: 40px; color: #dc2626; font-weight: bold; margin-bottom: 8px;">PDF</div>
                      <div style="font-size: 14px; font-weight: bold;">সংযুক্ত PDF ভাউচার ফাইলঃ ${escapeHtml(att.fileName)}</div>
                      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">মূল PDF কপিটি সিস্টেম আর্কাইভে সংরক্ষিত আছে</div>
                    </div>
                  ` : `
                    <img src="${att.dataUrl}" class="voucher-img" alt="${escapeHtml(att.fileName)}" />
                  `}
                </div>
              </div>

              <div class="footer-sig">
                <div class="sig-box">দাখিলকারী কর্মকর্তা</div>
                <div class="sig-box">রসিদ যাচাইকারী</div>
                <div class="sig-box">হিসাব বিভাগ (Accounts)</div>
                <div class="sig-box">অনুমোদনকারী কর্তৃপক্ষ</div>
              </div>
            </div>
          `;
        }).join('')}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // Action: Print Consolidated Report (Full with Vouchers / Vouchers Only / Raw Vouchers Only / Table Only)
  const handlePrintReport = (mode: 'full' | 'vouchers_only' | 'raw_vouchers_only' | 'table_only' = 'full') => {
    const selectedList = submissions.filter(s => selectedIds.has(s.id));
    if (selectedList.length === 0) {
      alert('প্রিন্ট করার জন্য অন্তত একটি বিল নির্বাচন করুন।');
      return;
    }

    const vouchersInList = selectedList.filter(s => getSubAttachments(s).length > 0);
    if ((mode === 'vouchers_only' || mode === 'raw_vouchers_only') && vouchersInList.length === 0) {
      alert('নির্বাচিত বিলগুলোর মধ্যে কোনোটিতে ভাউচার বা মেমো ফাইল সংযুক্ত নেই।');
      return;
    }

    const printWin = window.open('', '_blank', 'width=1000,height=800');
    if (!printWin) return;

    const includeTable = mode === 'full' || mode === 'table_only';
    const includeVouchers = mode === 'full' || mode === 'vouchers_only';
    const includeRawVouchers = mode === 'raw_vouchers_only';

    const rowsHtml = selectedList.map((item, idx) => {
      const atts = getSubAttachments(item);
      return `
      <tr>
        <td style="border: 1px solid #999; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #999; padding: 6px; text-align: center; font-family: monospace;">${escapeHtml(item.billDate)}</td>
        <td style="border: 1px solid #999; padding: 6px; text-align: center; font-weight: bold; font-family: monospace;">${escapeHtml(item.branchCode)}</td>
        <td style="border: 1px solid #999; padding: 6px; font-weight: 500;">${escapeHtml(item.branchName)}</td>
        <td style="border: 1px solid #999; padding: 6px;">${escapeHtml(item.officerName)}<br><small style="color: #666;">${escapeHtml(item.officerPhone)}</small></td>
        <td style="border: 1px solid #999; padding: 6px;">${escapeHtml(item.category)}</td>
        <td style="border: 1px solid #999; padding: 6px; font-size: 11px;">
          ${escapeHtml(item.description || '-')}
          ${item.voucherNo ? `<div style="color: #1d4ed8; font-family: monospace; font-weight: bold; margin-top: 2px;">ভাউচারঃ ${escapeHtml(item.voucherNo)}</div>` : ''}
          ${atts.length > 0 ? `<div style="color: #047857; font-weight: bold; font-size: 10px; margin-top: 2px;">📎 ${atts.length}টি ভাউচার ফাইল সংযুক্ত</div>` : ''}
        </td>
        <td style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold; font-family: monospace;">৳ ${item.amount.toLocaleString('en-US')}/-</td>
      </tr>
    `;
    }).join('');

    // Generate Raw Vouchers HTML: Pure receipts and memos sequentially - NO headers, NO tracking IDs, NO captions, ONLY the uploaded voucher/memo
    const rawVoucherPagesHtml = includeRawVouchers ? vouchersInList.flatMap((item, vIdx) => {
      const atts = getSubAttachments(item);
      return atts.map((att, attIdx) => {
        return `
          <div class="voucher-raw-page">
            <div class="raw-image-container">
              ${att.fileType?.startsWith('application/pdf') ? `
                <div style="padding: 60px 20px; text-align: center; color: #334155; border: 1.5px dashed #cbd5e1; border-radius: 8px; width: 90%;">
                  <div style="font-size: 46px; color: #dc2626; font-weight: bold; margin-bottom: 10px;">PDF</div>
                  <div style="font-size: 16px; font-weight: bold; color: #1e293b;">সংযুক্ত PDF ভাউচার / মেমো কপিঃ ${escapeHtml(att.fileName)}</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 6px;">বিল #${vIdx + 1} | ফাইল ${attIdx + 1}/${atts.length} — মূল PDF কপিটি সিস্টেমে সংরক্ষিত</div>
                </div>
              ` : `
                <img src="${att.dataUrl}" class="raw-full-image" alt="${escapeHtml(att.fileName)}" />
              `}
            </div>
          </div>
        `;
      });
    }).join('') : '';

    // Generate Standard Voucher Docket Pages (with official Sonali Life header, metadata table, and signatures)
    const voucherPagesHtml = includeVouchers ? vouchersInList.flatMap((item, vIdx) => {
      const atts = getSubAttachments(item);
      return atts.map((att, attIdx) => `
        <div class="voucher-docket-page">
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #047857; padding-bottom: 8px;">
              <div>
                <h1 style="font-size: 18px; color: #047857; margin: 0; font-weight: bold;">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h1>
                <div style="font-size: 10px; font-weight: bold; color: #059669; font-family: Arial, sans-serif;">SONALI LIFE INSURANCE COMPANY LIMITED</div>
                <div style="font-size: 12.5px; font-weight: bold; color: #1e293b; margin-top: 3px;">
                  দাখিলকৃত বিলের সংযুক্ত ভাউচার / মেমো কপি • <span style="color: #047857;">${escapeHtml(att.label || 'ভাউচার')} (${attIdx + 1}/${atts.length})</span>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="display: inline-block; background: #ecfdf5; border: 1px solid #10b981; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: bold; color: #065f46;">
                  ট্র্যাকিং আইডি: ${escapeHtml(item.trackingId)}
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                  বিল #${vIdx + 1} | ফাইল ${attIdx + 1}/${atts.length}
                </div>
              </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; font-size: 11px;">
            <tbody>
              <tr>
                <td style="width: 16%; background: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 8px;">শাখার নাম ও কোড:</td>
                <td style="width: 34%; border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: bold;">${escapeHtml(item.branchCode)} - ${escapeHtml(item.branchName)}</td>
                <td style="width: 16%; background: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 8px;">বিলের তারিখ:</td>
                <td style="width: 34%; border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; font-weight: bold;">${escapeHtml(item.billDate)}</td>
              </tr>
              <tr>
                <td style="background: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 8px;">কর্মকর্তা ও মোবাইল:</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${escapeHtml(item.officerName)} (${escapeHtml(item.officerPhone)})</td>
                <td style="background: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 8px;">মেমো / ভাউচার নং:</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; font-weight: bold; color: #1d4ed8;">${escapeHtml(item.voucherNo || 'N/A')}</td>
              </tr>
              <tr>
                <td style="background: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 8px;">খরচের খাত:</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: bold;">${escapeHtml(item.category)}</td>
                <td style="background: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 8px;">টাকার পরিমাণ:</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; font-weight: bold; color: #047857; font-size: 13.5px;">৳ ${item.amount.toLocaleString('en-US')}/-</td>
              </tr>
              <tr>
                <td style="background: #f8fafc; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 8px;">সংযুক্ত ফাইলের বিবরণ:</td>
                <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px 8px;">
                  <strong>${escapeHtml(att.label || 'ভাউচার')}</strong>: ${escapeHtml(att.fileName)}
                  ${item.description ? ` | <span style="color: #555;">${escapeHtml(item.description)}</span>` : ''}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Voucher Attachment Display -->
          <div style="flex: 1; border: 1.5px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center; background: #ffffff; min-height: 480px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
            ${att.fileType?.startsWith('application/pdf') ? `
              <div style="padding: 35px; text-align: center; color: #334155;">
                <div style="font-size: 38px; color: #dc2626; font-weight: bold; margin-bottom: 8px;">PDF</div>
                <div style="font-size: 14px; font-weight: bold;">সংযুক্ত PDF ভাউচার ফাইলঃ ${escapeHtml(att.fileName)}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">মূল PDF কপিটি সিস্টেম আর্কাইভে সংরক্ষিত আছে</div>
              </div>
            ` : `
              <img src="${att.dataUrl}" style="max-width: 98%; max-height: 560px; object-fit: contain; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.12);" alt="${escapeHtml(att.fileName)}" />
            `}
          </div>

          <!-- Verification Signatures -->
          <div style="margin-top: 25px; display: flex; justify-content: space-between; text-align: center; font-size: 11px;">
            <div style="border-top: 1px solid #444; width: 140px; padding-top: 4px; font-weight: 600;">শাখা দাখিলকারী স্বাক্ষর</div>
            <div style="border-top: 1px solid #444; width: 140px; padding-top: 4px; font-weight: 600;">রসিদ যাচাইকারী</div>
            <div style="border-top: 1px solid #444; width: 140px; padding-top: 4px; font-weight: 600;">হিসাব বিভাগ (Accounts)</div>
            <div style="border-top: 1px solid #444; width: 140px; padding-top: 4px; font-weight: 600;">অনুমোদনকারী কর্তৃপক্ষ</div>
          </div>
        </div>
      `);
    }).join('') : '';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${includeRawVouchers ? 'রসিদ ও মেমো' : 'শাখা বিল ও ভাউচার রিপোর্ট'} - সোনালী লাইফ ইন্স্যুরেন্স</title>
        <style>
          @page {
            size: A4 portrait;
            margin: ${includeRawVouchers ? '4mm' : '8mm 10mm 10mm 10mm'};
          }
          body {
            font-family: 'SolaimanLipi', 'Kalpurush', 'Inter', Arial, sans-serif;
            color: #111;
            font-size: 12px;
            margin: 0;
            padding: ${includeRawVouchers ? '0' : '12px'};
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #047857;
            padding-bottom: 12px;
            margin-bottom: 15px;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #047857;
            margin: 0;
          }
          .subtitle {
            font-size: 12px;
            color: #333;
            margin-top: 3px;
            font-weight: bold;
          }
          .report-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 11.5px;
            font-weight: 500;
            background: #f0fdf4;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #bbf7d0;
          }
          table.summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11.5px;
          }
          table.summary-table th {
            background: #047857;
            color: white;
            border: 1px solid #065f46;
            padding: 7px 5px;
            font-size: 11.5px;
            text-align: center;
          }
          .footer-sig {
            margin-top: 55px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 11.5px;
          }
          .signature-box {
            border-top: 1px solid #444;
            width: 150px;
            padding-top: 5px;
            font-weight: 600;
          }
          .voucher-docket-page {
            page-break-before: always;
            break-before: page;
            page-break-inside: avoid;
            break-inside: avoid;
            padding-top: 12px;
            min-height: 94vh;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          /* Pure Raw Receipt & Memo Serial Page Styling */
          .voucher-raw-page {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            min-height: 98vh;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0;
            margin: 0;
          }
          .voucher-raw-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .raw-image-container {
            width: 100%;
            height: 100%;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 0;
            background: #ffffff;
          }
          .raw-full-image {
            max-width: 100%;
            max-height: 97vh;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          @media print {
            body { padding: ${includeRawVouchers ? '0' : '4px'}; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${includeTable ? `
          <div class="header">
            <h1 class="title">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h1>
            <div style="font-size: 11px; font-weight: bold; color: #059669; font-family: Arial, sans-serif;">SONALI LIFE INSURANCE COMPANY LIMITED</div>
            <div class="subtitle">শাখা ও কর্মকর্তাদের দাখিলকৃত বিল ও খরচের বিবরণী (Date Range Bill Report)</div>
          </div>

          <div class="report-meta">
            <div><strong>তারিখ রেঞ্জঃ</strong> ${escapeHtml(fromDate)} হতে ${escapeHtml(toDate)} পর্যন্ত</div>
            <div><strong>মোট বিলঃ</strong> ${selectedList.length} টি (${vouchersInList.length} টিতে ভাউচার ফাইল সংযুক্ত)</div>
            <div><strong>সর্বমোট টাকার পরিমাণঃ</strong> ৳ ${selectedSumAmount.toLocaleString('en-US')}/-</div>
          </div>

          <table class="summary-table">
            <thead>
              <tr>
                <th style="width: 32px;">ক্রঃ</th>
                <th style="width: 75px;">তারিখ</th>
                <th style="width: 50px;">কোড</th>
                <th style="width: 130px;">শাখার নাম</th>
                <th style="width: 125px;">কর্মকর্তা ও মোবাইল</th>
                <th style="width: 120px;">খরচের খাত</th>
                <th>বিবরণ ও ভাউচার</th>
                <th style="width: 85px;">টাকার পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #e2e8f0; font-weight: bold;">
                <td colspan="7" style="border: 1px solid #999; padding: 7px; text-align: right;">সর্বমোট পরিমাণ (Grand Total):</td>
                <td style="border: 1px solid #999; padding: 7px; text-align: right; font-family: monospace; font-size: 13px;">৳ ${selectedSumAmount.toLocaleString('en-US')}/-</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer-sig">
            <div class="signature-box">প্রস্তুতকারক</div>
            <div class="signature-box">যাচাইকারী কর্মকর্তা</div>
            <div class="signature-box">হিসাব বিভাগ</div>
            <div class="signature-box">অনুমোদনকারী কর্তৃপক্ষ</div>
          </div>
        ` : ''}

        ${includeVouchers ? voucherPagesHtml : ''}
        ${includeRawVouchers ? rawVoucherPagesHtml : ''}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Auto-reset delete confirmation after 4 seconds
  useEffect(() => {
    if (!deleteConfirmId) return;
    const timer = setTimeout(() => {
      setDeleteConfirmId(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [deleteConfirmId]);

  const handleDeleteItem = async (id: string) => {
    try {
      setIsDeletingId(id);
      await deleteSubmission(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteConfirmId(null);
      if (onSuccessToast) {
        onSuccessToast('বিল এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে');
      }
    } catch (e) {
      console.error('Delete submission error:', e);
      // Ensure UI stays responsive even if Firestore throws error
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteConfirmId(null);
      if (onSuccessToast) {
        onSuccessToast('বিল এন্ট্রি তালিকা থেকে মুছে ফেলা হয়েছে');
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">তারিখ ভিত্তিক বিল রিপোর্ট ও অটো বিলিং</h2>
                <span className="text-[11px] bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full border border-white/30 font-mono">
                  Date Range Hub
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5 font-medium">
                শাখা ও কর্মকর্তাদের দাখিলকৃত বিল তারিখ দিয়ে ফিল্টার করুন এবং এক ক্লিকে ফাইনাল বিল তৈরি করুন
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

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700/60 space-y-4">
          
          {/* Row 1: Date Range & Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">হতে (From):</span>
                <input 
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-xs font-bold font-mono bg-transparent outline-none text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">পর্যন্ত (To):</span>
                <input 
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-xs font-bold font-mono bg-transparent outline-none text-gray-800 dark:text-gray-100"
                />
              </div>

              <button
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Search size={14} />
                <span>{isLoading ? 'লোড হচ্ছে...' : 'খুঁজুন (Search)'}</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 text-[11px] hidden sm:inline">দ্রুত নির্বাচন:</span>
              <button 
                onClick={() => handleSetPreset('today')}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-medium"
              >
                আজ
              </button>
              <button 
                onClick={() => handleSetPreset('this_month')}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-medium"
              >
                চলতি মাস
              </button>
              <button 
                onClick={() => handleSetPreset('last_month')}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-medium"
              >
                গত মাস
              </button>
              <button 
                onClick={() => handleSetPreset('last_30_days')}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-medium"
              >
                গত ৩০ দিন
              </button>
            </div>
          </div>

          {/* Row 2: Secondary Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">ফিল্টারঃ</span>
            </div>

            {/* Branch Filter */}
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="all">সকল শাখা (All Branches)</option>
              {Object.entries(branchesMap).map(([code, data]) => (
                <option key={code} value={code}>{code} - {data.branch}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="all">সকল খরচের খাত (All Categories)</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="all">সকল স্ট্যাটাস (All Status)</option>
              <option value="submitted">পেন্ডিং / জমা (Submitted)</option>
              <option value="approved">অনুমোদিত (Approved)</option>
              <option value="returned">সংশোধনে ফেরত (Returned)</option>
              <option value="paid">পরিশোধিত (Paid)</option>
              <option value="billed">বিলভুক্ত (Billed)</option>
            </select>

            {/* Advanced Search Input */}
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ট্র্যাকিং আইডি, শাখা, কর্মকর্তা, খাত বা মেমো দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Smart Dashboard Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          
          {/* Card 1: Total */}
          <div 
            onClick={() => setFilterStatus('all')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'all' 
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/20' 
                : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700/60 hover:bg-blue-50/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
              <span>মোট দাখিলকৃত বিল</span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono">
                {uniqueBranchesCount} শাখা
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
              {totalSubmissionsCount} <span className="text-xs font-normal">টি</span>
            </div>
            <div className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 mt-0.5">
              ৳ {totalSumAmount.toLocaleString('en-US')}
            </div>
          </div>

          {/* Card 2: Pending */}
          <div 
            onClick={() => setFilterStatus(filterStatus === 'submitted' ? 'all' : 'submitted')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'submitted' 
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/20' 
                : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 hover:bg-amber-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
              <span>পেন্ডিং / জমা বিল</span>
              <Clock size={13} className="text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
              {pendingList.length} <span className="text-xs font-normal">টি</span>
            </div>
            <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              ৳ {pendingAmount.toLocaleString('en-US')}
            </div>
          </div>

          {/* Card 3: Approved */}
          <div 
            onClick={() => setFilterStatus(filterStatus === 'approved' ? 'all' : 'approved')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'approved' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/20' 
                : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              <span>অনুমোদিত বিল</span>
              <CheckCircle2 size={13} className="text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-900 dark:text-emerald-100 mt-1">
              {approvedList.length} <span className="text-xs font-normal">টি</span>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              ৳ {approvedAmount.toLocaleString('en-US')}
            </div>
          </div>

          {/* Card 4: Paid */}
          <div 
            onClick={() => setFilterStatus(filterStatus === 'paid' ? 'all' : 'paid')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'paid' 
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 ring-2 ring-purple-500/20' 
                : 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50 hover:bg-purple-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-bold">
              <span>পরিশোধিত বিল</span>
              <CreditCard size={13} className="text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-purple-900 dark:text-purple-100 mt-1">
              {paidList.length} <span className="text-xs font-normal">টি</span>
            </div>
            <div className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400 mt-0.5">
              ৳ {paidAmount.toLocaleString('en-US')}
            </div>
          </div>

          {/* Card 5: Returned for Correction */}
          <div 
            onClick={() => setFilterStatus(filterStatus === 'returned' ? 'all' : 'returned')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'returned' 
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-500/20' 
                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 hover:bg-rose-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold">
              <span>সংশোধনে ফেরত</span>
              <RotateCcw size={13} className="text-rose-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-900 dark:text-rose-100 mt-1">
              {returnedList.length} <span className="text-xs font-normal">টি</span>
            </div>
            <div className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 mt-0.5">
              ৳ {returnedAmount.toLocaleString('en-US')}
            </div>
          </div>

        </div>

        {/* Action Buttons Bar */}
        <div className="px-5 py-3 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {selectedIds.size === submissions.length && submissions.length > 0 ? (
                <CheckSquare size={16} className="text-blue-600" />
              ) : (
                <Square size={16} className="text-gray-400" />
              )}
              <span>সব সিলেক্ট করুন ({selectedIds.size}/{submissions.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Generate Official Bill Sheet Button */}
            <button
              onClick={handleGenerateBill}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="নির্বাচিত সব বিল মূল বিল শিটে লোড করে ভাউচার ও নোট শিট তৈরি করুন"
            >
              <Sparkles size={15} />
              <span>অটো বিল তৈরি করুন ({selectedIds.size} টি)</span>
              <ArrowRight size={13} />
            </button>

            {/* Print Report Dropdown Menu */}
            <div className="relative">
              <div className="inline-flex rounded-xl shadow-sm">
                <button
                  onClick={() => handlePrintReport('raw_vouchers_only')}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-l-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  title="শুধু রসিদ ও মেমো সিরিয়াল অনুযায়ী প্রিন্ট করুন"
                >
                  <Receipt size={14} />
                  <span>রসিদ ও মেমো প্রিন্ট (সিরিয়াল)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintMenuOpen(prev => !prev)}
                  disabled={selectedIds.size === 0}
                  className="px-2 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-r-xl font-bold text-xs border-l border-teal-600/40 transition-all cursor-pointer disabled:opacity-40"
                  title="প্রিন্টের আরও অপশন দেখুন"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {isPrintMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handlePrintReport('raw_vouchers_only');
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2.5 cursor-pointer border-b border-gray-100 dark:border-gray-700/60"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                      <Receipt size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-300">শুধু রসিদ ও মেমো প্রিন্ট (সিরিয়াল)</div>
                      <div className="text-[10px] text-gray-500">বড় ফরম্যাটে শুধু মেমো/রসিদ ক্রমানুসারে আসবে</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handlePrintReport('full');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      <Printer size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-purple-700 dark:text-purple-300">ভাউচারসহ পূর্ণাঙ্গ রিপোর্ট</div>
                      <div className="text-[10px] text-gray-500">সামারি টেবিল + অফিসিয়াল ভাউচার ডকেট</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handlePrintReport('vouchers_only');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      <Paperclip size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-indigo-700 dark:text-indigo-300">অফিসিয়াল ডকেট কপি</div>
                      <div className="text-[10px] text-gray-500">স্বাক্ষর বক্স ও বিল বিবরণীসহ ভাউচার</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handlePrintReport('table_only');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      <FileSpreadsheet size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-blue-700 dark:text-blue-300">শুধু সামারি টেবিল প্রিন্ট</div>
                      <div className="text-[10px] text-gray-500">এক নজরে সকল বিলের তালিকা</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {canApproveBill(currentUserProfile?.role || 'head_office_admin') && (
              <>
                <button
                  type="button"
                  onClick={handleBulkApprove}
                  disabled={selectedIds.size === 0 || isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  title="নির্বাচিত সব বিল একসঙ্গে অনুমোদন করুন"
                >
                  <CheckCircle2 size={14} />
                  <span>বাল্ক অনুমোদন ({selectedIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkMarkPaid}
                  disabled={selectedIds.size === 0 || isBulkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  title="নির্বাচিত সব বিল একসঙ্গে পরিশোধিত চিহ্নিত করুন"
                >
                  <CreditCard size={14} />
                  <span>বাল্ক পরিশোধ ({selectedIds.size})</span>
                </button>
              </>
            )}

            {/* Export Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleExportExcelFile}
              disabled={submissions.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Excel (.xlsx) ফরম্যাটে রিপোর্ট ডাউনলোড করুন"
            >
              <FileSpreadsheet size={14} />
              <span>Excel (.xlsx) ডাউনলোড</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={submissions.length === 0}
              className="flex items-center gap-1 px-2.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="CSV ফরম্যাটে রিপোর্ট ডাউনলোড করুন"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* View Mode Switcher Tab Bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-5 pt-2 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'table'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>বিল তালিকা টেবিল (Table View)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono font-bold">
              {submissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'vouchers'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Paperclip size={15} />
            <span>ভাউচার ফাইল রিপোর্ট ডসিয়ার (Voucher Report)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
              vouchersWithAttachmentCount > 0 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' 
                : 'bg-gray-100 text-gray-500'
            }`}>
              {vouchersWithAttachmentCount} টি ফাইল
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'monthly'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <BarChart3 size={15} />
            <span>মাসিক তুলনা (Monthly Comparison)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
              {monthlyComparison.length} মাস
            </span>
          </button>
        </div>

        {/* Submissions Table & Voucher Dossier Area */}
        <div className="flex-1 max-h-[52vh] overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-medium">ক্লাউড ডাটাবেজ থেকে বিল লোড হচ্ছে...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <Building2 size={40} className="mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                এই নির্দিষ্ট তারিখ রেঞ্জে কোনো বিল পাওয়া যায়নি
              </p>
              <p className="text-xs text-gray-500">
                উপরের তারিখ পরিবর্তন করে অথবা শাখা নির্বাচন করে আবার খুঁজুন।
              </p>
            </div>
          ) : activeTab === 'table' ? (
            /* Table View */
            <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      #
                    </th>
                    <th className="p-3 w-28">তারিখ</th>
                    <th className="p-3 w-40">শাখা ও কোড</th>
                    <th className="p-3 w-36">কর্মকর্তা</th>
                    <th className="p-3">খরচের খাত ও বিবরণ</th>
                    <th className="p-3 w-28 text-right">টাকার পরিমাণ</th>
                    <th className="p-3 w-28 text-center">স্ট্যাটাস</th>
                    <th className="p-3 w-20 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {submissions.map((sub) => {
                    const isSelected = selectedIds.has(sub.id);
                    return (
                      <tr 
                        key={sub.id}
                        className={`hover:bg-blue-50/40 dark:hover:bg-gray-800/60 transition-colors ${
                          isSelected ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleSelectRow(sub.id)}
                            className="text-gray-400 hover:text-blue-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        <td className="p-3 font-mono font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {sub.billDate}
                        </td>

                        <td className="p-3">
                          <span className="font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded mr-1.5 text-[11px]">
                            {sub.branchCode}
                          </span>
                          <strong className="text-gray-800 dark:text-gray-100">{sub.branchName}</strong>
                        </td>

                        <td className="p-3">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{sub.officerName}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{sub.officerPhone}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-gray-800 dark:text-gray-200">{sub.category}</div>
                          {sub.description && (
                            <div className="text-[11px] text-gray-500 truncate max-w-xs">{sub.description}</div>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {sub.voucherNo && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                                মেমোঃ {sub.voucherNo}
                              </span>
                            )}
                            {(() => {
                              const subAtts = getSubAttachments(sub);
                              if (subAtts.length === 0) return null;
                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewVoucher(sub);
                                      setActiveAttachmentIndex(0);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-2xs cursor-pointer"
                                    title="ভাউচার বা মেমো ডকুমেন্ট দেখুন"
                                  >
                                    <Paperclip size={11} />
                                    <span>{subAtts.length > 1 ? `${subAtts.length}টি ভাউচার ফাইল` : 'ভাউচার ফাইল'}</span>
                                    <Eye size={10} className="ml-0.5 opacity-70" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePrintSingleVoucher(sub)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 px-1.5 py-0.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs cursor-pointer"
                                    title="এই একক ভাউচারটি প্রিন্ট করুন"
                                  >
                                    <Printer size={10} />
                                    <span>প্রিন্ট</span>
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm whitespace-nowrap">
                          ৳ {sub.amount.toLocaleString('en-US')}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              sub.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              sub.status === 'paid' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                              sub.status === 'billed' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                              sub.status === 'returned' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                              sub.status === 'rejected' ? 'bg-red-50 text-red-800 border-red-300' :
                              'bg-amber-50 text-amber-800 border-amber-300'
                            }`}>
                              {sub.status === 'approved' ? 'অনুমোদিত' :
                               sub.status === 'paid' ? 'পরিশোধিত' :
                               sub.status === 'billed' ? 'বিলভুক্ত' :
                               sub.status === 'returned' ? 'সংশোধনে ফেরত' :
                               sub.status === 'rejected' ? 'বাতিল' : 'জমা হয়েছে'}
                            </span>

                            {sub.status === 'returned' && sub.returnReason && (
                              <span className="text-[10px] text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded max-w-[120px] truncate font-medium" title={sub.returnReason}>
                                কারণ: {sub.returnReason}
                              </span>
                            )}

                            {/* Digital Approval History Button */}
                            <button
                              type="button"
                              onClick={() => setHistoryModalSubmission(sub)}
                              className="text-[10px] text-gray-500 hover:text-indigo-600 flex items-center gap-0.5 hover:underline"
                              title="অনুমোদন ইতিহাস ও অডিট ট্রেইল দেখুন"
                            >
                              <History size={11} />
                              <span>ইতিহাস</span>
                            </button>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {/* Workflow Actions */}
                            {canApproveBill(currentUserProfile?.role || 'head_office_admin') && (sub.status === 'submitted' || sub.status === 'under_review') && (
                              <button
                                type="button"
                                onClick={() => handleApprove(sub)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                                title="বিল অনুমোদন করুন"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}

                            {canReturnBill(currentUserProfile?.role || 'head_office_admin') && (sub.status === 'submitted' || sub.status === 'under_review') && (
                              <button
                                type="button"
                                onClick={() => handleOpenReturnModal(sub)}
                                className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                                title="সংশোধনের জন্য শাখায় ফেরত পাঠান"
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}

                            {canPayBill(currentUserProfile?.role || 'head_office_admin') && sub.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(sub)}
                                className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                                title="বিল পরিশোধ সম্পন্ন মার্ক করুন"
                              >
                                <CreditCard size={16} />
                              </button>
                            )}

                            {sub.status === 'returned' && onOpenEditSubmission && (
                              <button
                                type="button"
                                onClick={() => onOpenEditSubmission(sub)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                                title="সংশোধন করে পুনরায় দাখিল করুন"
                              >
                                <Edit size={16} />
                              </button>
                            )}

                            {/* Delete Action Guarded by canDeleteBill */}
                            {canDeleteBill(currentUserProfile?.role || 'head_office_admin') && (
                              deleteConfirmId === sub.id ? (
                                <div className="inline-flex items-center justify-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(sub.id);
                                    }}
                                    disabled={isDeletingId === sub.id}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                    title="মুছে ফেলতে নিশ্চিত করুন"
                                  >
                                    <Trash2 size={13} />
                                    <span>{isDeletingId === sub.id ? 'মুছছে...' : 'মুছুন?'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmId(null);
                                    }}
                                    disabled={isDeletingId === sub.id}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                    title="বাতিল করুন"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(sub.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="বিল এন্ট্রি মুছে ফেলুন (Super Admin Only)"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'vouchers' ? (
            /* Voucher Report Dossier View */
            <div className="space-y-4">
              {vouchersWithAttachmentCount === 0 ? (
                <div className="py-16 text-center text-gray-400 space-y-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Receipt size={44} className="mx-auto text-gray-300 dark:text-gray-600" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                      কোনো ভাউচার বা মেমো ফাইল সংযুক্ত নেই
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      ফিল্টারকৃত বিলগুলোতে কোনো রসিদ বা ভাউচার আপলোড করা হয়নি। শাখা থেকে বিল দাখিল করার সময় ভাউচার ফাইল যুক্ত করলে এখানে দৃশ্যমান হবে।
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top dossier toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Receipt className="text-emerald-700 dark:text-emerald-300" size={18} />
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                        সংযুক্ত ভাউচার ডসিয়ার: {vouchersWithAttachmentCount} টি নথি | মোট পরিমাণঃ ৳ {vouchersTotalAmount.toLocaleString('en-US')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintReport('raw_vouchers_only')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                        title="শুধু রসিদ ও মেমোগুলো ক্রম অনুযায়ী প্রিন্ট করুন"
                      >
                        <Receipt size={13} />
                        <span>রসিদ ও মেমো প্রিন্ট ({vouchersWithAttachmentCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintReport('vouchers_only')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                        title="অফিসিয়াল ডকেটসহ প্রিন্ট করুন"
                      >
                        <Printer size={13} />
                        <span>ডকেট কপি</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid of Voucher Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {submissions
                      .filter(sub => getSubAttachments(sub).length > 0)
                      .map((sub) => {
                        const isSelected = selectedIds.has(sub.id);
                        const atts = getSubAttachments(sub);
                        const primaryAtt = atts[0];
                        const isPdf = primaryAtt?.fileType?.startsWith('application/pdf');

                        return (
                          <div 
                            key={sub.id}
                            className={`border rounded-2xl overflow-hidden bg-white dark:bg-gray-800/80 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                              isSelected 
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="p-3.5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/40">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleSelectRow(sub.id)}
                                    className="text-gray-400 hover:text-emerald-600 cursor-pointer"
                                  >
                                    {isSelected ? (
                                      <CheckSquare size={16} className="text-emerald-600" />
                                    ) : (
                                      <Square size={16} />
                                    )}
                                  </button>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                        {sub.branchCode}
                                      </span>
                                      <strong className="text-xs text-gray-900 dark:text-gray-100 font-bold">
                                        {sub.branchName}
                                      </strong>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                                      তারিখঃ {sub.billDate} | আইডি: {sub.trackingId}
                                    </span>
                                  </div>
                                </div>

                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                  ৳ {sub.amount.toLocaleString('en-US')}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-[10px] font-semibold bg-gray-200/80 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                  {sub.category}
                                </span>
                                {sub.voucherNo && (
                                  <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                    মেমো: {sub.voucherNo}
                                  </span>
                                )}
                                {atts.length > 1 && (
                                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                    <Paperclip size={10} /> {atts.length}টি ফাইল
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Document Preview Box */}
                            <div 
                              onClick={() => {
                                setViewVoucher(sub);
                                setActiveAttachmentIndex(0);
                              }}
                              className="relative group bg-gray-100 dark:bg-gray-900/60 h-48 flex items-center justify-center cursor-pointer overflow-hidden border-b border-gray-100 dark:border-gray-700/60"
                              title="পূর্ণাকারে দেখতে ক্লিক করুন"
                            >
                              {isPdf ? (
                                <div className="text-center p-4">
                                  <Receipt size={36} className="mx-auto text-emerald-600 mb-2" />
                                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                                    PDF ভাউচার ডকুমেন্ট
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-mono mt-1 block truncate max-w-[200px]">
                                    {primaryAtt?.fileName || 'document.pdf'}
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={primaryAtt?.dataUrl}
                                  alt={`Voucher ${sub.voucherNo || sub.trackingId}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              )}

                              {/* Hover overlay with zoom icon */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                <span className="px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                  <Eye size={13} />
                                  <span>{atts.length > 1 ? `${atts.length}টি সংযুক্তি দেখুন` : 'বড় করে দেখুন'}</span>
                                </span>
                              </div>
                            </div>

                            {/* Details & Submitter */}
                            <div className="p-3 text-xs space-y-1.5 bg-white dark:bg-gray-800">
                              {sub.description && (
                                <p className="text-gray-600 dark:text-gray-300 line-clamp-2 text-[11px]">
                                  {sub.description}
                                </p>
                              )}
                              <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700/40 flex items-center justify-between">
                                <span>দাখিলকারীঃ {sub.officerName}</span>
                                <span className="font-mono">{sub.officerPhone}</span>
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewVoucher(sub);
                                  setActiveAttachmentIndex(0);
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                              >
                                <Eye size={12} />
                                <span>{atts.length > 1 ? `${atts.length}টি ভাউচার` : 'প্রিভিউ'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintSingleVoucher(sub, true)}
                                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 py-1.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                                title="শুধু রসিদ ও মেমোর ফ্রেমবিহীন কপি প্রিন্ট করুন"
                              >
                                <Receipt size={12} />
                                <span>রসিদ প্রিন্ট</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintSingleVoucher(sub, false)}
                                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 py-1.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                                title="এই ভাউচারটির অফিসিয়াল ডকেট প্রিন্ট করুন"
                              >
                                <Printer size={12} />
                                <span>ডকেট</span>
                              </button>

                              <a
                                href={primaryAtt?.dataUrl}
                                download={primaryAtt?.fileName || `Voucher_${sub.trackingId}.jpg`}
                                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
                                title="ফাইল ডাউনলোড"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Monthly Comparison View */
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                      মাসভিত্তিক ব্যয় ও বিলের তুলনামূলক চিত্র (Monthly Expense Comparison)
                    </h3>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                      প্রতি মাসের মোট দাখিলকৃত বিলের পরিমাণ, অনুমোদিত ও অনুমোদনাধীন বিলের তুলনা
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-gray-500">মোট মাস রেকর্ড:</span>{' '}
                  <strong className="text-indigo-700 dark:text-indigo-300 font-bold">{monthlyComparison.length} টি</strong>
                </div>
              </div>

              {monthlyComparison.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-xs">তুলনা করার মতো কোনো মাসের রেকর্ড পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monthlyComparison.map((m) => (
                    <div 
                      key={m.monthKey}
                      className="p-4 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
                        <div>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {m.monthName}
                          </span>
                          <span className="ml-2 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {m.billCount} টি বিল
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ৳ {m.totalAmount.toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 size={13} /> অনুমোদিত
                          </span>
                          <span className="font-mono font-bold">
                            ৳ {m.approvedAmount.toLocaleString('en-US')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${m.totalAmount > 0 ? Math.min(100, Math.round((m.approvedAmount / m.totalAmount) * 100)) : 0}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 pt-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock size={13} /> পেন্ডিং / যাচাই চলছে
                          </span>
                          <span className="font-mono font-bold">
                            ৳ {m.pendingAmount.toLocaleString('en-US')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all"
                            style={{ width: `${m.totalAmount > 0 ? Math.min(100, Math.round((m.pendingAmount / m.totalAmount) * 100)) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            মোট নির্বাচিতঃ <strong className="text-gray-800 dark:text-gray-200">{selectedIds.size}</strong> টি বিল | নির্বাচিত মোটঃ <strong className="text-emerald-600 font-mono">৳ {selectedSumAmount.toLocaleString('en-US')}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateBill}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-40"
            >
              অটো বিল তৈরি করুন
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>

      {/* Voucher Attachment Lightbox Preview Modal */}
      {viewVoucher && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
          {(() => {
            const atts = getSubAttachments(viewVoucher);
            const currentAtt = atts[activeAttachmentIndex] || atts[0];
            if (!currentAtt) return null;

            return (
              <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Receipt className="text-emerald-600 shrink-0" size={18} />
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                        ভাউচার ডসিয়ার • {viewVoucher.branchCode} - {viewVoucher.branchName}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-mono">
                        {viewVoucher.voucherNo ? `মেমো নং: ${viewVoucher.voucherNo} | ` : ''}
                        তারিখ: {viewVoucher.billDate} | ৳ {viewVoucher.amount.toLocaleString('en-US')}
                        {atts.length > 1 && ` | মোট ${atts.length}টি সংযুক্তি`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePrintSingleVoucher(viewVoucher, true)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="শুধু রসিদ ও মেমোর ফ্রেমবিহীন কপি প্রিন্ট করুন"
                    >
                      <Receipt size={14} />
                      <span className="hidden sm:inline">রসিদ প্রিন্ট</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintSingleVoucher(viewVoucher, false)}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="এই ভাউচারটির অফিসিয়াল ডকেট প্রিন্ট করুন"
                    >
                      <Printer size={14} />
                      <span className="hidden sm:inline">ডকেট প্রিন্ট</span>
                    </button>
                    <a
                      href={currentAtt.dataUrl}
                      download={currentAtt.fileName || `Voucher_${viewVoucher.trackingId}.jpg`}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-xs cursor-pointer"
                      title="ফাইল ডাউনলোড করুন"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setViewVoucher(null);
                        setActiveAttachmentIndex(0);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Multiple Attachments Navigation Bar (if > 1 attachment) */}
                {atts.length > 1 && (
                  <div className="px-4 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-800 flex items-center justify-between gap-2 overflow-x-auto">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {atts.map((att, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveAttachmentIndex(idx)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                            activeAttachmentIndex === idx
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-100/60 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Paperclip size={12} />
                          <span>{att.label || `সংযুক্তি #${idx + 1}`}</span>
                          <span className="text-[10px] opacity-75">({idx + 1}/{atts.length})</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-xs text-gray-500 font-mono">
                      <button
                        type="button"
                        disabled={activeAttachmentIndex === 0}
                        onClick={() => setActiveAttachmentIndex(prev => Math.max(0, prev - 1))}
                        className="px-2 py-0.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
                      >
                        ◀ পূর্ববর্তী
                      </button>
                      <button
                        type="button"
                        disabled={activeAttachmentIndex === atts.length - 1}
                        onClick={() => setActiveAttachmentIndex(prev => Math.min(atts.length - 1, prev + 1))}
                        className="px-2 py-0.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
                      >
                        পরবর্তী ▶
                      </button>
                    </div>
                  </div>
                )}

                {/* Main View Area */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-950/5 dark:bg-black/50 min-h-[300px]">
                  {currentAtt.fileType?.startsWith('application/pdf') ? (
                    <iframe 
                      src={currentAtt.dataUrl} 
                      title={currentAtt.fileName}
                      className="w-full h-[70vh] rounded-2xl border border-gray-300 dark:border-gray-700 bg-white"
                    />
                  ) : (
                    <img 
                      src={currentAtt.dataUrl} 
                      alt={currentAtt.fileName} 
                      className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-md border border-gray-200 dark:border-gray-800"
                    />
                  )}
                </div>

                {/* Bottom detail pill */}
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {currentAtt.label || 'ভাউচার'}
                    </span>
                    <span className="truncate">{currentAtt.fileName}</span>
                  </div>
                  {atts.length > 1 && (
                    <span className="font-mono text-gray-500">
                      ফাইল {activeAttachmentIndex + 1} এর {atts.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Digital Approval History Modal */}
      {historyModalSubmission && (
        <ApprovalHistoryModal
          isOpen={!!historyModalSubmission}
          onClose={() => setHistoryModalSubmission(null)}
          submission={historyModalSubmission}
        />
      )}

      {/* Return for Correction Modal */}
      {returnModalSubmission && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-base">
                <RotateCcw size={20} />
                <span>বিল সংশোধনের জন্য শাখায় ফেরত পাঠান</span>
              </div>
              <button 
                type="button"
                onClick={() => setReturnModalSubmission(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200">
                শাখা: {returnModalSubmission.branchCode} - {returnModalSubmission.branchName}
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-mono">
                ট্র্যাকিং: {returnModalSubmission.trackingId} | ৳ {returnModalSubmission.amount}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                সংশোধনের সুনির্দিষ্ট কারণ বা করণীয় নির্দেশনা <span className="text-red-500">*</span>
              </label>
              <textarea
                value={returnReasonText}
                onChange={(e) => setReturnReasonText(e.target.value)}
                placeholder="যেমন: ৩ নং ভাউচারের স্পষ্ট মেমো কপি সংযুক্ত করুন অথবা টাকার পরিমাণ সংশোধন করে পুনরায় দাখিল করুন..."
                rows={4}
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnModalSubmission(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={isReturnSubmitting || !returnReasonText.trim()}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>{isReturnSubmitting ? 'প্রসেস হচ্ছে...' : 'শাখায় ফেরত পাঠান'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
