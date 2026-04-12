import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Stats from './components/Stats';
import SearchSection from './components/SearchSection';
import BillSection from './components/BillSection';
import Toast from './components/Toast';
import { BRANCH_DATABASE, toEnglishDigits } from './constants';
import { BillItem, BranchData, ToastData } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDocFromServer } from 'firebase/firestore';

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
  }
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const App: React.FC = () => {
  const [searchedToday, setSearchedToday] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Lifted state
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load searched count from local storage (fallback)
  useEffect(() => {
    if (user) return; // If logged in, we use Firestore
    const storedStats = localStorage.getItem('sonali_stats');
    if (storedStats) {
      const { count, date } = JSON.parse(storedStats);
      if (new Date(date).toDateString() === new Date().toDateString()) {
        setSearchedToday(count);
      }
    }

    // Auto-load bill items (Persist State)
    const storedBill = localStorage.getItem('sonali_bill_draft');
    if (storedBill) {
        try {
            setBillItems(JSON.parse(storedBill));
        } catch(e) { console.error("Failed to load draft", e); }
    }
  }, [user]);

  // Firestore Data Fetching
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (!isAuthReady) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Sync search stats
        if (data.lastSearchDate && new Date(data.lastSearchDate).toDateString() === new Date().toDateString()) {
          setSearchedToday(prev => prev === (data.searchedToday || 0) ? prev : (data.searchedToday || 0));
        } else {
          setSearchedToday(prev => prev === 0 ? prev : 0);
        }

        // Sync bill items
        if (data.billDraft) {
          try {
            setBillItems(prev => {
              if (JSON.stringify(prev) === data.billDraft) return prev;
              return JSON.parse(data.billDraft);
            });
          } catch (e) {
            console.error("Failed to parse bill draft from Firestore", e);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Auto-save to Firestore or LocalStorage
  useEffect(() => {
    // Recalculate total
    let total = 0;
    billItems.forEach(item => {
        const engVal = toEnglishDigits(item.amount.replace(/,/g, ''));
        const num = parseFloat(engVal);
        if (!isNaN(num)) total += num;
    });
    setTotalAmount(total);

    if (user) {
      // Save to Firestore
      const saveToFirestore = async () => {
        setIsSyncing(true);
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            searchedToday,
            lastSearchDate: new Date().toISOString(),
            billDraft: JSON.stringify(billItems)
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        } finally {
          setIsSyncing(false);
        }
      };
      // Debounce saving slightly to avoid too many writes
      const timeoutId = setTimeout(() => {
        saveToFirestore();
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      // Save to LocalStorage
      localStorage.setItem('sonali_bill_draft', JSON.stringify(billItems));
      localStorage.setItem('sonali_stats', JSON.stringify({
        count: searchedToday,
        date: new Date().toISOString()
      }));
    }
  }, [billItems, searchedToday, user]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSearchIncrement = () => {
    setSearchedToday(prev => prev + 1);
  };

  const handleAddToBill = (code: string, data: BranchData) => {
    const exists = billItems.some(item => item.code === code);
    
    setBillItems(prev => [
        ...prev, 
        { 
            ...data, 
            code, 
            serial: '', 
            amount: '' 
        }
    ]);

    addToast(
        exists ? 'ব্রাঞ্চটি আবারও লিস্টে যোগ করা হয়েছে।' : 'ব্রাঞ্চটি সফলভাবে লিস্টে যোগ করা হয়েছে!', 
        'success'
    );
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      addToast('সফলভাবে লগইন হয়েছে', 'success');
    } catch (error) {
      console.error("Login failed", error);
      addToast('লগইন ব্যর্থ হয়েছে', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setBillItems([]);
      setSearchedToday(0);
      addToast('লগআউট সম্পন্ন হয়েছে', 'info');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 font-sans text-gray-800">
      <Header 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        isSyncing={isSyncing} 
      />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        <Stats 
          totalBranches={Object.keys(BRANCH_DATABASE).length} 
          searchedToday={searchedToday}
          totalAmount={totalAmount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Search */}
          <div className="lg:col-span-5 space-y-6">
            <SearchSection 
                onSearchComplete={handleSearchIncrement} 
                onAddToBill={handleAddToBill}
            />
            
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
              <h3 className="text-blue-800 font-bold mb-2">টিপস</h3>
              <p className="text-blue-600 text-sm leading-relaxed">
                • সার্চ রেজাল্ট থেকে সরাসরি (+) বাটনে চাপ দিয়ে লিস্টে নাম তুলুন।<br/>
                • পেজ রিফ্রেশ দিলেও আপনার তৈরি করা লিস্ট মুছে যাবে না।<br/>
                • লগইন করলে আপনার ডাটা ক্লাউডে সেভ থাকবে।
              </p>
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
            />
          </div>
        </div>

      </main>

      <Footer />
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default App;