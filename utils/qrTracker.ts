import QRCode from 'qrcode';
import { BillStatus } from '../types';
import { toBanglaDigits } from '../constants';

export interface StatusMeta {
  key: BillStatus;
  label: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  description: string;
  step: number;
}

export const BILL_STATUS_MAP: Record<BillStatus, StatusMeta> = {
  draft: {
    key: 'draft',
    label: 'খসড়া (Draft)',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    bgLight: 'bg-amber-500',
    textColor: 'text-amber-600',
    description: 'বিলটি সিস্টেমে প্রস্তুত করা হয়েছে, এখনো পাঠানো হয়নি।',
    step: 1,
  },
  dispatched: {
    key: 'dispatched',
    label: 'প্রেরিত (Dispatched)',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    bgLight: 'bg-blue-500',
    textColor: 'text-blue-600',
    description: 'সংশ্লিষ্ট দপ্তর বা শাখায় বিলের কপি প্রেরণ করা হয়েছে।',
    step: 2,
  },
  approved: {
    key: 'approved',
    label: 'অনুমোদিত (Approved)',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    bgLight: 'bg-purple-500',
    textColor: 'text-purple-600',
    description: 'কর্তৃপক্ষ কর্তৃক বিল যাচাইপূর্বক চূড়ান্ত অনুমোদন পেয়েছে।',
    step: 3,
  },
  paid: {
    key: 'paid',
    label: 'পরিশোধিত (Paid)',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    bgLight: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    description: 'শাখা বিলের সমপরিমাণ অর্থ সম্পূর্ণ পরিশোধ ও নিষ্পত্তি হয়েছে।',
    step: 4,
  },
};

/**
 * Generate a unique verification tracking ID
 */
export const generateTrackingId = (prefix = 'SLI'): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${randomNum}`;
};

/**
 * Generate QR code payload text that includes direct tracking URL and verifiable details
 */
export const generateQrPayload = (
  trackingId: string,
  totalAmount: number,
  itemCount: number,
  subject: string,
  refNo: string,
  date: string,
  status: BillStatus = 'approved'
): string => {
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://sonalilife.com';
  const trackUrl = `${origin}/?track=${encodeURIComponent(trackingId)}`;

  return [
    `=== সোনালী লাইফ স্মার্ট বিল ভেরিফিকেশন ===`,
    `ট্র্যাকিং আইডি: ${trackingId}`,
    `স্ট্যাটাস: ${BILL_STATUS_MAP[status]?.label || status}`,
    `তারিখ: ${date}`,
    `মোট বিল: ৳${toBanglaDigits(totalAmount)}/- (${toBanglaDigits(itemCount)} টি ব্রাঞ্চ)`,
    `বিষয়: ${subject}`,
    `সূত্র: ${refNo}`,
    `যাচাইকরণ লিংক: ${trackUrl}`
  ].join('\n');
};

/**
 * Convert string payload to high-res QR code Data URL (PNG)
 */
export const generateQrDataUrl = async (
  payload: string,
  size = 280
): Promise<string> => {
  try {
    return await QRCode.toDataURL(payload, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
};
