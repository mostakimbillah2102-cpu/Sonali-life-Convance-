import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole, UserProfileData } from '../types';

export const ADMIN_EMAILS = [
  'sonalilifegroupclaim@gmail.com',
  'mostakim.billah2102@gmail.com'
];

export const BOOTSTRAP_ADMIN_EMAIL = 'mostakim.billah2102@gmail.com';

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(admin => admin.toLowerCase() === clean);
}

export const ROLE_LABELS: Record<UserRole, { label: string; enLabel: string; color: string; bg: string; badge: string; description: string }> = {
  super_admin: {
    label: 'সুপার অ্যাডমিন (Super Admin)',
    enLabel: 'Super Admin',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
    badge: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
    description: 'সর্বোচ্চ প্রশাসনিক ক্ষমতা: দ্রুত অনুসন্ধান, তারিখ রিপোর্ট, কাস্টম বিল ও সকল শাখার বিল পরিচালনা।'
  },
  head_office_admin: {
    label: 'হেড অফিস অ্যাডমিন (Head Office Admin)',
    enLabel: 'Head Office Admin',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    badge: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white',
    description: 'হেড অফিস এক্সেস: সমস্ত শাখার বিল যাচাই, অনুমোদন, পরিশোধ, সংশোধনের জন্য ফেরত এবং এক্সেল রিপোর্ট।'
  },
  branch_officer: {
    label: 'সাধারণ ব্যবহারকারী / শাখা কর্মকর্তা',
    enLabel: 'General User / Branch Officer',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    badge: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
    description: 'সাধারণ ব্যবহারকারী: শাখা ভাউচার ও খরচের বিল এন্ট্রি, বিল ট্র্যাকিং এবং ফেরত আসা বিল সংশোধন।'
  },
  viewer: {
    label: 'ভিউয়ার / অডিটর (Viewer)',
    enLabel: 'Viewer / Auditor',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    badge: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
    description: 'রিড-অনলি এক্সেস: বিল পর্যবেক্ষণ এবং ডাউনলোড।'
  }
};

const LOCAL_ROLE_KEY = 'sonali_active_user_profile';

export function getLocalActiveProfile(): UserProfileData | null {
  try {
    const raw = localStorage.getItem(LOCAL_ROLE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalActiveProfile(profile: UserProfileData) {
  try {
    localStorage.setItem(LOCAL_ROLE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save local profile', e);
  }
}

/**
 * Fetch or initialize the user's profile and RBAC role.
 * STRICT POLICY: Only sonalilifegroupclaim@gmail.com & mostakim.billah2102@gmail.com are Admin.
 * All other emails are General Users (branch_officer) without access to Single Search, Date Report, or Custom List.
 */
export async function syncUserProfile(
  currentUser: { uid: string; email?: string | null; displayName?: string | null }
): Promise<UserProfileData> {
  const email = (currentUser.email || '').toLowerCase().trim();
  const isAdmin = isAdminEmail(email);

  // If user is one of the two admin emails, role is 'super_admin'.
  // Otherwise, strictly 'branch_officer' (সাধারণ ব্যবহারকারী).
  const enforcedRole: UserRole = isAdmin ? 'super_admin' : 'branch_officer';
  const defaultDisplayName = isAdmin 
    ? (currentUser.displayName || 'হেড অফিস অ্যাডমিন')
    : (currentUser.displayName || 'সাধারণ ব্যবহারকারী');

  // Try fetching from Firestore
  try {
    const docRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const profile: UserProfileData = {
        uid: currentUser.uid,
        email: email || data.email || '',
        displayName: currentUser.displayName || data.displayName || defaultDisplayName,
        role: enforcedRole,
        branchCode: data.branchCode || '58',
        branchName: data.branchName || 'বকশীগঞ্জ মেট্রো',
        phoneNumber: data.phoneNumber || '',
        updatedAt: new Date().toISOString()
      };
      saveLocalActiveProfile(profile);
      return profile;
    } else {
      // Create initial profile
      const newProfile: UserProfileData = {
        uid: currentUser.uid,
        email: email,
        displayName: defaultDisplayName,
        role: enforcedRole,
        branchCode: '58',
        branchName: 'বকশীগঞ্জ মেট্রো',
        phoneNumber: '',
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, newProfile, { merge: true });
      saveLocalActiveProfile(newProfile);
      return newProfile;
    }
  } catch (err) {
    console.warn('Could not read user profile from Firestore, using local fallback:', err);
    // Offline or fallback profile
    const fallbackProfile: UserProfileData = {
      uid: currentUser.uid,
      email: email,
      displayName: defaultDisplayName,
      role: enforcedRole,
      branchCode: '58',
      branchName: 'বকশীগঞ্জ মেট্রো',
      phoneNumber: '',
      updatedAt: new Date().toISOString()
    };
    saveLocalActiveProfile(fallbackProfile);
    return fallbackProfile;
  }
}

/**
 * Change or switch user profile / role.
 * Non-admin emails CANNOT set themselves to super_admin or head_office_admin.
 */
export async function updateUserRoleAndBranch(
  uid: string,
  updates: Partial<UserProfileData>
): Promise<UserProfileData> {
  const current = getLocalActiveProfile() || {
    uid,
    email: '',
    role: 'branch_officer' as UserRole,
  };

  const email = (updates.email || current.email || '').toLowerCase().trim();
  const isAdmin = isAdminEmail(email);

  // If not admin email, prevent assigning admin roles
  let targetRole = updates.role || current.role;
  if (!isAdmin && (targetRole === 'super_admin' || targetRole === 'head_office_admin')) {
    targetRole = 'branch_officer';
  }

  const updated: UserProfileData = {
    ...current,
    ...updates,
    role: targetRole,
    updatedAt: new Date().toISOString()
  };

  saveLocalActiveProfile(updated);

  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to update Firestore profile, saved locally:', err);
  }

  return updated;
}

// Role Permission Guards
export function canApproveBill(role: UserRole): boolean {
  return role === 'super_admin' || role === 'head_office_admin';
}

export function canReturnBill(role: UserRole): boolean {
  return role === 'super_admin' || role === 'head_office_admin';
}

export function canPayBill(role: UserRole): boolean {
  return role === 'super_admin' || role === 'head_office_admin';
}

export function canDeleteBill(role: UserRole): boolean {
  return role === 'super_admin';
}

export function canSubmitBill(role: UserRole): boolean {
  return role === 'super_admin' || role === 'head_office_admin' || role === 'branch_officer';
}

export function canModifySubmission(
  role: UserRole, 
  _userBranchCode: string | undefined, 
  _submissionBranchCode: string,
  submissionStatus: string
): boolean {
  if (role === 'super_admin' || role === 'head_office_admin') return true;
  if (role === 'branch_officer') {
    // Only if not yet approved or paid
    const isModifiableStatus = submissionStatus === 'submitted' || submissionStatus === 'returned' || submissionStatus === 'under_review';
    return isModifiableStatus;
  }
  return false;
}

// Feature Access Control Guards
// "তাদের (দ্রুত অনুসন্ধান (Single Search), তারিখ টু তারিখ রিপোর্ট ও অটো বিল, বিল / তালিকা তৈরি (Custom List)) এইসব কিছুর access থাকবে না।"
export function canAccessSingleSearch(email?: string | null): boolean {
  return isAdminEmail(email);
}

export function canAccessDateReport(email?: string | null): boolean {
  return isAdminEmail(email);
}

export function canAccessCustomList(email?: string | null): boolean {
  return isAdminEmail(email);
}
