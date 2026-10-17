export type BillStatus = 'draft' | 'dispatched' | 'approved' | 'paid';

export interface BranchData {
  branch: string;
  name: string;
  mobile: string;
  ext: string;
  email: string;
  isCustom?: boolean;
  zone?: string;
  isDeleted?: boolean;
}

export interface BranchDatabase {
  [code: string]: BranchData;
}

export interface BillItem extends BranchData {
  code: string; // The branch code
  serial: string; // User input for serial number
  amount: string; // User input for amount
  calculation?: string; // User input for mathematical calculation
}

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface VoucherConfig {
  subject: string;
  refNo: string;
  billType: string;
  claimType: string;
  month: string;
  date: string;
  memoNumber?: string;
  signatory1Name: string;
  signatory1Title: string;
  signatory2Name: string;
  signatory2Title: string;
  signatory3Name: string;
  signatory3Title: string;
  paperFormat: 'notesheet' | 'memo';
  showSignatures: boolean;
  showQrCode?: boolean;
  trackingId?: string;
  status?: BillStatus;
  note?: string;
}

export interface SavedBill {
  id: string;
  uid?: string;
  name: string;
  items: string; // JSON string of BillItem[]
  createdAt: string;
  updatedAt: string;
  totalAmount?: number;
  note?: string;
  voucherConfig?: string; // JSON string of VoucherConfig
  trackingId?: string;
  status?: BillStatus;
}

export interface AppState {
  searchedToday: number;
  lastSearchTime: string | null;
  savedLists: SavedList[];
}

export interface SavedList {
  name: string;
  date: string;
  items: BillItem[];
  note: string;
}

export type TabType = 'search' | 'list' | 'settings';

export type UserRole = 'super_admin' | 'head_office_admin' | 'branch_officer' | 'viewer';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  branchCode?: string;
  branchName?: string;
  phoneNumber?: string;
  updatedAt?: string;
}

export type SubmissionStatus = 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'returned' 
  | 'paid' 
  | 'rejected' 
  | 'billed';

export interface VoucherAttachmentItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  originalSize?: number;
  compressionRatio?: number;
  dataUrl: string;
  label: string; // e.g. 'ক্যাশ মেমো / ভাউচার', 'কুরিয়ার স্লিপ', 'চালান / বিল', 'ব্যাংক জমা রশিদ', 'অন্যান্য'
}

export interface ApprovalHistoryItem {
  id: string;
  date: string;
  action: string;
  by: string;
  role: string;
  note?: string;
  previousStatus?: SubmissionStatus;
  newStatus?: SubmissionStatus;
}

export interface BranchSubmission {
  id: string;
  trackingId: string;
  branchCode: string;
  branchName: string;
  officerName: string;
  officerPhone: string;
  officerEmail?: string;
  billDate: string; // YYYY-MM-DD
  category: string;
  voucherNo?: string;
  autoVoucherNo?: string; // Automatically generated unique voucher no (e.g. SLI-VCH-2026-0842)
  voucherAttachment?: string; // primary base64 Data URL (image/pdf)
  voucherFileName?: string;
  voucherFileType?: string;
  voucherAttachments?: VoucherAttachmentItem[]; // array of multiple voucher attachments
  amount: number;
  description: string;
  status: SubmissionStatus;
  returnReason?: string; // Reason when returned to branch for correction
  approvedBy?: string;
  approvedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  paidBy?: string;
  paidAt?: string;
  history?: ApprovalHistoryItem[]; // Digital audit approval trail
  createdAt: string;
  updatedAt: string;
  submittedByUid?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  submissionId?: string;
  trackingId?: string;
  performedByUid: string;
  performedByEmail: string;
  performedByName: string;
  performedByRole: UserRole;
  details: string;
  previousStatus?: string;
  newStatus?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'submission' | 'approval' | 'returned' | 'paid' | 'system';
  timestamp: string;
  isRead: boolean;
  read?: boolean;
  submissionId?: string;
  trackingId?: string;
  targetRole?: UserRole | 'all';
  targetBranchCode?: string;
}
