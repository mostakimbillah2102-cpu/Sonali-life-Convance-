import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  deleteDoc,
  limit,
  orderBy
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase';
import { 
  BranchSubmission, 
  SubmissionStatus, 
  VoucherAttachmentItem,
  AuditLog,
  AppNotification,
  ApprovalHistoryItem,
  UserRole
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LOCAL_STORAGE_KEY = 'sonali_branch_submissions_cache';
const LOCAL_NOTIFS_KEY = 'sonali_notifications_cache';
const LOCAL_AUDIT_KEY = 'sonali_audit_logs_cache';

export function normalizeSubmission(raw: any): BranchSubmission {
  let voucherAttachments: VoucherAttachmentItem[] = [];

  if (raw.voucherAttachments) {
    try {
      voucherAttachments = typeof raw.voucherAttachments === 'string'
        ? JSON.parse(raw.voucherAttachments)
        : raw.voucherAttachments;
    } catch (e) {
      console.warn('Failed to parse voucherAttachments from submission', e);
    }
  }

  // Fallback to legacy single attachment if voucherAttachments is empty
  if ((!voucherAttachments || voucherAttachments.length === 0) && raw.voucherAttachment) {
    voucherAttachments = [{
      id: 'att-legacy-1',
      fileName: raw.voucherFileName || 'voucher.jpg',
      fileType: raw.voucherFileType || 'image/jpeg',
      fileSize: 0,
      dataUrl: raw.voucherAttachment,
      label: 'ক্যাশ মেমো / ভাউচার'
    }];
  }

  let history: ApprovalHistoryItem[] = [];
  if (raw.history) {
    try {
      history = typeof raw.history === 'string' ? JSON.parse(raw.history) : raw.history;
    } catch (e) {
      console.warn('Failed to parse history', e);
    }
  }

  return {
    ...raw,
    history,
    voucherAttachments,
    voucherAttachment: raw.voucherAttachment || voucherAttachments[0]?.dataUrl,
    voucherFileName: raw.voucherFileName || voucherAttachments[0]?.fileName,
    voucherFileType: raw.voucherFileType || voucherAttachments[0]?.fileType,
  };
}

export function getLocalCachedSubmissions(): BranchSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeSubmission) : [];
  } catch (e) {
    console.error('Failed to read local branch submissions', e);
    return [];
  }
}

export function saveLocalCachedSubmissions(items: BranchSubmission[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to write local branch submissions cache', e);
  }
}

// Generate unique tracking code for branch bill
export function generateBranchTrackingId(branchCode: string, dateStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SLI-BR-${branchCode}-${cleanDate}-${rand}`;
}

// Automatically generate unique voucher number (Auto Voucher Number)
export function generateUniqueVoucherNumber(yearStr?: string): string {
  const currentYear = yearStr || new Date().getFullYear().toString();
  const randSeq = Math.floor(1000 + Math.random() * 9000);
  return `SLI-VCH-${currentYear}-${randSeq}`;
}

/**
 * Duplicate Bill Detection:
 * Checks whether an identical bill from the same branch was already submitted.
 * Matches on: branchCode + billDate + amount (and category or voucherNo).
 */
export function detectDuplicateBill(
  branchCode: string,
  billDate: string,
  amount: number,
  category: string,
  voucherNo?: string,
  excludeId?: string
): { isDuplicate: boolean; matchedSubmission?: BranchSubmission; reason?: string } {
  const cached = getLocalCachedSubmissions();

  for (const item of cached) {
    if (excludeId && item.id === excludeId) continue;
    // Condition 1: Same branch, same bill date, same amount
    const sameBranch = item.branchCode.toString().trim() === branchCode.toString().trim();
    const sameDate = item.billDate === billDate;
    const sameAmount = Math.abs(item.amount - amount) < 0.01;
    const sameCategory = item.category.trim() === category.trim();

    // Condition 2: Same voucher/memo number for the same branch
    const sameVoucherNo = voucherNo && voucherNo.trim() !== '' && item.voucherNo && 
      item.voucherNo.trim().toLowerCase() === voucherNo.trim().toLowerCase();

    if (sameBranch && sameVoucherNo) {
      return {
        isDuplicate: true,
        matchedSubmission: item,
        reason: `এই শাখার একই ভাউচার নম্বর (${voucherNo}) দিয়ে পূর্বে একটি বিল দাখিল করা হয়েছে (ট্র্যাকিং: ${item.trackingId})!`
      };
    }

    if (sameBranch && sameDate && sameAmount && sameCategory) {
      return {
        isDuplicate: true,
        matchedSubmission: item,
        reason: `সতর্কতা: একই তারিখে (${billDate}) একই খাত (${category}) ও একই টাকায় (৳${amount.toLocaleString('bn-BD')}) এই শাখা থেকে ইতোমধ্যে একটি বিল জমা হয়েছে (ট্র্যাকিং: ${item.trackingId})!`
      };
    }
  }

  return { isDuplicate: false };
}

// Digital Audit Logging Helper
export async function logAuditEvent(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  const logId = `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toISOString();
  const logItem: AuditLog = { ...entry, id: logId, timestamp };

  // Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    const list: AuditLog[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify([logItem, ...list.slice(0, 99)]));
  } catch (e) {
    console.warn('Local audit cache write failed', e);
  }

  // Attempt Firestore write
  try {
    const docRef = doc(db, 'audit_logs', logId);
    await setDoc(docRef, logItem);
  } catch (err) {
    console.warn('Could not persist audit log to Firestore (continuing locally):', err);
  }
}

// In-app Notifications System
export async function sendNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
  const id = `NOTIF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toISOString();
  const record: AppNotification = { ...notif, id, timestamp, isRead: false };

  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify([record, ...list.slice(0, 49)]));
  } catch (e) {
    console.warn('Local notification cache failed', e);
  }

  try {
    const docRef = doc(db, 'notifications', id);
    await setDoc(docRef, record);
  } catch (err) {
    console.warn('Firestore notification write failed:', err);
  }
}

export async function fetchNotifications(targetBranchCode?: string): Promise<AppNotification[]> {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    const localList: AppNotification[] = raw ? JSON.parse(raw) : [];

    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    const remoteList: AppNotification[] = [];
    snapshot.forEach(d => remoteList.push(d.data() as AppNotification));

    let list = remoteList.length > 0 ? remoteList : localList;
    if (remoteList.length > 0) {
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(remoteList));
    }
    if (targetBranchCode) {
      list = list.filter(n => !n.targetBranchCode || n.targetBranchCode === targetBranchCode || n.targetRole === 'head_office_admin');
    }
    return list;
  } catch (err) {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    if (targetBranchCode) {
      return list.filter(n => !n.targetBranchCode || n.targetBranchCode === targetBranchCode || n.targetRole === 'head_office_admin');
    }
    return list;
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map(n => n.id === id ? { ...n, isRead: true } : n);
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    }
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  } catch (e) {
    console.warn('Failed to mark notification read', e);
  }
}

// Submit a new bill from branch
export async function submitBranchBill(
  data: Omit<BranchSubmission, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { 
    id?: string; 
    status?: SubmissionStatus;
    actorRole?: UserRole;
  }
): Promise<BranchSubmission> {
  const id = data.id || `SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const autoVoucherNo = data.autoVoucherNo || generateUniqueVoucherNumber();
  
  // Prepare normalized attachments array
  const attachments: VoucherAttachmentItem[] = data.voucherAttachments && data.voucherAttachments.length > 0
    ? data.voucherAttachments
    : data.voucherAttachment
      ? [{
          id: 'att-1',
          fileName: data.voucherFileName || 'voucher.jpg',
          fileType: data.voucherFileType || 'image/jpeg',
          fileSize: 0,
          dataUrl: data.voucherAttachment,
          label: 'ক্যাশ মেমো / ভাউচার'
        }]
      : [];

  const primaryAttachment = attachments[0];

  const initialHistory: ApprovalHistoryItem = {
    id: `HIST-${Date.now()}-1`,
    date: now,
    action: 'বিল দাখিল করা হয়েছে (Submitted)',
    by: data.officerName || auth.currentUser?.displayName || 'শাখা কর্মকর্তা',
    role: data.actorRole || 'branch_officer',
    note: data.description || 'শাখা পোর্টাল থেকে বিল দাখিল করা হয়েছে।',
    newStatus: 'submitted'
  };

  const record: BranchSubmission = {
    ...data,
    id,
    autoVoucherNo,
    status: data.status || 'submitted',
    voucherAttachments: attachments,
    voucherAttachment: primaryAttachment?.dataUrl || data.voucherAttachment,
    voucherFileName: primaryAttachment?.fileName || data.voucherFileName,
    voucherFileType: primaryAttachment?.fileType || data.voucherFileType,
    history: [initialHistory],
    createdAt: now,
    updatedAt: now,
    submittedByUid: auth.currentUser?.uid || 'branch-portal',
  };

  // Cache locally first
  const localList = getLocalCachedSubmissions();
  saveLocalCachedSubmissions([record, ...localList.filter(item => item.id !== id)]);

  // Save to Firestore collection
  const colPath = 'branch_submissions';
  try {
    const docRef = doc(db, colPath, id);
    
    const firestoreData: Record<string, any> = {
      id: record.id,
      trackingId: record.trackingId,
      autoVoucherNo: record.autoVoucherNo,
      branchCode: record.branchCode,
      branchName: record.branchName,
      officerName: record.officerName,
      officerPhone: record.officerPhone,
      billDate: record.billDate,
      category: record.category,
      amount: record.amount,
      status: record.status,
      history: JSON.stringify(record.history),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      submittedByUid: record.submittedByUid,
    };

    if (record.officerEmail && record.officerEmail.trim()) {
      firestoreData.officerEmail = record.officerEmail.trim();
    }
    if (record.voucherNo && record.voucherNo.trim()) {
      firestoreData.voucherNo = record.voucherNo.trim();
    }
    if (record.description && record.description.trim()) {
      firestoreData.description = record.description.trim();
    }

    // Attachments serialization
    if (attachments.length > 0) {
      firestoreData.voucherAttachments = JSON.stringify(attachments);
      firestoreData.voucherAttachment = primaryAttachment.dataUrl;
      firestoreData.voucherFileName = primaryAttachment.fileName;
      firestoreData.voucherFileType = primaryAttachment.fileType;
    } else if (record.voucherAttachment) {
      firestoreData.voucherAttachment = record.voucherAttachment;
      if (record.voucherFileName) firestoreData.voucherFileName = record.voucherFileName;
      if (record.voucherFileType) firestoreData.voucherFileType = record.voucherFileType;
    }

    await setDoc(docRef, firestoreData);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${colPath}/${id}`);
  }

  // Audit log & notification
  await logAuditEvent({
    action: 'বিল দাখিল (New Bill Submission)',
    submissionId: record.id,
    trackingId: record.trackingId,
    performedByUid: auth.currentUser?.uid || 'guest-officer',
    performedByEmail: auth.currentUser?.email || record.officerEmail || 'branch@sonalilife.com',
    performedByName: record.officerName,
    performedByRole: data.actorRole || 'branch_officer',
    details: `${record.branchName} (${record.branchCode}) শাখা থেকে ${record.category} বাবদ ৳${record.amount} বিল দাখিল হয়েছে।`,
    newStatus: 'submitted'
  });

  await sendNotification({
    title: `নতুন বিল জমা: ${record.branchName}`,
    message: `${record.officerName} ৳${record.amount.toLocaleString('bn-BD')} টাকার বিল দাখিল করেছেন (${record.category})।`,
    type: 'submission',
    submissionId: record.id,
    trackingId: record.trackingId,
    targetRole: 'head_office_admin'
  });

  return record;
}

// Fetch submissions by date range (fromDate <= billDate <= toDate)
export async function fetchSubmissionsByDateRange(
  fromDate: string, 
  toDate: string, 
  filterBranch?: string,
  filterCategory?: string,
  filterStatus?: string
): Promise<BranchSubmission[]> {
  const colPath = 'branch_submissions';
  let list: BranchSubmission[] = [];

  try {
    // Firestore query by billDate range
    const q = query(
      collection(db, colPath),
      where('billDate', '>=', fromDate),
      where('billDate', '<=', toDate)
    );

    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      const item = normalizeSubmission(docSnap.data());
      list.push(item);
    });

    // Update local cache
    const existingMap = new Map<string, BranchSubmission>();
    getLocalCachedSubmissions().forEach(item => existingMap.set(item.id, item));
    list.forEach(item => existingMap.set(item.id, item));
    saveLocalCachedSubmissions(Array.from(existingMap.values()));
  } catch (err) {
    console.warn('Firestore fetch failed, checking local cache', err);
    // Fallback to local cache if network/offline
    list = getLocalCachedSubmissions().filter(item => {
      return item.billDate >= fromDate && item.billDate <= toDate;
    });
  }

  // Client-side filtering for branch, category, and status
  if (filterBranch && filterBranch !== 'all') {
    list = list.filter(item => item.branchCode === filterBranch);
  }
  if (filterCategory && filterCategory !== 'all') {
    list = list.filter(item => item.category === filterCategory);
  }
  if (filterStatus && filterStatus !== 'all') {
    list = list.filter(item => item.status === filterStatus);
  }

  // Sort descending by date and time
  return list.sort((a, b) => b.billDate.localeCompare(a.billDate) || b.createdAt.localeCompare(a.createdAt));
}

export interface StatusUpdateActor {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

// Workflow Status Update with Digital History & Audit Log
export async function updateSubmissionStatus(
  id: string, 
  newStatus: SubmissionStatus,
  actor?: StatusUpdateActor,
  note?: string
): Promise<void> {
  const colPath = 'branch_submissions';
  const now = new Date().toISOString();

  const cached = getLocalCachedSubmissions();
  const currentItem = cached.find(i => i.id === id);
  const oldStatus = currentItem?.status || 'submitted';

  const historyItem: ApprovalHistoryItem = {
    id: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    date: now,
    action: getStatusActionLabel(newStatus),
    by: actor?.name || auth.currentUser?.displayName || 'হেড অফিস অ্যাডমিন',
    role: actor?.role || 'head_office_admin',
    note: note || getStatusDefaultNote(newStatus),
    previousStatus: oldStatus,
    newStatus
  };

  const updatedHistory = [...(currentItem?.history || []), historyItem];

  const updatePayload: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
    history: JSON.stringify(updatedHistory)
  };

  if (newStatus === 'approved') {
    updatePayload.approvedBy = actor?.name || 'হেড অফিস অ্যাডমিন';
    updatePayload.approvedAt = now;
  } else if (newStatus === 'paid' || newStatus === 'billed') {
    updatePayload.paidBy = actor?.name || 'হেড অফিস অ্যাডমিন';
    updatePayload.paidAt = now;
  } else if (newStatus === 'under_review') {
    updatePayload.reviewedBy = actor?.name || 'হেড অফিস অ্যাডমিন';
    updatePayload.reviewedAt = now;
  }

  // Local cache update
  const localList = cached.map(item => {
    if (item.id === id) {
      return { 
        ...item, 
        ...updatePayload,
        history: updatedHistory
      };
    }
    return item;
  });
  saveLocalCachedSubmissions(localList);

  try {
    const docRef = doc(db, colPath, id);
    await updateDoc(docRef, updatePayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${colPath}/${id}`);
  }

  // Log Audit Event
  await logAuditEvent({
    action: `স্ট্যাটাস পরিবর্তন: ${getStatusActionLabel(newStatus)}`,
    submissionId: id,
    trackingId: currentItem?.trackingId,
    performedByUid: actor?.uid || auth.currentUser?.uid || 'system',
    performedByEmail: actor?.email || auth.currentUser?.email || 'admin@sonalilife.com',
    performedByName: actor?.name || 'হেড অফিস অ্যাডমিন',
    performedByRole: actor?.role || 'head_office_admin',
    details: `${currentItem?.branchName} শাখার বিলের স্ট্যাটাস '${oldStatus}' থেকে '${newStatus}' করা হয়েছে। মন্তব্য: ${note || 'N/A'}`,
    previousStatus: oldStatus,
    newStatus
  });

  // Notify branch if returned, approved, or paid
  if (newStatus === 'approved' || newStatus === 'paid' || newStatus === 'returned') {
    await sendNotification({
      title: `বিল আপডেট (${currentItem?.branchName})`,
      message: `বিলের বর্তমান স্ট্যাটাস: ${getStatusActionLabel(newStatus)}. ট্র্যাকিং: ${currentItem?.trackingId}`,
      type: newStatus === 'returned' ? 'returned' : newStatus === 'paid' ? 'paid' : 'approval',
      submissionId: id,
      trackingId: currentItem?.trackingId,
      targetBranchCode: currentItem?.branchCode,
      targetRole: 'branch_officer'
    });
  }
}

// Return submission to branch for correction
export async function returnSubmissionForCorrection(
  id: string,
  returnReason: string,
  actor?: StatusUpdateActor
): Promise<void> {
  const colPath = 'branch_submissions';
  const now = new Date().toISOString();

  const cached = getLocalCachedSubmissions();
  const currentItem = cached.find(i => i.id === id);
  const oldStatus = currentItem?.status || 'submitted';

  const historyItem: ApprovalHistoryItem = {
    id: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    date: now,
    action: 'সংশোধনের জন্য শাখায় ফেরত পাঠানো হয়েছে (Returned for Correction)',
    by: actor?.name || auth.currentUser?.displayName || 'হেড অফিস অ্যাডমিন',
    role: actor?.role || 'head_office_admin',
    note: `সংশোধনের নির্দেশ: ${returnReason}`,
    previousStatus: oldStatus,
    newStatus: 'returned'
  };

  const updatedHistory = [...(currentItem?.history || []), historyItem];

  const updatePayload = {
    status: 'returned' as SubmissionStatus,
    returnReason,
    updatedAt: now,
    history: JSON.stringify(updatedHistory)
  };

  // Local cache update
  const localList = cached.map(item => {
    if (item.id === id) {
      return { 
        ...item, 
        ...updatePayload,
        history: updatedHistory
      };
    }
    return item;
  });
  saveLocalCachedSubmissions(localList);

  try {
    const docRef = doc(db, colPath, id);
    await updateDoc(docRef, updatePayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${colPath}/${id}`);
  }

  // Audit Log
  await logAuditEvent({
    action: 'সংশোধনের জন্য ফেরত (Return for Correction)',
    submissionId: id,
    trackingId: currentItem?.trackingId,
    performedByUid: actor?.uid || auth.currentUser?.uid || 'system',
    performedByEmail: actor?.email || auth.currentUser?.email || 'admin@sonalilife.com',
    performedByName: actor?.name || 'হেড অফিস অ্যাডমিন',
    performedByRole: actor?.role || 'head_office_admin',
    details: `${currentItem?.branchName} শাখার বিল সংশোধনের জন্য ফেরত। কারণ: ${returnReason}`,
    previousStatus: oldStatus,
    newStatus: 'returned'
  });

  // Notification for Branch Officer
  await sendNotification({
    title: `বিল সংশোধনের জন্য ফেরত এসেছে (${currentItem?.branchName})`,
    message: `সংশোধনের নির্দেশ: ${returnReason} (ট্র্যাকিং: ${currentItem?.trackingId})`,
    type: 'returned',
    submissionId: id,
    trackingId: currentItem?.trackingId,
    targetBranchCode: currentItem?.branchCode,
    targetRole: 'branch_officer'
  });
}

// Bulk Approval / Status Update
export async function bulkUpdateSubmissionStatus(
  ids: string[],
  newStatus: SubmissionStatus,
  actor?: StatusUpdateActor
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (const id of ids) {
    try {
      await updateSubmissionStatus(id, newStatus, actor, `একসঙ্গে একাধিক বিল ${getStatusActionLabel(newStatus)} করা হয়েছে।`);
      successCount++;
    } catch (err) {
      console.error(`Failed to update status for ${id}:`, err);
      failureCount++;
    }
  }

  return { successCount, failureCount };
}

// Delete submission (Super Admin only)
export async function deleteSubmission(id: string, actor?: StatusUpdateActor): Promise<void> {
  const colPath = 'branch_submissions';

  const cached = getLocalCachedSubmissions();
  const currentItem = cached.find(i => i.id === id);

  // Local cache update
  const localList = cached.filter(item => item.id !== id);
  saveLocalCachedSubmissions(localList);

  try {
    const docRef = doc(db, colPath, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${colPath}/${id}`);
  }

  await logAuditEvent({
    action: 'বিল মুছে ফেলা (Delete Bill)',
    submissionId: id,
    trackingId: currentItem?.trackingId,
    performedByUid: actor?.uid || auth.currentUser?.uid || 'super-admin',
    performedByEmail: actor?.email || auth.currentUser?.email || 'admin@sonalilife.com',
    performedByName: actor?.name || 'সুপার অ্যাডমিন',
    performedByRole: actor?.role || 'super_admin',
    details: `${currentItem?.branchName} (${currentItem?.branchCode}) শাখার বিল '${currentItem?.trackingId}' মুছে ফেলা হয়েছে।`,
    previousStatus: currentItem?.status,
    newStatus: 'deleted'
  });
}

function getStatusActionLabel(status: SubmissionStatus): string {
  switch (status) {
    case 'submitted': return 'জমা দেওয়া হয়েছে (Pending)';
    case 'under_review': return 'যাচাই চলছে (Under Review)';
    case 'approved': return 'অনুমোদিত (Approved)';
    case 'returned': return 'সংশোধনের জন্য ফেরত (Returned)';
    case 'paid': return 'পরিশোধিত (Paid)';
    case 'billed': return 'বিলে অন্তর্ভুক্ত (Billed)';
    case 'rejected': return 'বাতিল (Rejected)';
    default: return status;
  }
}

function getStatusDefaultNote(status: SubmissionStatus): string {
  switch (status) {
    case 'submitted': return 'বিলটি দাখিল করা হয়েছে এবং যাচাইয়ের অপেক্ষায় আছে।';
    case 'under_review': return 'হেড অফিস হিসাব বিভাগ কর্তৃক ভাউচার ও রসিদ যাচাই চলছে।';
    case 'approved': return 'সকল হিসাব ও ভাউচার সঠিকভাবে যাচাই শেষে অনুমোদন দেওয়া হয়েছে।';
    case 'returned': return 'প্রয়োজনীয় সংশোধনের জন্য শাখায় ফেরত পাঠানো হয়েছে।';
    case 'paid': return 'বিল বাবদ নির্ধারিত টাকা পরিশোধ করা হয়েছে।';
    case 'billed': return 'মূল অফিসে সমন্বিত ভাউচারে বিলটি অন্তর্ভুক্ত করা হয়েছে।';
    case 'rejected': return 'নীতিমালার সাথে সামঞ্জস্যপূর্ণ না হওয়ায় বিলটি বাতিল করা হয়েছে।';
    default: return '';
  }
}

/**
 * High-Fidelity Excel (.xlsx) Export Engine.
 * Exports comprehensive reports with company branding, status badges, amounts, and audit trail.
 */
export function exportToExcel(
  submissions: BranchSubmission[],
  options?: {
    title?: string;
    fromDate?: string;
    toDate?: string;
    filterBranch?: string;
  }
): void {
  const from = options?.fromDate || '';
  const to = options?.toDate || '';
  const dateRangeStr = from && to ? `${from} হতে ${to}` : 'সকল তারিখ';

  const rows: any[] = [];

  // Title header info
  rows.push(['সোনালী লাইফ ইন্সুরেন্স কোম্পানি লিমিটেড']);
  rows.push(['SONALI LIFE INSURANCE COMPANY LIMITED']);
  rows.push(['শাখা ভাউচার ও ব্যয় বিবরণী রিপোর্ট (Branch Bill Expense Report)']);
  rows.push([`তারিখের ব্যাপ্তি: ${dateRangeStr}`, '', `মোট বিল সংখ্যা: ${submissions.length}`]);
  rows.push([]); // Blank row separator

  // Table Column Headers
  const headers = [
    'ক্রঃ নং',
    'ট্র্যাকিং আইডি',
    'অটো ভাউচার নং',
    'শাখা কোড',
    'শাখার নাম',
    'বিলের তারিখ',
    'কর্মকর্তার নাম',
    'মোবাইল নম্বর',
    'ইমেইল',
    'খাতের বিবরণ (Category)',
    'মেমো/ভাউচার নং',
    'টাকার পরিমাণ (৳)',
    'বর্তমান স্ট্যাটাস',
    'অনুমোদনকারী',
    'সংশোধন/মন্তব্য'
  ];
  rows.push(headers);

  let totalAmount = 0;

  // Populate data rows
  submissions.forEach((item, index) => {
    totalAmount += item.amount || 0;

    let statusBangla = 'পেন্ডিং';
    if (item.status === 'approved') statusBangla = 'অনুমোদিত';
    else if (item.status === 'paid' || item.status === 'billed') statusBangla = 'পরিশোধিত';
    else if (item.status === 'returned') statusBangla = 'সংশোধনে ফেরত';
    else if (item.status === 'under_review') statusBangla = 'যাচাই চলছে';
    else if (item.status === 'rejected') statusBangla = 'বাতিল';

    rows.push([
      index + 1,
      item.trackingId,
      item.autoVoucherNo || 'N/A',
      item.branchCode,
      item.branchName,
      item.billDate,
      item.officerName,
      item.officerPhone,
      item.officerEmail || '',
      item.category,
      item.voucherNo || 'N/A',
      item.amount,
      statusBangla,
      item.approvedBy || '',
      item.returnReason || item.description || ''
    ]);
  });

  // Total summary row
  rows.push([]);
  rows.push([
    'সর্বমোট (Total Amount)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalAmount,
    '',
    '',
    ''
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // Sl
    { wch: 30 }, // Tracking ID
    { wch: 22 }, // Auto Voucher
    { wch: 10 }, // Branch Code
    { wch: 24 }, // Branch Name
    { wch: 14 }, // Date
    { wch: 22 }, // Officer Name
    { wch: 16 }, // Phone
    { wch: 22 }, // Email
    { wch: 32 }, // Category
    { wch: 18 }, // Voucher No
    { wch: 16 }, // Amount
    { wch: 16 }, // Status
    { wch: 20 }, // Approved By
    { wch: 35 }, // Note/Reason
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Branch_Bills_Report');

  const fileName = `Sonali_Life_Bill_Report_${from || 'all'}_to_${to || 'all'}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// Monthly expense breakdown calculation
export interface MonthlyComparisonItem {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "সেপ্টেম্বর ২০২৬"
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  billCount: number;
}

export function getMonthlyComparisonData(submissions: BranchSubmission[]): MonthlyComparisonItem[] {
  const map: Record<string, { total: number; approved: number; pending: number; count: number }> = {};

  submissions.forEach(sub => {
    if (!sub.billDate) return;
    const monthKey = sub.billDate.substring(0, 7); // YYYY-MM
    if (!map[monthKey]) {
      map[monthKey] = { total: 0, approved: 0, pending: 0, count: 0 };
    }
    map[monthKey].count += 1;
    map[monthKey].total += sub.amount || 0;
    if (sub.status === 'approved' || sub.status === 'paid' || sub.status === 'billed') {
      map[monthKey].approved += sub.amount || 0;
    } else {
      map[monthKey].pending += sub.amount || 0;
    }
  });

  const months = Object.keys(map).sort();
  return months.map(mKey => {
    const [year, month] = mKey.split('-');
    const monthNamesBn = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    const name = `${monthNamesBn[monthIdx] || month} ${year}`;

    return {
      monthKey: mKey,
      monthName: name,
      totalAmount: map[mKey].total,
      approvedAmount: map[mKey].approved,
      pendingAmount: map[mKey].pending,
      billCount: map[mKey].count
    };
  });
}

// Common expense categories for Sonali Life
export const EXPENSE_CATEGORIES = [
  'অফিস ভাড়া (Office Rent)',
  'বিদ্যুৎ ও গ্যাস বিল (Electricity & Gas)',
  'ইন্টারনেট ও টেলিফোন (Internet & Phone)',
  'ডাক ও কুরিয়ার খরচ (Courier & Postage)',
  'স্টেশনারি ও ফটোকপি (Stationery & Printing)',
  'যাতায়াত ও ভ্রমণ ভাতা (Conveyance & Travel)',
  'চা-নাস্তা ও মেহমানদারি (Entertainment & Tea)',
  'অফিস পরিষ্কার ও মেরামত (Cleaning & Maintenance)',
  'কম্পিউটার ও আইটি সাপোর্ট (IT & Software)',
  'বিজ্ঞাপন ও প্রচার (Publicity & Marketing)',
  'অন্যান্য বিবিধ খরচ (Miscellaneous)'
];

export const VOUCHER_ATTACHMENT_LABELS = [
  'ক্যাশ মেমো / ভাউচার',
  'কুরিয়ার / চালান স্লিপ',
  'রসিদ / বিল কপি',
  'ব্যাংক জমা রশিদ',
  'অনুমোদন পত্র / অন্যান্য'
];

export interface ProcessedAttachment extends VoucherAttachmentItem {
  compressionRatio: number;
  originalSize: number;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Intelligent Image Auto-Compression Engine for Office Documents & Receipts.
 * Compresses multi-megabyte photos down to 40KB - 110KB while preserving sharp
 * text, numbers, dates, signatures, and rubber stamps for auditing and printing.
 */
export async function processVoucherFile(
  file: File, 
  label: string = 'ক্যাশ মেমো / ভাউচার'
): Promise<ProcessedAttachment> {
  const fileId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const originalSize = file.size;

  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1400;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('ক্যানভাস প্রসেসিং ব্যর্থ হয়েছে'));
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.76;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          let approxBytes = Math.round((dataUrl.length * 3) / 4);

          if (approxBytes > 150 * 1024) {
            quality = 0.68;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            approxBytes = Math.round((dataUrl.length * 3) / 4);
          }

          if (approxBytes > 200 * 1024) {
            const smallerCanvas = document.createElement('canvas');
            const scaleFactor = 1100 / Math.max(width, height);
            smallerCanvas.width = Math.round(width * scaleFactor);
            smallerCanvas.height = Math.round(height * scaleFactor);
            const sCtx = smallerCanvas.getContext('2d');
            if (sCtx) {
              sCtx.fillStyle = '#FFFFFF';
              sCtx.fillRect(0, 0, smallerCanvas.width, smallerCanvas.height);
              sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
              dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.62);
              approxBytes = Math.round((dataUrl.length * 3) / 4);
            }
          }

          const compressionRatio = originalSize > 0 
            ? Math.max(0, Math.round(((originalSize - approxBytes) / originalSize) * 100))
            : 0;

          resolve({
            id: fileId,
            dataUrl,
            fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
            fileType: 'image/jpeg',
            fileSize: approxBytes,
            originalSize,
            compressionRatio,
            label,
          });
        };
        img.onerror = () => reject(new Error('ছবি লোড করতে ব্যর্থ হয়েছে'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('ফাইল পড়তে ব্যর্থ হয়েছে'));
      reader.readAsDataURL(file);
    });
  } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    if (file.size > 700 * 1024) {
      throw new Error('PDF ফাইলের সাইজ সর্বোচ্চ ৭০০ KB হতে পারবে। অনুগ্রহ করে ছোট PDF বা রসিদের ছবি আপলোড করুন।');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: fileId,
          dataUrl: e.target?.result as string,
          fileName: file.name,
          fileType: 'application/pdf',
          fileSize: file.size,
          originalSize,
          compressionRatio: 0,
          label,
        });
      };
      reader.onerror = () => reject(new Error('PDF ফাইল পড়তে ব্যর্থ হয়েছে'));
      reader.readAsDataURL(file);
    });
  } else {
    throw new Error('শুধুমাত্র ছবি (JPG, PNG, WebP) অথবা PDF ফাইল আপলোড করা যাবে।');
  }
}

/**
 * Process multiple files in parallel with automatic label suggestions
 */
export async function processMultipleVoucherFiles(
  files: FileList | File[],
  defaultLabel: string = 'ক্যাশ মেমো / ভাউচার',
  existingCount: number = 0
): Promise<ProcessedAttachment[]> {
  const fileArray = Array.from(files);
  const results: ProcessedAttachment[] = [];
  
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const totalIndex = existingCount + i;
    
    let autoLabel = defaultLabel;
    if (totalIndex === 0) autoLabel = 'ক্যাশ মেমো / ভাউচার';
    else if (totalIndex === 1) autoLabel = 'কুরিয়ার / চালান স্লিপ';
    else if (totalIndex === 2) autoLabel = 'রসিদ / বিল কপি';
    else if (totalIndex === 3) autoLabel = 'ব্যাংক জমা রশিদ';
    else autoLabel = 'অনুমোদন পত্র / অন্যান্য';

    const processed = await processVoucherFile(file, autoLabel);
    results.push(processed);
  }
  return results;
}

