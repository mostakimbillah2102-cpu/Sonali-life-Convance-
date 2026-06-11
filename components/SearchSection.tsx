import { useState, useRef, useEffect } from 'react';
import { Search, Copy, Check, PlusCircle, Clock, RotateCcw, X, User, Phone, ChevronRight, List, Building2, Mail } from 'lucide-react';
import { BRANCH_DATABASE, toBanglaDigits, toEnglishDigits } from '../constants';
import { BranchData } from '../types';
import AllBranchesModal from './AllBranchesModal';

interface SearchSectionProps {
  onSearchComplete: () => void;
  onAddToBill: (code: string, data: BranchData) => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ onSearchComplete, onAddToBill }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ code: string; data: BranchData }[]>([]);
  const [result, setResult] = useState<{ code: string; data: BranchData } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<{ code: string; name: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showAllModal, setShowAllModal] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('sonali_recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);
    
    if (val.length < 1) {
      setSuggestions([]);
      return;
    }

    const searchTerm = toEnglishDigits(val.toLowerCase()).normalize('NFC');
    const matches: { code: string; data: BranchData }[] = [];

    Object.keys(BRANCH_DATABASE).forEach((code) => {
      const data = BRANCH_DATABASE[code];
      const searchText = (code + data.branch + data.name + data.mobile).toLowerCase().normalize('NFC');
      if (searchText.includes(searchTerm)) {
        matches.push({ code, data });
      }
    });
    setSuggestions(matches.slice(0, 8));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        const item = suggestions[selectedIndex];
        setQuery(item.code);
        executeSearch(item.code);
      } else {
        executeSearch();
      }
    } else if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Escape') {
        setSuggestions([]);
      }
    }
  };

  const addToRecent = (code: string, name: string) => {
    const newRecent = [{ code, name }, ...recentSearches.filter(r => r.code !== code)].slice(0, 6);
    setRecentSearches(newRecent);
    localStorage.setItem('sonali_recent_searches', JSON.stringify(newRecent));
  };

  const executeSearch = (searchCode?: string) => {
    const searchTerm = searchCode || toEnglishDigits(query);
    if (!searchTerm) return;

    setLoading(true);
    setSuggestions([]);
    
    setTimeout(() => {
      let data = BRANCH_DATABASE[searchTerm];
      let finalCode = searchTerm;

      if (!data) {
        const lowerSearch = searchTerm.toLowerCase().normalize('NFC');
        const foundCode = Object.keys(BRANCH_DATABASE).find(code => {
            const d = BRANCH_DATABASE[code];
            const searchText = (code + d.branch + d.name + d.mobile).toLowerCase().normalize('NFC');
            return searchText.includes(lowerSearch);
        });
        if (foundCode) {
            data = BRANCH_DATABASE[foundCode];
            finalCode = foundCode;
        }
      }

      if (data) {
        setResult({ code: finalCode, data });
        addToRecent(finalCode, data.branch);
        onSearchComplete();
      } else {
        setResult(null);
        alert('কোনো তথ্য পাওয়া যায়নি');
      }
      setLoading(false);
    }, 300);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setResult(null);
    inputRef.current?.focus();
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper to highlight matching text
  const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? 
            <span key={i} className="bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100 font-bold rounded-[4px] px-[2px]">{part}</span> : 
            part
        )}
      </span>
    );
  };

  return (
    <>
    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-emerald-50/80 dark:border-gray-700 mb-8 transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] relative group/container">
      {/* Decorative background blob */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-3xl opacity-50 transition-transform duration-700 group-hover/container:scale-110"></div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-8 relative z-10">
        <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50 font-bold text-xl">
              ১
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">দ্রুত অনুসন্ধান</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">ব্রাঞ্চ কোড বা নাম দিয়ে খুঁজুন</p>
            </div>
        </div>
        <button 
            onClick={() => setShowAllModal(true)}
            className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 hover:shadow-md active:scale-95 group"
        >
            <List size={18} className="transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">সকল ব্রাঞ্চ</span>
        </button>
      </div>

      <div className="relative mb-8 z-20" ref={wrapperRef}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="কোড, শাখার নাম বা কর্মকর্তার নাম..."
              className="w-full p-4 pl-14 pr-12 bg-gray-50/50 dark:bg-gray-900/50 border-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 rounded-2xl focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:focus:ring-emerald-500/20 outline-none transition-all duration-300 text-lg font-medium text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
              autoComplete="off"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/70 dark:text-emerald-500/50 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={22} />
            
            {query && (
              <button 
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200"
                title="মুছুন"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
          <button
            onClick={() => executeSearch()}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 md:py-0 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50 transition-all duration-300 hover:shadow-emerald-300/50 dark:hover:shadow-emerald-800/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 disabled:hover:-translate-y-0 flex items-center justify-center min-w-[140px] gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Search size={20} />
                <span>খুঁজুন</span>
              </>
            )}
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {query.length > 0 && !result && (
          <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-emerald-100/50 dark:border-gray-700 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] z-50 max-h-[340px] overflow-y-auto overflow-x-hidden animate-in slide-in-from-top-4 fade-in duration-300 scroll-smooth p-2">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => (
                <div
                  key={item.code}
                  onClick={() => {
                    setQuery(item.code);
                    executeSearch(item.code);
                  }}
                  className={`p-3 mb-1 cursor-pointer rounded-xl flex justify-between items-center transition-all duration-200 ${
                    index === selectedIndex ? 'bg-emerald-50 dark:bg-emerald-900/30 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-4 overflow-hidden w-full">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-base shrink-0 border border-emerald-100/50 dark:border-emerald-800/50 shadow-sm">
                      {toBanglaDigits(item.code)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-base truncate mb-0.5">
                        <HighlightedText text={item.data.branch} highlight={toBanglaDigits(query)} />
                      </p>
                      <div className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1.5 font-medium">
                        <User size={14} className="text-emerald-600/70 dark:text-emerald-500/70 shrink-0" /> 
                        <span className="truncate"><HighlightedText text={item.data.name} highlight={query} /></span>
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ChevronRight size={18} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                <div className="bg-gray-50 dark:bg-gray-800/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <Search size={28} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">কোনো ফলাফল পাওয়া যায়নি</p>
                <p className="text-sm">অনুগ্রহ করে সঠিক কোড বা নাম লিখুন</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Searches */}
      {!result && recentSearches.length > 0 && query.length === 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock size={14} /> সাম্প্রতিক অনুসন্ধান
            </p>
            <div className="flex flex-wrap gap-2.5">
                {recentSearches.map((item) => (
                    <button
                        key={item.code}
                        onClick={() => { setQuery(item.code); executeSearch(item.code); }}
                        className="group bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-4 py-2 rounded-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm hover:shadow flex items-center gap-2 active:scale-95"
                    >
                        <span className="font-bold text-emerald-600/80 dark:text-emerald-500/80 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{toBanglaDigits(item.code)}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-emerald-300 dark:group-hover:bg-emerald-600 transition-colors"></span>
                        <span className="font-medium">{item.name}</span>
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* Search Result Card */}
      {result && (
        <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-gray-700 rounded-3xl p-6 md:p-8 animate-in zoom-in-95 fade-in duration-400 relative overflow-hidden shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-2xl opacity-40 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

          <div className="flex justify-between items-start relative z-10 mb-6">
             <div className="min-w-0 flex-1 pr-4">
                <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-lg font-bold mb-3 shadow-sm">
                  <Building2 size={14} />
                  <span>ব্রাঞ্চ কোড: {toBanglaDigits(result.code)}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight break-words leading-tight">{result.data.branch}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-base flex items-start sm:items-center gap-2 mt-2 font-medium">
                    <User size={18} className="text-emerald-600/70 dark:text-emerald-500/70 shrink-0 mt-0.5 sm:mt-0" /> 
                    <span className="break-words">{result.data.name}</span>
                </p>
             </div>
             <button 
                onClick={() => { setResult(null); setQuery(''); inputRef.current?.focus(); }}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 bg-white dark:bg-gray-800 shadow-sm shrink-0"
                title="বন্ধ করুন"
             >
                <RotateCcw size={20} strokeWidth={2.5} />
             </button>
          </div>
          
          <div className="grid gap-2 sm:gap-3 relative z-10 bg-gray-50/50 dark:bg-gray-900/50 p-3 sm:p-5 rounded-2xl border border-gray-100/80 dark:border-gray-700/80 mb-6">
             {[
               { label: 'মোবাইল', value: result.data.mobile, key: 'mobile', icon: <Phone size={16} /> },
               { label: 'এক্সটেনশন', value: result.data.ext, key: 'ext', icon: <span className="text-[11px] font-bold tracking-wider">EXT</span> },
               { label: 'ইমেইল', value: result.data.email, key: 'email', icon: <Mail size={16} /> },
             ].map((row) => (
               <div key={row.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors group">
                 <div className="flex items-center gap-2 sm:gap-3">
                    <span className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:border-emerald-100 dark:group-hover:border-emerald-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors shrink-0">
                        {row.icon}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.label}</span>
                 </div>
                 <div className="min-w-0 flex justify-end">
                    <span className="text-gray-800 dark:text-gray-200 font-bold text-right break-all text-sm sm:text-base">{row.value}</span>
                 </div>
                 <button 
                   onClick={() => copyToClipboard(row.value, row.key)}
                   className="p-1.5 sm:p-2 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 transition-all duration-200 sm:opacity-0 group-hover:opacity-100 shadow-sm focus:opacity-100 shrink-0"
                   title="কপি করুন"
                 >
                   {copiedField === row.key ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                 </button>
               </div>
             ))}
          </div>

          <div className="relative z-10">
             <button
               onClick={() => onAddToBill(result.code, result.data)}
               className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/50 hover:shadow-emerald-300/50 dark:hover:shadow-emerald-800/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
             >
                <PlusCircle size={22} />
                লিস্টে যোগ করুন
             </button>
          </div>
        </div>
      )}
    </div>

    <AllBranchesModal 
        isOpen={showAllModal} 
        onClose={() => setShowAllModal(false)} 
        onAddToBill={(code, data) => {
            onAddToBill(code, data);
        }}
    />
    </>
  );
};

export default SearchSection;