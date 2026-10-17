import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Building2, Calendar, ArrowRight } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import Stats from './components/Stats';
import SearchSection from './components/SearchSection';
import BillSection from './components/BillSection';
import Toast from './components/Toast';
import BranchManagerModal from './components/BranchManagerModal';
import AnalyticsModal from './components/AnalyticsModal';
import DataBackupModal from './components/DataBackupModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import BillTrackingModal from './components/BillTrackingModal';
import PrintPreviewModal from './components/PrintPreviewModal';
import { BranchSubmissionModal } from './components/BranchSubmissionModal';
import { DateReportModal } from './components/DateReportModal';
import { RoleManagerModal } from './components/RoleManagerModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { GeneralUserDashboard } from './components/GeneralUserDashboard';
import { ApprovalHistoryModal } from './components/ApprovalHistoryModal';
import { CentralLoginCard } from './components/CentralLoginCard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BRANCH_DATABASE, DEFAULT_VOUCHER_CONFIG, toEnglishDigits } from './constants';
import { BillItem, BranchData, BranchDatabase, SavedBill, ToastData, VoucherConfig, BillStatus, UserProfileData, AppNotification, BranchSubmission } from './types';
import { syncUserProfile, isAdminEmail } from './utils/authRoles';
import { fetchNotifications, markNotificationAsRead } from './utils/branchSubmissions';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDocFromServer, collection, query } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const App: React.FC = () => {
  const [searchedToday, setSearchedToday] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Core System State
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customBranches, setCustomBranches] = useState<BranchDatabase>({});
  const [voucherConfig, setVoucherConfig] = useState<VoucherConfig>(DEFAULT_VOUCHER_CONFIG);
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Modals state
  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isBranchEntryOpen, setIsBranchEntryOpen] = useState(false);
  const [isDateReportOpen, setIsDateReportOpen] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [activeTrackingId, setActiveTrackingId] = useState<string>('');
  const [trackingPreviewBill, setTrackingPreviewBill] = useState<{
    items: BillItem[];
    total: number;
    config: VoucherConfig;
  } | null>(null);

  // User Profile & RBAC Role State (null when unauthenticated)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfileData | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [editingSubmission, setEditingSubmission] = useState<BranchSubmission | null>(null);
  const [submissionInitialBranch, setSubmissionInitialBranch] = useState<string>('');
  const [historySubmission, setHistorySubmission] = useState<BranchSubmission | null>(null);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Sync state tracking to prevent infinite snapshot update loops
  const lastSyncedPayloadRef = useRef<string>('');
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Computed: Dynamic merged branch database (excluding deleted branches)
  const branchesMap: BranchDatabase = useMemo(() => {
    const merged: BranchDatabase = { ...BRANCH_DATABASE };
    Object.entries(customBranches).forEach(([code, data]) => {
      if (data.isDeleted) {
        delete merged[code];
      } else {
        merged[code] = data;
      }
    });
    return merged;
  }, [customBranches]);

  // Handle URL Query Params for instant QR tracking (only opens modal if authenticated)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const trackParam = urlParams.get('track') || urlParams.get('trackingId');
      if (trackParam) {
        setActiveTrackingId(trackParam);
        if (user) {
          setIsTrackingOpen(true);
        }
      }
    } catch (e) {
      console.error('Error parsing URL track param', e);
    }
  }, [user]);

  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      isInitialLoadDoneRef.current = false;
      if (currentUser) {
        try {
          const prof = await syncUserProfile(currentUser);
          setCurrentUserProfile(prof);
        } catch (e) {
          console.warn('Profile sync error', e);
        }
      } else {
        setCurrentUserProfile(null);
        setBillItems([]);
        setSearchedToday(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // Notifications loader & poller
  useEffect(() => {
    let isMounted = true;
    const loadNotifs = async () => {
      try {
        const list = await fetchNotifications(currentUserProfile?.branchCode);
        if (isMounted) {
          setNotifications(list);
        }
      } catch (e) {
        // Silent catch for background poller
      }
    };

    loadNotifs();
    const interval = setInterval(loadNotifs, 20000); // Poll every 20 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUserProfile?.branchCode]);

  // Global Keyboard Shortcuts (authenticated only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!user) return; // Completely disabled when not logged in
      const isSuper = isAdminEmail(user.email);

      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        if (isSuper) setIsShortcutsOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        if (isSuper) setIsBranchManagerOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isSuper) setIsAnalyticsOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        if (isSuper) setIsDateReportOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        setEditingSubmission(null);
        setIsBranchEntryOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        if (isSuper) setIsBackupOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        setIsTrackingOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  // Load state from local storage on initial boot (guest or offline)
  useEffect(() => {
    // Custom Branches
    const storedCustom = localStorage.getItem('sonali_custom_branches');
    if (storedCustom) {
      try { setCustomBranches(JSON.parse(storedCustom)); } catch (e) {}
    }

    // Voucher Config
    const storedConfig = localStorage.getItem('sonali_voucher_config');
    if (storedConfig) {
      try { setVoucherConfig({ ...DEFAULT_VOUCHER_CONFIG, ...JSON.parse(storedConfig) }); } catch (e) {}
    }

    // Saved Bills for local
    const storedSavedBills = localStorage.getItem('sonali_saved_bills_local') || localStorage.getItem('sonali_saved_bills');
    if (storedSavedBills) {
      try { setSavedBills(JSON.parse(storedSavedBills)); } catch (e) {}
    }

    // Bill Draft
    const storedBill = localStorage.getItem('sonali_bill_draft');
    if (storedBill) {
      try { setBillItems(JSON.parse(storedBill)); } catch (e) {}
    }

    // Stats
    const storedStats = localStorage.getItem('sonali_stats');
    if (storedStats) {
      const { count, date } = JSON.parse(storedStats);
      if (new Date(date).toDateString() === new Date().toDateString()) {
        setSearchedToday(count);
      }
    }
  }, []);

  // Firestore Data Fetching & Real-time Synchronization
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (!isAuthReady) return;
      
      // Ignore local optimistic writes so we don't trigger local re-render loops
      if (docSnap.metadata.hasPendingWrites) {
        return;
      }

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Record incoming snapshot signature
        const incomingPayloadKey = JSON.stringify({
          searchedToday: data.searchedToday || 0,
          billDraft: data.billDraft || '[]',
          customBranches: data.customBranches || '{}',
          voucherConfig: data.voucherConfig || '{}',
        });
        lastSyncedPayloadRef.current = incomingPayloadKey;
        
        // Sync search stats
        if (data.lastSearchDate && new Date(data.lastSearchDate).toDateString() === new Date().toDateString()) {
          setSearchedToday(prev => prev === (data.searchedToday || 0) ? prev : (data.searchedToday || 0));
        } else {
          setSearchedToday(prev => prev === 0 ? prev : 0);
        }

        // Sync bill items
        if (data.billDraft) {
          try {
            const parsed = typeof data.billDraft === 'string' ? JSON.parse(data.billDraft) : data.billDraft;
            setBillItems(prev => {
              if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
              return parsed;
            });
          } catch (e) {
            console.error("Failed to parse bill draft from Firestore", e);
          }
        }

        // Sync custom branches
        if (data.customBranches) {
          try {
            const parsedBranches = typeof data.customBranches === 'string' ? JSON.parse(data.customBranches) : data.customBranches;
            setCustomBranches(prev => {
              if (JSON.stringify(prev) === JSON.stringify(parsedBranches)) return prev;
              return parsedBranches;
            });
          } catch (e) {
            console.error("Failed to parse custom branches from Firestore", e);
          }
        }

        // Sync voucher config
        if (data.voucherConfig) {
          try {
            const parsedConfig = typeof data.voucherConfig === 'string' ? JSON.parse(data.voucherConfig) : data.voucherConfig;
            setVoucherConfig(prev => {
              const merged = { ...DEFAULT_VOUCHER_CONFIG, ...prev, ...parsedConfig };
              if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
              return merged;
            });
          } catch (e) {
            console.error("Failed to parse voucher config from Firestore", e);
          }
        }
      }

      isInitialLoadDoneRef.current = true;
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Real-time listener for saved bills collection
    const savedBillsQuery = query(collection(db, `users/${user.uid}/savedBills`));
    const unsubSavedBills = onSnapshot(savedBillsQuery, (snapshot) => {
      const bills: SavedBill[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        bills.push({ id: docSnap.id, ...data } as SavedBill);
      });
      bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSavedBills(bills);
      localStorage.setItem('sonali_saved_bills', JSON.stringify(bills));
      localStorage.setItem('sonali_saved_bills_local', JSON.stringify(bills));
    }, (error) => {
      console.error("Error subscribing to saved bills:", error);
    });

    return () => {
      unsubscribe();
      unsubSavedBills();
    };
  }, [isAuthReady, user]);

  const saveToFirestore = useCallback(async () => {
    if (!user || !isInitialLoadDoneRef.current) return;

    const currentPayloadKey = JSON.stringify({
      searchedToday,
      billDraft: JSON.stringify(billItems),
      customBranches: JSON.stringify(customBranches),
      voucherConfig: JSON.stringify(voucherConfig),
    });

    // If identical to what was already synced or loaded, avoid redundant cloud write
    if (lastSyncedPayloadRef.current === currentPayloadKey) {
      return;
    }

    setIsSyncing(true);
    try {
      lastSyncedPayloadRef.current = currentPayloadKey;
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        searchedToday,
        lastSearchDate: new Date().toISOString(),
        billDraft: JSON.stringify(billItems),
        customBranches: JSON.stringify(customBranches),
        voucherConfig: JSON.stringify(voucherConfig),
      }, { merge: true });
      setLastSaved(new Date());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSyncing(false);
    }
  }, [user, searchedToday, billItems, customBranches, voucherConfig]);

  // Auto-save debounced sync
  useEffect(() => {
    let total = 0;
    billItems.forEach(item => {
      const engVal = toEnglishDigits(item.amount.replace(/,/g, ''));
      const num = parseFloat(engVal);
      if (!isNaN(num)) total += num;
    });
    setTotalAmount(total);

    if (user) {
      if (!isInitialLoadDoneRef.current) return;
      const timeoutId = setTimeout(() => {
        saveToFirestore();
      }, 800);
      return () => clearTimeout(timeoutId);
    } else {
      localStorage.setItem('sonali_bill_draft', JSON.stringify(billItems));
      localStorage.setItem('sonali_custom_branches', JSON.stringify(customBranches));
      localStorage.setItem('sonali_voucher_config', JSON.stringify(voucherConfig));
      localStorage.setItem('sonali_stats', JSON.stringify({
        count: searchedToday,
        date: new Date().toISOString()
      }));
      setLastSaved(new Date());
    }
  }, [billItems, searchedToday, customBranches, voucherConfig, user, saveToFirestore]);

  const handleManualSave = async () => {
    if (user) {
      await saveToFirestore();
      addToast('ড্রাফট ও সেটিংস ক্লাউডে সেভ হয়েছে', 'success');
    } else {
      localStorage.setItem('sonali_bill_draft', JSON.stringify(billItems));
      localStorage.setItem('sonali_custom_branches', JSON.stringify(customBranches));
      localStorage.setItem('sonali_voucher_config', JSON.stringify(voucherConfig));
      localStorage.setItem('sonali_stats', JSON.stringify({
        count: searchedToday,
        date: new Date().toISOString()
      }));
      setLastSaved(new Date());
      addToast('ড্রাফট ব্রাউজারে সেভ হয়েছে', 'success');
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSearchIncrement = () => {
    setSearchedToday(prev => prev + 1);
  };

  const handleAddToBill = (code: string, data: BranchData) => {
    const exists = billItems.some(item => item.code === code);
    
    if (exists) {
      addToast('এই ব্রাঞ্চটি ইতোমধ্যে লিস্টে যোগ করা আছে।', 'error');
      return;
    }

    setBillItems(prev => [
      ...prev, 
      { 
        ...data, 
        code, 
        serial: '', 
        amount: '' 
      }
    ]);

    addToast('ব্রাঞ্চটি সফলভাবে লিস্টে যোগ করা হয়েছে!', 'success');
  };

  // Branch Manager Handlers
  const handleSaveCustomBranch = (code: string, data: BranchData) => {
    setCustomBranches(prev => ({
      ...prev,
      [code]: { ...data, isCustom: !BRANCH_DATABASE[code], isDeleted: false }
    }));
  };

  const handleDeleteBranch = (code: string, permanent: boolean = false) => {
    setCustomBranches(prev => {
      const updated = { ...prev };
      if (BRANCH_DATABASE[code]) {
        // Built-in branch: mark as isDeleted: true
        updated[code] = {
          ...BRANCH_DATABASE[code],
          ...(prev[code] || {}),
          isDeleted: true
        };
      } else {
        // Custom branch
        if (permanent) {
          delete updated[code];
        } else {
          updated[code] = {
            ...(prev[code] || {}),
            isDeleted: true
          };
        }
      }
      return updated;
    });
  };

  const handleRestoreBranch = (code: string) => {
    setCustomBranches(prev => {
      const updated = { ...prev };
      if (BRANCH_DATABASE[code]) {
        if (updated[code]) {
          const current = { ...updated[code] };
          delete current.isDeleted;
          const defaultData = BRANCH_DATABASE[code];
          if (
            current.branch === defaultData.branch &&
            current.name === defaultData.name &&
            current.mobile === defaultData.mobile &&
            current.ext === defaultData.ext &&
            current.email === defaultData.email
          ) {
            delete updated[code];
          } else {
            updated[code] = current;
          }
        }
      } else if (updated[code]) {
        updated[code] = {
          ...updated[code],
          isDeleted: false
        };
      }
      return updated;
    });
  };

  const handleImportCustomBranches = (imported: BranchDatabase) => {
    setCustomBranches(prev => ({
      ...prev,
      ...imported
    }));
  };

  // Backup & Restore Handlers
  const handleRestoreBackup = (data: { savedBills?: SavedBill[]; customBranches?: BranchDatabase; draftBill?: BillItem[] }) => {
    if (data.draftBill) setBillItems(data.draftBill);
    if (data.customBranches) setCustomBranches(data.customBranches);
    if (data.savedBills) {
      setSavedBills(data.savedBills);
      localStorage.setItem('sonali_saved_bills', JSON.stringify(data.savedBills));
    }
  };

  const handleUpdateBillStatus = async (billId: string, newStatus: BillStatus) => {
    try {
      if (user) {
        await setDoc(doc(db, `users/${user.uid}/savedBills`, billId), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setSavedBills(prev => prev.map(bill => {
        if (bill.id === billId) {
          return { ...bill, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return bill;
      }));

      const localSaved = localStorage.getItem('sonali_saved_bills_local');
      if (localSaved) {
        try {
          const list: SavedBill[] = JSON.parse(localSaved);
          const updated = list.map(b => b.id === billId ? { ...b, status: newStatus, updatedAt: new Date().toISOString() } : b);
          localStorage.setItem('sonali_saved_bills_local', JSON.stringify(updated));
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error updating bill status', e);
    }
  };

  const handleOpenTrackingWithId = (trackingId?: string) => {
    if (trackingId) {
      setActiveTrackingId(trackingId);
    }
    setIsTrackingOpen(true);
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      addToast('সফলভাবে লগইন হয়েছে', 'success');
    } catch (error: any) {
      console.error("Login failed", error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        addToast('লগইন ব্যর্থ হয়েছে: ' + (error?.message || 'সমস্যা দেখা দিয়েছে'), 'error');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentUserProfile(null);
      setBillItems([]);
      setSearchedToday(0);
      setIsBranchManagerOpen(false);
      setIsAnalyticsOpen(false);
      setIsBackupOpen(false);
      setIsShortcutsOpen(false);
      setIsTrackingOpen(false);
      setIsBranchEntryOpen(false);
      setIsDateReportOpen(false);
      setIsRoleManagerOpen(false);
      setIsNotificationCenterOpen(false);
      setEditingSubmission(null);
      setHistorySubmission(null);
      addToast('লগআউট সম্পন্ন হয়েছে', 'info');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const activeEmail = currentUserProfile?.email || user?.email;
  const isAdmin = isAdminEmail(activeEmail);

  const handleOpenDateReport = () => {
    if (!isAdmin) {
      addToast('অ্যাক্সেস সংরক্ষিত: তারিখ টু তারিখ রিপোর্ট শুধুমাত্র অনুমোদিত অ্যাডমিনদের জন্য নির্ধারিত।', 'error');
      return;
    }
    setIsDateReportOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors flex flex-col justify-between">
      <div>
        <Header 
          user={user} 
          currentUserProfile={currentUserProfile}
          unreadNotificationCount={notifications.filter(n => !(n.isRead || n.read)).length}
          onLogin={handleLogin} 
          onLogout={handleLogout} 
          isSyncing={isSyncing} 
          onOpenBranchManager={() => {
            if (isAdmin) setIsBranchManagerOpen(true);
            else addToast('ব্রাঞ্চ ম্যানেজার শুধুমাত্র অ্যাডমিনদের জন্য সংরক্ষিত', 'error');
          }}
          onOpenAnalytics={() => {
            if (isAdmin) setIsAnalyticsOpen(true);
            else addToast('অ্যানালিটিক্স শুধুমাত্র অ্যাডমিনদের জন্য সংরক্ষিত', 'error');
          }}
          onOpenBackup={() => {
            if (isAdmin) setIsBackupOpen(true);
            else addToast('ব্যাকআপ শুধুমাত্র অ্যাডমিনদের জন্য সংরক্ষিত', 'error');
          }}
          onOpenShortcuts={() => {
            if (isAdmin) setIsShortcutsOpen(true);
          }}
          onOpenTracking={() => handleOpenTrackingWithId()}
          onOpenBranchEntry={() => {
            setEditingSubmission(null);
            setIsBranchEntryOpen(true);
          }}
          onOpenDateReport={handleOpenDateReport}
          onOpenRoleManager={() => {
            if (isAdmin) setIsRoleManagerOpen(true);
          }}
          onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
        />
        
        <main className="max-w-7xl mx-auto px-4 py-8 flex-1">
          {!isAuthReady ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                নিরাপত্তা যাচাই ও অথেন্টিকেশন স্টেট লোড হচ্ছে...
              </p>
            </div>
          ) : !user ? (
            <CentralLoginCard onLogin={handleLogin} />
          ) : isAdmin ? (
            <>
              <Stats 
                totalBranches={Object.keys(branchesMap).length} 
                searchedToday={searchedToday}
                totalAmount={totalAmount}
              />

              {/* Quick Access Portal & Date Report Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Card 1: Branch Bill Submission */}
                <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:to-transparent border border-emerald-300/80 dark:border-emerald-700/60 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3.5">
                    <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-md shadow-emerald-600/20 shrink-0">
                      <Building2 size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">শাখা ও কর্মকর্তা বিল এন্ট্রি</h3>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                          Branch Portal
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                        শাখা ও কর্মকর্তারা নিজেদের ভাউচার ও খরচের বিল সরাসরি ইনপুট দিতে পারবেন।
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSubmission(null);
                      setIsBranchEntryOpen(true);
                    }}
                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <span>বিল এন্ট্রি দিন</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Card 2: Date-to-Date Report & Auto Billing */}
                <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-950/40 dark:to-transparent border border-blue-300/80 dark:border-blue-700/60 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3.5">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-2xl shadow-md shadow-blue-600/20 shrink-0">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">তারিখ টু তারিখ রিপোর্ট ও অটো বিল</h3>
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                          Auto Billing
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                        তারিখ দিয়ে রিপোর্ট বের করুন এবং এক ক্লিকে মূল বিলে লোড করে প্রিন্ট করুন।
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleOpenDateReport}
                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <span>তারিখ রিপোর্ট ও বিল</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Search & Quick Info */}
                <div className="lg:col-span-5 space-y-6">
                  <SearchSection 
                    onSearchComplete={handleSearchIncrement} 
                    onAddToBill={handleAddToBill}
                    branchesMap={branchesMap}
                    onOpenBranchManager={() => setIsBranchManagerOpen(true)}
                  />
                  
                  {/* Quick Feature Guidance Card */}
                  <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/50 p-6 rounded-3xl shadow-sm space-y-3">
                    <h3 className="text-emerald-900 dark:text-emerald-300 font-bold text-base flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      স্মার্ট টিপস ও শর্টকাট
                    </h3>
                    <ul className="text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm space-y-2 leading-relaxed font-medium">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span><kbd className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-emerald-200 dark:border-gray-700">Ctrl + Shift + T</kbd> চেপে সরাসরি <strong>কিউআর ট্র্যাকিং সিস্টেম</strong> খুলুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>টাকার ঘরে সরাসরি যোগ/বিয়োগ যেমন <code className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-gray-700">500+250</code> লিখে Enter চাপুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>যেকোনো সময় <kbd className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-emerald-200 dark:border-gray-700">Ctrl + /</kbd> চেপে কীবোর্ড শর্টকাট তালিকা দেখুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span><kbd className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-emerald-200 dark:border-gray-700">Ctrl + Shift + B</kbd> চেপে সরাসরি নতুন ব্রাঞ্চ যোগ বা কাস্টমাইজ করুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>প্রিন্ট প্রিভিউ থেকে ভাউচার প্যাডের প্যাডিং, টাইটেল ও হেডার কাস্টমাইজ করতে পারবেন।</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right Column: Bill Generator */}
                <div className="lg:col-span-7">
                  <BillSection 
                    billItems={billItems} 
                    setBillItems={setBillItems}
                    totalAmount={totalAmount}
                    user={user}
                    addToast={addToast}
                    lastSaved={lastSaved}
                    onSave={handleManualSave}
                    branchesMap={branchesMap}
                    voucherConfig={voucherConfig}
                    onUpdateVoucherConfig={(cfg) => setVoucherConfig(cfg)}
                    onOpenTracking={(id) => handleOpenTrackingWithId(id)}
                  />
                </div>
              </div>
            </>
          ) : (
            <GeneralUserDashboard
              currentUserProfile={currentUserProfile}
              branchesMap={branchesMap}
              onOpenNewSubmission={(branchCode) => {
                setEditingSubmission(null);
                setSubmissionInitialBranch(branchCode || '');
                setIsBranchEntryOpen(true);
              }}
              onOpenEditSubmission={(sub) => {
                setEditingSubmission(sub);
                setSubmissionInitialBranch(sub.branchCode);
                setIsBranchEntryOpen(true);
              }}
              onOpenHistory={(sub) => setHistorySubmission(sub)}
              onOpenTracking={(id) => handleOpenTrackingWithId(id)}
            />
          )}
        </main>
      </div>

      <Footer />

      {/* Global Modals - strictly available when authenticated */}
      {user && (
        <>
          <BranchManagerModal 
            isOpen={isBranchManagerOpen}
            onClose={() => setIsBranchManagerOpen(false)}
            allBranches={branchesMap}
            customBranches={customBranches}
            billItems={billItems}
            onSaveBranch={handleSaveCustomBranch}
            onDeleteBranch={handleDeleteBranch}
            onRestoreBranch={handleRestoreBranch}
            onDeleteCustomBranch={(code) => handleDeleteBranch(code, false)}
            onImportCustomBranches={handleImportCustomBranches}
            onAddToBill={handleAddToBill}
            addToast={addToast}
          />

          <AnalyticsModal 
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
            savedBills={savedBills}
            currentBillItems={billItems}
          />

          <DataBackupModal 
            isOpen={isBackupOpen}
            onClose={() => setIsBackupOpen(false)}
            savedBills={savedBills}
            draftBill={billItems}
            customBranches={customBranches}
            onRestoreBackup={handleRestoreBackup}
            addToast={addToast}
          />

          <KeyboardShortcutsModal 
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />

          <BillTrackingModal
            isOpen={isTrackingOpen}
            onClose={() => setIsTrackingOpen(false)}
            savedBills={savedBills}
            currentBillItems={billItems}
            currentTotal={totalAmount}
            currentConfig={voucherConfig}
            initialTrackingId={activeTrackingId}
            onLoadBillToEditor={(items, cfg, name) => {
              setBillItems(items);
              if (cfg) setVoucherConfig(cfg);
              addToast(`বিল '${name || ''}' এডিটরে লোড করা হয়েছে`, 'success');
            }}
            onOpenPrintPreview={(items, tot, cfg) => {
              setTrackingPreviewBill({ items, total: tot, config: cfg });
            }}
            onUpdateBillStatus={handleUpdateBillStatus}
            addToast={addToast}
          />

          {trackingPreviewBill && (
            <PrintPreviewModal
              isOpen={!!trackingPreviewBill}
              onClose={() => setTrackingPreviewBill(null)}
              billItems={trackingPreviewBill.items}
              totalAmount={trackingPreviewBill.total}
              config={trackingPreviewBill.config}
              addToast={addToast}
            />
          )}

          <BranchSubmissionModal 
            isOpen={isBranchEntryOpen}
            onClose={() => {
              setIsBranchEntryOpen(false);
              setEditingSubmission(null);
              setSubmissionInitialBranch('');
            }}
            branchesMap={branchesMap}
            currentUserProfile={currentUserProfile || undefined}
            editingSubmission={editingSubmission || undefined}
            initialBranchCode={submissionInitialBranch}
            onSuccessToast={(msg) => addToast(msg, 'success')}
          />

          <DateReportModal
            isOpen={isDateReportOpen}
            onClose={() => setIsDateReportOpen(false)}
            branchesMap={branchesMap}
            currentUserProfile={currentUserProfile || undefined}
            onOpenEditSubmission={(sub) => {
              setEditingSubmission(sub);
              setIsBranchEntryOpen(true);
            }}
            onLoadIntoBill={(items, note) => {
              setBillItems(items);
              setVoucherConfig(prev => ({
                ...prev,
                subject: 'বিভিন্ন শাখার দাখিলকৃত বিল পরিশোধ বাবদ',
                note: note || prev.note
              }));
              addToast(`তারিখ ভিত্তিক ${items.length} টি বিল সফলভাবে লোড হয়েছে! এখন প্রিভিউ ও প্রিন্ট করতে পারবেন।`, 'success');
            }}
            onSuccessToast={(msg) => addToast(msg, 'success')}
          />

          <RoleManagerModal
            isOpen={isRoleManagerOpen}
            onClose={() => setIsRoleManagerOpen(false)}
            currentUserProfile={currentUserProfile}
            branchesMap={branchesMap}
            onProfileUpdated={(updated: UserProfileData) => {
              setCurrentUserProfile(updated);
              addToast(`রোল আপডেট হয়েছে: ${updated.role}`, 'success');
            }}
          />

          <NotificationCenterModal
            isOpen={isNotificationCenterOpen}
            onClose={() => setIsNotificationCenterOpen(false)}
            notifications={notifications}
            onMarkAsRead={async (id: string) => {
              await markNotificationAsRead(id);
              setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, read: true } : n));
            }}
            onOpenSubmission={(trackingId: string) => {
              setIsNotificationCenterOpen(false);
              handleOpenTrackingWithId(trackingId);
            }}
          />

          {historySubmission && (
            <ApprovalHistoryModal
              isOpen={!!historySubmission}
              onClose={() => setHistorySubmission(null)}
              submission={historySubmission}
            />
          )}
        </>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
