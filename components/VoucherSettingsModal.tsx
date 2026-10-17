import React, { useState } from 'react';
import { X, Sliders, Save, RotateCcw, FileText, UserCheck, Shield } from 'lucide-react';
import { VoucherConfig } from '../types';
import { toBanglaDigits } from '../constants';

interface VoucherSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VoucherConfig;
  onSaveConfig: (newConfig: VoucherConfig) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DEFAULT_VOUCHER_CONFIG: VoucherConfig = {
  subject: 'সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেডের দাবী নিষ্পত্তির ক্ষেত্রে শাখা অফিসারদের যাতায়াত ও আপ্যায়ন বিল পরিশোধের অনুমোদন প্রদান প্রসঙ্গে।',
  refNo: `এসএলআইসিএল/দাঃ বিঃ/নোঃ শীঃ/৩৭২১/${toBanglaDigits(new Date().getFullYear().toString())}ইং`,
  billType: 'যাতায়াত',
  claimType: 'সহযোগী বীমা দাবি',
  month: 'চলতি মাস',
  date: `${toBanglaDigits(String(new Date().getDate()).padStart(2, '0'))}-${toBanglaDigits(String(new Date().getMonth() + 1).padStart(2, '0'))}-${toBanglaDigits(new Date().getFullYear().toString())}ইং`,
  signatory1Name: 'নথি উত্থাপনকারী',
  signatory1Title: 'সিনিয়র অফিসার দাবীবিভাগ',
  signatory2Name: 'মোঃ শাহিদুর রহমান',
  signatory2Title: '(ভাইস প্রেসিডেন্ট), ইনচার্জ, দাবীবিভাগ',
  signatory3Name: 'অভ্যন্তরীণ নিরীক্ষা বিভাগ',
  signatory3Title: 'সোনালী লাইফ ইন্স্যুরেন্স',
  paperFormat: 'notesheet',
  showSignatures: true,
};

const COMMON_SUBJECTS = [
  'দাবী নিষ্পত্তির ক্ষেত্রে শাখা অফিসারদের যাতায়াত ও আপ্যায়ন বিল পরিশোধের অনুমোদন প্রসঙ্গে।',
  'দাবী তদন্ত ও সংশ্লিষ্ট শাখা কর্মকর্তাদের কনভেয়েন্স বিল পরিশোধের অনুমোদন প্রসঙ্গে।',
  'শাখা অফিস পরিদর্শন ও মনিটরিং বাবদ যাতায়াত বিল পরিশোধ প্রসঙ্গে।',
  'অফিস স্টেশনারি ও জরুরি বিল পরিশোধের অনুমোদন প্রসঙ্গে।',
  'শাখা কর্মকর্তাদের মোবাইল ও ইন্টারনেট বিল পরিশোধ প্রসঙ্গে।'
];

const VoucherSettingsModal: React.FC<VoucherSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  addToast,
}) => {
  const [formData, setFormData] = useState<VoucherConfig>(config || DEFAULT_VOUCHER_CONFIG);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    addToast('ভাউচার ও প্রিন্ট সেটিংস সংরক্ষিত হয়েছে', 'success');
    onClose();
  };

  const handleReset = () => {
    setFormData(DEFAULT_VOUCHER_CONFIG);
    addToast('ডিফল্ট সেটিংসে ফিরিয়ে নেওয়া হয়েছে', 'info');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-md shadow-purple-600/30">
              <Sliders size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">ভাউচার ও প্রিন্ট কাস্টমাইজেশন</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">নোট শীটের বিষয়, সূত্র নং ও স্বাক্ষরকারী পরিবর্তন করুন</p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="voucher-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Format Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                প্রিন্ট ও ভাউচার ফরম্যাট
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paperFormat: 'notesheet' })}
                  className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                    formData.paperFormat === 'notesheet'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <FileText className="mt-0.5 text-emerald-600" size={20} />
                  <div>
                    <p className="text-sm font-bold">অফিসিয়াল নোট শীট</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">সোনালী লাইফের হেডার, সূত্র ও ৬ স্তরের স্বাক্ষর সহ</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paperFormat: 'memo' })}
                  className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                    formData.paperFormat === 'memo'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Shield className="mt-0.5 text-emerald-600" size={20} />
                  <div>
                    <p className="text-sm font-bold">ক্যাশ মেমো / ভাউচার স্লিপ</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">সংক্ষিপ্ত ও স্পষ্ট পেমেন্ট সামারি স্লিপ</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Subject Dropdown & Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  নোট শীটের বিষয় (Subject)
                </label>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">সচরাচর ব্যবহৃত বিষয় থেকে বেছে নিন:</span>
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value) setFormData({ ...formData, subject: e.target.value });
                }}
                defaultValue=""
                className="w-full mb-2 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:border-emerald-500 outline-none"
              >
                <option value="" disabled>-- দ্রুত বিষয় সিলেক্ট করুন --</option>
                {COMMON_SUBJECTS.map((sub, i) => (
                  <option key={i} value={sub}>{sub}</option>
                ))}
              </select>
              <textarea
                rows={3}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Metadata Rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  সূত্র নং (Reference Number)
                </label>
                <input
                  type="text"
                  value={formData.refNo}
                  onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  তারিখ (Date string)
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Claim and Bill Types */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  বিলের ধরন (টেবিল কলাম)
                </label>
                <input
                  type="text"
                  value={formData.billType}
                  onChange={(e) => setFormData({ ...formData, billType: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  দাবীর ধরন (টেবিল কলাম)
                </label>
                <input
                  type="text"
                  value={formData.claimType}
                  onChange={(e) => setFormData({ ...formData, claimType: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Signatures Toggle & Customization */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="text-emerald-600" size={18} />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">স্বাক্ষর ব্লক ও পদবী কাস্টমাইজেশন</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showSignatures}
                    onChange={(e) => setFormData({ ...formData, showSignatures: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {formData.showSignatures && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      প্রথম স্বাক্ষরকারী (নথি উত্থাপনকারী)
                    </label>
                    <input
                      type="text"
                      placeholder="নাম"
                      value={formData.signatory1Name}
                      onChange={(e) => setFormData({ ...formData, signatory1Name: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs mb-1.5"
                    />
                    <input
                      type="text"
                      placeholder="পদবী"
                      value={formData.signatory1Title}
                      onChange={(e) => setFormData({ ...formData, signatory1Title: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      দ্বিতীয় স্বাক্ষরকারী (ইনচার্জ)
                    </label>
                    <input
                      type="text"
                      placeholder="নাম"
                      value={formData.signatory2Name}
                      onChange={(e) => setFormData({ ...formData, signatory2Name: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs mb-1.5"
                    />
                    <input
                      type="text"
                      placeholder="পদবী"
                      value={formData.signatory2Title}
                      onChange={(e) => setFormData({ ...formData, signatory2Title: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between transition-colors">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-colors"
          >
            <RotateCcw size={14} />
            ডিফল্ট রিসেট
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 transition-all"
            >
              বাতিল
            </button>
            <button
              type="submit"
              form="voucher-form"
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Save size={15} />
              সংরক্ষণ করুন
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoucherSettingsModal;
