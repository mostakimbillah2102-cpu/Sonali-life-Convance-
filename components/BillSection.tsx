import { useState, useEffect } from 'react';
import { FileSpreadsheet, Printer, Trash2, AlertCircle, Plus, Eraser, RotateCcw as ResetIcon, Check, X as CloseIcon, ArrowUp, ArrowDown, ArrowUpDown, User, Save, FolderOpen, Download } from 'lucide-react';
import { BRANCH_DATABASE, toBanglaDigits, toEnglishDigits } from '../constants';
import { BillItem } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import SavedBillsModal from './SavedBillsModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface BillSectionProps {
  billItems: BillItem[];
  setBillItems: React.Dispatch<React.SetStateAction<BillItem[]>>;
  totalAmount: number;
  user: FirebaseUser | null;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  lastSaved?: Date | null;
  onSave?: () => Promise<void>;
}

const BillSection: React.FC<BillSectionProps> = ({ billItems, setBillItems, totalAmount, user, addToast, lastSaved, onSave }) => {
  const [inputCodes, setInputCodes] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [notFoundCodes, setNotFoundCodes] = useState<string[]>([]);
  
  // States for confirmation
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedBillsModalOpen, setIsSavedBillsModalOpen] = useState(false);

  type SortField = 'branch' | 'serial' | 'amount' | null;
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Auto-reset confirmation buttons after 3 seconds
  useEffect(() => {
    let timer: number;
    if (isConfirmingClear) {
      timer = window.setTimeout(() => setIsConfirmingClear(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [isConfirmingClear]);

  useEffect(() => {
    let timer: number;
    if (isConfirmingReset) {
      timer = window.setTimeout(() => setIsConfirmingReset(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [isConfirmingReset]);

  const handleGenerateList = () => {
    if (!inputCodes.trim()) return;

    setLoading(true);
    setNotFoundCodes([]);
    
    const codes = inputCodes.split(/[\s,]+/).map(c => toEnglishDigits(c.trim())).filter(c => c);
    
    setTimeout(() => {
      const newItems: BillItem[] = [];
      const missing: string[] = [];
      const duplicates: string[] = [];

      codes.forEach(code => {
        if (BRANCH_DATABASE[code]) {
          if (billItems.some(item => item.code === code) || newItems.some(item => item.code === code)) {
            duplicates.push(toBanglaDigits(code));
          } else {
            newItems.push({
              ...BRANCH_DATABASE[code],
              code: code,
              serial: '',
              amount: ''
            });
          }
        } else {
          missing.push(toBanglaDigits(code));
        }
      });

      setBillItems(prev => [...prev, ...newItems]);
      setNotFoundCodes(missing);
      setInputCodes('');
      setLoading(false);
      
      if (duplicates.length > 0) {
        addToast(`ইতোমধ্যে লিস্টে আছে: ${duplicates.join(', ')}`, 'info');
      }
    }, 400);
  };

  const handleInputChange = (index: number, field: 'serial' | 'amount' | 'calculation', value: string) => {
    const newItems = [...billItems];
    newItems[index][field] = value;

    // Auto-calculate amount if calculation field changed
    if (field === 'calculation') {
      try {
        const englishCalc = toEnglishDigits(value);
        if (/^[0-9+\-*/.\s()]+$/.test(englishCalc) && englishCalc.trim() !== '') {
          // eslint-disable-next-line no-eval
          const result = eval(englishCalc);
          if (typeof result === 'number' && !isNaN(result)) {
            newItems[index].amount = Math.round(result).toString();
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    setBillItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = billItems.filter((_, i) => i !== index);
    setBillItems(newItems);
  };

  const handleClearAll = () => {
    if (isConfirmingClear) {
      setBillItems([]);
      setNote('');
      setIsConfirmingClear(false);
    } else {
      setIsConfirmingClear(true);
    }
  };

  const handleResetData = () => {
    if (isConfirmingReset) {
      const resetItems = billItems.map(item => ({ ...item, serial: '', amount: '' }));
      setBillItems(resetItems);
      setIsConfirmingReset(false);
    } else {
      setIsConfirmingReset(true);
    }
  };

  const handleSort = (field: SortField) => {
    if (!field) return;
    const isAsc = sortField === field && sortOrder === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    
    setSortField(field);
    setSortOrder(newOrder);

    const sortedItems = [...billItems].sort((a, b) => {
      let valA: any = a[field];
      let valB: any = b[field];

      if (field === 'amount' || field === 'serial') {
        valA = parseFloat(toEnglishDigits(valA?.toString().replace(/,/g, '') || '')) || 0;
        valB = parseFloat(toEnglishDigits(valB?.toString().replace(/,/g, '') || '')) || 0;
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      if (valA < valB) return newOrder === 'asc' ? -1 : 1;
      if (valA > valB) return newOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setBillItems(sortedItems);
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...billItems];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setBillItems(newItems);
  };

  const moveItemDown = (index: number) => {
    if (index === billItems.length - 1) return;
    const newItems = [...billItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setBillItems(newItems);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if(!printWindow) return;

    const monthNamesBn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
    const d = new Date();
    const currentMonthBn = monthNamesBn[d.getMonth()];
    
    const dateStr = toBanglaDigits(`${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`) + 'ইং';
    const yearStr = toBanglaDigits(d.getFullYear().toString());

    const tableRows = billItems.map((item, idx) => `
        <tr>
            <td style="text-align:center">${toBanglaDigits(idx + 1)}</td>
            <td style="text-align:center">${item.branch}</td>
            <td style="text-align:center">${toBanglaDigits(item.serial) || '-'}</td>
            <td style="text-align:center">যাতায়াত</td>
            <td style="text-align:center">${currentMonthBn}</td>
            <td style="text-align:center">সহযোগী বীমা দাবি</td>
            <td style="text-align:center">${item.name}</td>
            <td style="text-align:center">${item.amount ? toBanglaDigits(item.amount) : '০'}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <title>সোনালী লাইফ - বিল তালিকা</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla&display=swap');
                body { 
                    font-family: 'Tiro Bangla', serif; 
                    padding: 40px 60px; 
                    color: #000; 
                    font-size: 14px;
                    line-height: 1.5;
                }
                .header-container {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                .header-logo {
                    width: 70px;
                    flex-shrink: 0;
                }
                .header-text-container {
                    flex-grow: 1;
                }
                .logo-text-bn {
                    color: #c48c36; 
                    font-size: 38px; 
                    font-weight: bold; 
                    margin: 0;
                    line-height: 1.1;
                }
                .logo-text-en {
                    color: #7ab83e; 
                    font-size: 20px; 
                    margin: 0; 
                    font-family: 'Arial', sans-serif;
                    letter-spacing: 0.5px;
                }
                .sub-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                    color: #444;
                    margin-top: 5px;
                }
                .sli-text {
                    color: #c48c36;
                    font-style: italic;
                    font-weight: bold;
                    margin-right: 5px;
                    font-family: 'Arial', sans-serif;
                }
                .reg-text {
                    color: #c48c36;
                }
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                    font-size: 13px;
                }
                .note-sheet-title {
                    text-align: center;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 15px 0;
                }
                .subject {
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-decoration: underline;
                }
                .paragraph {
                    text-align: justify;
                    margin-bottom: 20px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 15px; 
                    font-size: 13px; 
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 6px; 
                }
                th { 
                    text-align: center;
                    font-weight: bold;
                }
                .total-row { 
                    font-weight: bold; 
                }
                .conclusion {
                    margin-top: 20px;
                    text-align: justify;
                }
                .signatures {
                    margin-top: 60px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    row-gap: 80px;
                    text-align: center;
                    font-size: 13px;
                }
                .sig-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .sig-line {
                    border-top: 1px solid #000;
                    width: 80%;
                    margin-bottom: 5px;
                }
                @media print {
                    body { padding: 0; }
                    @page { margin: 20mm; }
                }
            </style>
        </head>
        <body>
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #c48c36; padding-bottom: 10px;">
                <img src="${window.location.origin}/header-logo.png" onerror="this.style.display='none'; document.getElementById('css-header').style.display='block';" style="width: 100%; max-width: 700px; margin: 0 auto; display: block;" alt="Sonali Life Insurance" />
                
                <div id="css-header" class="header-container" style="display: none;">
                    <div class="header-text-container" style="text-align: center;">
                        <h1 class="logo-text-bn">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h1>
                        <h2 class="logo-text-en">SONALI LIFE INSURANCE COMPANY LIMITED</h2>
                        <div class="sub-header">
                            <span><strong class="sli-text">SLI</strong> ইসলামী শরিয়াহ্ মোতাবেক পরিচালিত জীবন বীমা কোম্পানী</span>
                            <span class="reg-text">সরকারী নিবন্ধন নম্বরঃ লাইফ ০২/২০১৩</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="meta-row">
                <span>সূত্র নংঃ এসএলআইসিএল/দাঃ বিঃ/নোঃ শীঃ/৩৭২১/${yearStr}ইং</span>
                <span>তারিখঃ ${dateStr}</span>
            </div>

            <div class="note-sheet-title"><u>নোট শীট</u></div>

            <div class="subject">
                বিষয়ঃ সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেডের দাবী নিষ্পত্তির ক্ষেত্রে শাখা অফিসারদের যাতায়াত ও আপ্যায়ন বিল পরিশোধের অনুমোদন প্রদান প্রসঙ্গে।
            </div>

            <div class="paragraph">
                সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড এর দাবী নিষ্পত্তির ক্ষেত্রে শাখা অফিসের কর্মকর্তাগণ দাবী তদন্ত করে থাকেন। সেই আলোকে শাখা অফিসারদের যাতায়াত ও আপ্যায়ন বিল নিম্নোক্ত ছক অনুযায়ী সর্বমোট = ${toBanglaDigits(totalAmount)}/- টাকা অনুমোদনের প্রয়োজনীয়তা পরিলক্ষিত হয়।
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">ক্রঃনং</th>
                        <th style="width: 15%">অফিসের নাম</th>
                        <th style="width: 10%">ক্রমিক নং</th>
                        <th style="width: 12%">বিলের ধরন</th>
                        <th style="width: 10%">মাসের নাম</th>
                        <th style="width: 15%">দাবীর ধরন</th>
                        <th style="width: 23%">অফিসারের নাম</th>
                        <th style="width: 10%">টাকা</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                    <tr class="total-row">
                        <td colspan="7" style="text-align:right; border: 1px solid #000; padding-right: 10px;">মোট বিল=</td>
                        <td style="text-align:center; border: 1px solid #000;">${toBanglaDigits(totalAmount)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="conclusion">
                এমতাবস্থায় উপরোক্ত ছক অনুযায়ী শাখা অফিসের অফিসারদের বীমাদাবী তদন্তের যাতায়াত বিল বাবদ সর্বমোট = ${toBanglaDigits(totalAmount)}/- টাকা অনুমোদনের বিষয়ে কর্তৃপক্ষের সিদ্ধান্তের লক্ষ্যে নথি পেশ করা হলো।
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>নথি উত্থাপনকারী</strong>
                    <span>সিনিয়র অফিসার দাবীবিভাগ</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>মোঃ শাহিদুর রহমান</strong>
                    <span>(ভাইস প্রেসিডেন্ট),</span>
                    <span>ইনচার্জ, দাবীবিভাগ</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>অভ্যন্তরীণ নিরীক্ষা বিভাগ</strong>
                </div>

                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>মোহাম্মদ মঞ্জুর মোর্শেদ</strong>
                    <span>(সিওও)</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>মোহাম্মদ আব্দুল হান্নান</strong>
                    <span>(ডিএমডি এন্ড সিএফও)</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>মোঃ রফিকুল ইসলাম</strong>
                    <span>(অতিরিক্ত ব্যবস্থাপনা পরিচালক)</span>
                    <span>সিইও (ভারপ্রাপ্ত)</span>
                </div>
            </div>

            <script>window.print();</script>
        </body>
        </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Sonali Life Insurance - Payment List', 14, 22);
    
    // Define table columns and data
    const tableColumn = ["#", "Code", "Branch", "Name", "Mobile", "Serial", "Amount"];
    const tableRows = billItems.map((item, idx) => [
      idx + 1,
      item.code,
      item.branch,
      item.name,
      item.mobile,
      item.serial || '-',
      item.amount || '0'
    ]);

    // Add total row
    tableRows.push(['', '', '', '', '', 'Total:', totalAmount.toString()]);

    // Generate table
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [4, 120, 87] }, // Emerald 700
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function (data: any) {
        // Make total row bold
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 253, 244]; // Emerald 50
        }
      }
    });

    // Add note if exists
    if (note) {
      const finalY = (doc as any).lastAutoTable.finalY || 30;
      doc.setFontSize(10);
      doc.text(`Note: ${note}`, 14, finalY + 10);
    }

    doc.save('sonali_list.pdf');
  };

  const handleDownloadCSV = () => {
    let content = "\uFEFFক্রমিক,কোড,শাখা,নাম,মোবাইল,সিরিয়াল,টাকা\n";
    billItems.forEach((item, idx) => {
        content += `"${toBanglaDigits(idx+1)}","${toBanglaDigits(item.code)}","${item.branch}","${item.name}","${item.mobile}","${item.serial}","${toBanglaDigits(item.amount || 0)}"\n`;
    });
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonali_list.csv`;
    link.click();
  };

  const handleSaveBill = async () => {
    if (!user) {
      addToast('বিল সেভ করতে প্রথমে লগইন করুন', 'error');
      return;
    }
    if (billItems.length === 0) {
      addToast('সেভ করার মতো কোনো ব্রাঞ্চ নেই', 'error');
      return;
    }

    const billName = window.prompt('এই বিলটির একটি নাম দিন (যেমন: জানুয়ারি মাসের বিল):');
    if (!billName || !billName.trim()) return;

    setIsSaving(true);
    try {
      const billId = Date.now().toString();
      await setDoc(doc(db, `users/${user.uid}/savedBills`, billId), {
        id: billId,
        uid: user.uid,
        name: billName.trim(),
        items: JSON.stringify(billItems),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      addToast('বিল সফলভাবে সেভ হয়েছে!', 'success');
    } catch (error) {
      console.error("Error saving bill:", error);
      addToast('বিল সেভ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-emerald-100 dark:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <span className="bg-orange-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">২</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">বিল / তালিকা তৈরি (Custom List)</h2>
          </div>
          {user && (
            <button 
              onClick={() => setIsSavedBillsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl font-bold text-sm transition-all border border-blue-100 dark:border-blue-800"
            >
              <FolderOpen size={16} />
              সেভ করা বিল
            </button>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">বাল্ক কোড ইনপুট (কমা দিয়ে আলাদা করুন)</label>
          <div className="relative">
            <textarea
                value={inputCodes}
                onChange={(e) => setInputCodes(e.target.value)}
                placeholder="যেমন: ৩৪১, ২৮৫, ১৮৫, ২৮৪"
                className="w-full h-24 p-4 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-xl focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 outline-none transition-all resize-none text-lg"
            />
            {inputCodes && (
                <button 
                    onClick={() => setInputCodes('')}
                    className="absolute top-3 right-3 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-gray-800 p-1 rounded-full shadow-sm"
                >
                    <Eraser size={16} />
                </button>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerateList}
          disabled={loading || !inputCodes.trim()}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-xl font-bold shadow-md shadow-orange-100 dark:shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'প্রসেসিং...' : <><Plus size={20} /> যোগ করুন</>}
        </button>
        
        {notFoundCodes.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2 text-sm border border-red-100 dark:border-red-800/50 animate-in fade-in">
                <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                <span>পাওয়া যায়নি: {notFoundCodes.join(', ')}</span>
            </div>
        )}
      </div>

      {billItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-emerald-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    পেমেন্ট তালিকা 
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-1 rounded-full">{toBanglaDigits(billItems.length)} টি</span>
                </h3>
                {lastSaved && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Auto-saved at: {lastSaved.toLocaleTimeString()}
                    </span>
                )}
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-2">
                {/* Save Draft Button */}
                {onSave && (
                    <button 
                      onClick={onSave}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-bold text-xs"
                    >
                        <Save size={14} /> Save Draft
                    </button>
                )}

                {/* Save Bill Button */}
                {user && (
                    <button 
                      onClick={handleSaveBill}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-bold text-xs disabled:opacity-50"
                    >
                        <Save size={14} /> {isSaving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                    </button>
                )}

                {/* 2-Step Reset Button */}
                <button 
                  onClick={handleResetData} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-sm font-bold text-xs border ${
                    isConfirmingReset 
                    ? 'bg-amber-500 text-white border-amber-600 scale-105' 
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                    {isConfirmingReset ? <><Check size={14} /> নিশ্চিত?</> : <><ResetIcon size={14} /> রিসেট</>}
                </button>

                {/* 2-Step Clear All Button */}
                <button 
                  onClick={handleClearAll} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-sm font-bold text-xs border ${
                    isConfirmingClear 
                    ? 'bg-red-600 text-white border-red-700 scale-105 animate-pulse' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50 hover:bg-red-600 hover:text-white dark:hover:bg-red-800 dark:hover:text-white'
                  }`}
                >
                    {isConfirmingClear ? <><Check size={14} /> মুছুন?</> : <><Trash2 size={14} /> সব মুছুন</>}
                </button>

                <div className="w-[1px] h-8 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
                
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-bold text-xs">
                    <Download size={14} /> PDF
                </button>
                <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-bold text-xs">
                    <FileSpreadsheet size={14} /> Excel
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-bold text-xs">
                    <Printer size={14} /> Print
                </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    onClick={() => handleSort('branch')}
                  >
                    <div className="flex items-center gap-1">
                      বিবরণ
                      <span className="text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {sortField === 'branch' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="p-4 w-28 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    onClick={() => handleSort('serial')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      সিরিয়াল
                      <span className="text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {sortField === 'serial' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="p-4 w-32 text-center text-gray-500 dark:text-gray-400"
                  >
                    হিসাব
                  </th>
                  <th 
                    className="p-4 w-32 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      টাকা
                      <span className="text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {sortField === 'amount' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th className="p-4 w-20 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {billItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors group">
                    <td className="p-4 text-gray-400 dark:text-gray-500 font-bold text-xs text-center">{toBanglaDigits(idx + 1)}</td>
                    <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">{toBanglaDigits(item.code)}</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm leading-tight">{item.branch}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <User size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                                <span className="truncate max-w-[150px] sm:max-w-none">{item.name}</span>
                            </div>
                        </div>
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        value={toBanglaDigits(item.serial)}
                        onChange={(e) => handleInputChange(idx, 'serial', toEnglishDigits(e.target.value))}
                        placeholder="-"
                        className="w-full p-2 border border-gray-100 dark:border-gray-700 rounded-lg text-center text-sm focus:border-emerald-500 dark:focus:border-emerald-500 outline-none bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 transition-all font-medium"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        value={toBanglaDigits(item.calculation || '')}
                        onChange={(e) => handleInputChange(idx, 'calculation', toEnglishDigits(e.target.value))}
                        placeholder="৫০০+২০০"
                        className="w-full p-2 border border-gray-100 dark:border-gray-700 rounded-lg text-center text-sm focus:border-emerald-500 dark:focus:border-emerald-500 outline-none bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 transition-all font-medium"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        value={toBanglaDigits(item.amount)}
                        onChange={(e) => handleInputChange(idx, 'amount', toEnglishDigits(e.target.value))}
                        placeholder="০"
                        className="w-full p-2 border border-gray-100 dark:border-gray-700 rounded-lg text-right font-bold text-sm text-gray-700 dark:text-gray-300 focus:text-black dark:focus:text-white focus:border-emerald-500 dark:focus:border-emerald-500 outline-none bg-gray-50/50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-800 transition-all"
                      />
                    </td>
                    <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => moveItemUp(idx)}
                                disabled={idx === 0}
                                className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Move Up"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button 
                                onClick={() => moveItemDown(idx)}
                                disabled={idx === billItems.length - 1}
                                className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Move Down"
                            >
                                <ArrowDown size={14} />
                            </button>
                            <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                            <button 
                                onClick={() => removeItem(idx)}
                                className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                title="Remove"
                            >
                                <CloseIcon size={16} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50/50 dark:bg-emerald-900/10 font-bold border-t border-emerald-100 dark:border-emerald-900/30">
                <tr>
                    <td colSpan={3} className="p-5 text-right text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">সর্বমোট:</td>
                    <td className="p-5 text-right text-emerald-800 dark:text-emerald-400 text-xl font-black">{toBanglaDigits(totalAmount)}</td>
                    <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6">
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="বিল সম্পর্কিত কোনো বিশেষ নোট থাকলে এখানে লিখুন (প্রিন্টে দেখা যাবে)..."
                className="w-full p-4 border border-gray-100 dark:border-gray-700 rounded-xl focus:border-emerald-500 dark:focus:border-emerald-500 outline-none text-sm min-h-[100px] bg-gray-50/30 dark:bg-gray-900/30 text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 transition-all"
            />
          </div>
        </div>
      )}

      <SavedBillsModal 
        isOpen={isSavedBillsModalOpen}
        onClose={() => setIsSavedBillsModalOpen(false)}
        userId={user?.uid}
        onLoadBill={(items) => {
          setBillItems(items);
          addToast('বিল সফলভাবে লোড হয়েছে!', 'success');
        }}
      />
    </div>
  );
};

export default BillSection;