import { useState, useEffect } from 'react';
import { FileSpreadsheet, Printer, Trash2, AlertCircle, Plus, Eraser, RotateCcw as ResetIcon, Check, X as CloseIcon, ArrowUp, ArrowDown, ArrowUpDown, User } from 'lucide-react';
import { BRANCH_DATABASE, toBanglaDigits, toEnglishDigits } from '../constants';
import { BillItem } from '../types';

interface BillSectionProps {
  billItems: BillItem[];
  setBillItems: React.Dispatch<React.SetStateAction<BillItem[]>>;
  totalAmount: number;
}

const BillSection: React.FC<BillSectionProps> = ({ billItems, setBillItems, totalAmount }) => {
  const [inputCodes, setInputCodes] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [notFoundCodes, setNotFoundCodes] = useState<string[]>([]);
  
  // States for confirmation
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

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

      codes.forEach(code => {
        if (BRANCH_DATABASE[code]) {
          newItems.push({
            ...BRANCH_DATABASE[code],
            code: code,
            serial: '',
            amount: ''
          });
        } else {
          missing.push(toBanglaDigits(code));
        }
      });

      setBillItems(prev => [...prev, ...newItems]);
      setNotFoundCodes(missing);
      setInputCodes('');
      setLoading(false);
    }, 400);
  };

  const handleInputChange = (index: number, field: 'serial' | 'amount', value: string) => {
    const newItems = [...billItems];
    newItems[index][field] = value;
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if(!printWindow) return;

    const tableRows = billItems.map((item, idx) => `
        <tr>
            <td style="text-align:center">${toBanglaDigits(idx + 1)}</td>
            <td style="text-align:center">${toBanglaDigits(item.code)}</td>
            <td>${item.branch}</td>
            <td>${item.name}</td>
            <td style="text-align:center">${item.mobile}</td>
            <td style="text-align:center">${item.serial || '-'}</td>
            <td style="text-align:right; font-weight:bold">${item.amount ? toBanglaDigits(item.amount) : '০'}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <title>সোনালী লাইফ - বিল তালিকা</title>
            <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Hind Siliguri', sans-serif; padding: 40px; color: #111; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #047857; padding-bottom: 20px; }
                h1 { color: #047857; margin: 0; font-size: 28px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th { background-color: #047857; color: white; padding: 10px; border: 1px solid #065f46; }
                td { border: 1px solid #ccc; padding: 8px; }
                .total-row { background-color: #f0fdf4; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header"><h1>সোনালী লাইফ ইন্স্যুরেন্স</h1><p>পেমেন্ট তালিকা</p></div>
            <table>
                <thead><tr><th>ক্রমিক</th><th>কোড</th><th>শাখা</th><th>নাম</th><th>মোবাইল</th><th>সিরিয়াল</th><th>টাকা</th></tr></thead>
                <tbody>${tableRows}<tr class="total-row"><td colspan="6" style="text-align:right">সর্বমোট:</td><td style="text-align:right">${toBanglaDigits(totalAmount)}</td></tr></tbody>
            </table>
            ${note ? `<div style="margin-top:20px; padding:15px; background:#f9f9f9; border:1px solid #eee;"><strong>নোট:</strong> ${note}</div>` : ''}
            <script>window.print();</script>
        </body>
        </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-emerald-100">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <span className="bg-orange-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold">২</span>
          <h2 className="text-xl font-bold text-gray-800">বিল / তালিকা তৈরি (Custom List)</h2>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">বাল্ক কোড ইনপুট (কমা দিয়ে আলাদা করুন)</label>
          <div className="relative">
            <textarea
                value={inputCodes}
                onChange={(e) => setInputCodes(e.target.value)}
                placeholder="যেমন: ৩৪১, ২৮৫, ১৮৫, ২৮৪"
                className="w-full h-24 p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-all resize-none text-lg"
            />
            {inputCodes && (
                <button 
                    onClick={() => setInputCodes('')}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm"
                >
                    <Eraser size={16} />
                </button>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerateList}
          disabled={loading || !inputCodes.trim()}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-xl font-bold shadow-md shadow-orange-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'প্রসেসিং...' : <><Plus size={20} /> যোগ করুন</>}
        </button>
        
        {notFoundCodes.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm border border-red-100 animate-in fade-in">
                <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                <span>পাওয়া যায়নি: {notFoundCodes.join(', ')}</span>
            </div>
        )}
      </div>

      {billItems.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-emerald-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                পেমেন্ট তালিকা 
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">{toBanglaDigits(billItems.length)} টি</span>
            </h3>
            
            <div className="flex flex-wrap justify-center gap-2">
                {/* 2-Step Reset Button */}
                <button 
                  onClick={handleResetData} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-sm font-bold text-xs border ${
                    isConfirmingReset 
                    ? 'bg-amber-500 text-white border-amber-600 scale-105' 
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
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
                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white'
                  }`}
                >
                    {isConfirmingClear ? <><Check size={14} /> মুছুন?</> : <><Trash2 size={14} /> সব মুছুন</>}
                </button>

                <div className="w-[1px] h-8 bg-gray-200 mx-1 hidden sm:block"></div>
                
                <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-bold text-xs">
                    <FileSpreadsheet size={14} /> Excel
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-bold text-xs">
                    <Printer size={14} /> Print
                </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                    onClick={() => handleSort('branch')}
                  >
                    <div className="flex items-center gap-1">
                      বিবরণ
                      <span className="text-gray-400 group-hover:text-emerald-600">
                        {sortField === 'branch' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="p-4 w-28 text-center cursor-pointer hover:bg-gray-100 transition-colors group"
                    onClick={() => handleSort('serial')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      সিরিয়াল
                      <span className="text-gray-400 group-hover:text-emerald-600">
                        {sortField === 'serial' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="p-4 w-32 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      টাকা
                      <span className="text-gray-400 group-hover:text-emerald-600">
                        {sortField === 'amount' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                      </span>
                    </div>
                  </th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="p-4 text-gray-400 font-bold text-xs text-center">{toBanglaDigits(idx + 1)}</td>
                    <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">{toBanglaDigits(item.code)}</span>
                                <span className="font-bold text-gray-800 text-sm leading-tight">{item.branch}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <User size={12} className="text-gray-400 shrink-0" />
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
                        className="w-full p-2 border border-gray-100 rounded-lg text-center text-sm focus:border-emerald-500 outline-none bg-gray-50/50 focus:bg-white transition-all font-medium"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        value={toBanglaDigits(item.amount)}
                        onChange={(e) => handleInputChange(idx, 'amount', toEnglishDigits(e.target.value))}
                        placeholder="০"
                        className="w-full p-2 border border-gray-100 rounded-lg text-right font-bold text-sm text-gray-700 focus:text-black focus:border-emerald-500 outline-none bg-gray-50/50 focus:bg-white transition-all"
                      />
                    </td>
                    <td className="p-2 text-center">
                        <button 
                            onClick={() => removeItem(idx)}
                            className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all sm:opacity-0 group-hover:opacity-100"
                        >
                            <CloseIcon size={16} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50/50 font-bold border-t border-emerald-100">
                <tr>
                    <td colSpan={3} className="p-5 text-right text-gray-500 text-xs uppercase tracking-widest">সর্বমোট:</td>
                    <td className="p-5 text-right text-emerald-800 text-xl font-black">{toBanglaDigits(totalAmount)}</td>
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
                className="w-full p-4 border border-gray-100 rounded-xl focus:border-emerald-500 outline-none text-sm min-h-[100px] bg-gray-50/30 focus:bg-white transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BillSection;