import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, Download, Copy, Check, FileText, Shield, Eye, QrCode, ExternalLink } from 'lucide-react';
import { BillItem, BillStatus, VoucherConfig } from '../types';
import { toBanglaDigits } from '../constants';
import { generateQrDataUrl, generateQrPayload, BILL_STATUS_MAP } from '../utils/qrTracker';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  billItems: BillItem[];
  totalAmount: number;
  note?: string;
  config: VoucherConfig;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  billItems,
  totalAmount,
  note: _note,
  config,
  addToast,
}) => {
  const [activeTab, setActiveTab] = useState<'notesheet' | 'memo'>(config.paperFormat || 'notesheet');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(config.showQrCode !== false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const trackingId = useMemo(() => {
    return config.trackingId || `SLI-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  }, [config.trackingId]);

  const billStatus: BillStatus = config.status || 'approved';
  const statusMeta = BILL_STATUS_MAP[billStatus] || BILL_STATUS_MAP.approved;

  const monthNamesBn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const d = new Date();
  const currentMonthBn = monthNamesBn[d.getMonth()];
  const dateStr = config.date || `${toBanglaDigits(String(d.getDate()).padStart(2, '0'))}-${toBanglaDigits(String(d.getMonth() + 1).padStart(2, '0'))}-${toBanglaDigits(d.getFullYear().toString())}ইং`;

  // Generate QR Code Data URL
  useEffect(() => {
    if (!isOpen) return;

    const payload = generateQrPayload(
      trackingId,
      totalAmount,
      billItems.length,
      config.subject || 'শাখা বিল',
      config.refNo || 'SLICL/HO/EXP/',
      dateStr,
      billStatus
    );

    generateQrDataUrl(payload, 300).then(url => {
      setQrDataUrl(url);
    });
  }, [isOpen, trackingId, totalAmount, billItems.length, config.subject, config.refNo, dateStr, billStatus]);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://sonalilife.com';
  const trackUrl = `${origin}/?track=${encodeURIComponent(trackingId)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRows = billItems.map((item, idx) => `
        <tr>
            <td style="text-align:center">${toBanglaDigits(idx + 1)}</td>
            <td style="text-align:center">${item.branch}</td>
            <td style="text-align:center">${toBanglaDigits(item.serial) || '-'}</td>
            <td style="text-align:center">${config.billType || 'যাতায়াত'}</td>
            <td style="text-align:center">${currentMonthBn}</td>
            <td style="text-align:center">${config.claimType || 'সহযোগী বীমা দাবি'}</td>
            <td style="text-align:center">${item.name}</td>
            <td style="text-align:center">${item.amount ? toBanglaDigits(item.amount) : '০'}</td>
        </tr>
    `).join('');

    const memoRows = billItems.map((item, idx) => `
        <tr>
            <td style="text-align:center; padding: 6px;">${toBanglaDigits(idx + 1)}</td>
            <td style="padding: 6px;"><strong>${item.branch}</strong> (${toBanglaDigits(item.code)})<br/><small>${item.name}</small></td>
            <td style="text-align:center; padding: 6px;">${toBanglaDigits(item.serial) || '-'}</td>
            <td style="text-align:right; font-weight: bold; padding: 6px;">${item.amount ? toBanglaDigits(item.amount) : '০'}/-</td>
        </tr>
    `).join('');

    const qrBlockHtml = showQrCode && qrDataUrl ? `
        <div class="qr-verify-box">
            <img src="${qrDataUrl}" alt="Verification QR" class="qr-img" />
            <div class="qr-info">
                <span class="qr-tag">ডিজিটাল ভেরিফিকেশন</span>
                <span class="qr-id">আইডি: ${trackingId}</span>
                <span class="qr-status">স্ট্যাটাস: ${statusMeta.label.split(' ')[0]}</span>
                <span class="qr-sub">স্ক্যান করে বিস্তারিত যাচাই করুন</span>
            </div>
        </div>
    ` : '';

    const htmlContent = activeTab === 'notesheet' ? `
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <title>সোনালী লাইফ - অফিশিয়াল নোট শীট [${trackingId}]</title>
            <style>
                @font-face {
                    font-family: 'SutonnyMJ';
                    src: local('SutonnyMJ'),
                         local('SutonnyOMJ'),
                         local('Sutonny OMJ'),
                         url('${origin}/fonts/SutonnyOMJ.ttf') format('truetype');
                    unicode-range: U+0980-09FF, U+200C-200D, U+25CC;
                }
                @font-face {
                    font-family: 'SutonnyOMJ';
                    src: local('Sutonny OMJ'),
                         local('SutonnyOMJ'),
                         local('SutonnyMJ'),
                         url('${origin}/fonts/SutonnyOMJ.ttf') format('truetype');
                    unicode-range: U+0980-09FF, U+200C-200D, U+25CC;
                }
                body, html { 
                    font-family: 'SutonnyMJ', 'SutonnyOMJ', 'Inter', Arial, sans-serif; 
                    padding: 25px 45px; 
                    color: #000; 
                    font-size: 13.5px;
                    line-height: 1.5;
                }
                .logo-text-en, .en-font, .qr-info {
                    font-family: 'Inter', Arial, sans-serif !important;
                }
                .header-container {
                    text-align: center;
                    border-bottom: 2px solid #c48c36;
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                }
                .logo-text-bn {
                    color: #c48c36; 
                    font-size: 32px; 
                    font-weight: bold; 
                    margin: 0;
                    line-height: 1.1;
                }
                .logo-text-en {
                    color: #7ab83e; 
                    font-size: 17px; 
                    margin: 0; 
                    font-family: 'Arial', sans-serif;
                    letter-spacing: 0.5px;
                }
                .sub-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12.5px;
                    color: #444;
                    margin-top: 4px;
                }
                .meta-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 8px;
                    font-size: 13px;
                    font-weight: 500;
                }
                .note-sheet-title {
                    text-align: center;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 10px 0;
                }
                .subject {
                    font-weight: bold;
                    margin-bottom: 8px;
                    text-decoration: underline;
                }
                .paragraph {
                    text-align: justify;
                    margin-bottom: 12px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 8px; 
                    font-size: 12px; 
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 5px 6px; 
                }
                th { 
                    text-align: center; 
                    background: #f8f9fa;
                    font-weight: bold;
                }
                .total-row { 
                    font-weight: bold; 
                }
                .conclusion {
                    margin-top: 12px;
                    text-align: justify;
                }
                .signatures {
                    margin-top: 40px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    row-gap: 50px;
                    text-align: center;
                    font-size: 12px;
                }
                .sig-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .sig-line {
                    border-top: 1px solid #000;
                    width: 80%;
                    margin-bottom: 4px;
                }
                .qr-verify-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 8px;
                    border: 1px dashed #7ab83e;
                    border-radius: 6px;
                    background: #fdfefe;
                }
                .qr-img {
                    width: 50px;
                    height: 50px;
                }
                .qr-info {
                    display: flex;
                    flex-direction: column;
                    font-size: 9.5px;
                    font-family: sans-serif;
                    line-height: 1.25;
                }
                .qr-tag {
                    color: #047857;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .qr-id {
                    font-weight: bold;
                    color: #1e293b;
                }
                .qr-status {
                    color: #475569;
                }
                .qr-sub {
                    color: #64748b;
                    font-size: 8.5px;
                }
                @media print {
                    body { padding: 0; }
                    @page { margin: 12mm; }
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <img src="${origin}/header-logo.png" onerror="this.style.display='none'; document.getElementById('css-header').style.display='block';" style="width: 100%; max-width: 650px; margin: 0 auto; display: block;" alt="Sonali Life Insurance" />
                <div id="css-header" style="display: none;">
                    <h1 class="logo-text-bn">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h1>
                    <h2 class="logo-text-en">SONALI LIFE INSURANCE COMPANY LIMITED</h2>
                    <div class="sub-header">
                        <span><strong>SLI</strong> ইসলামী শরিয়াহ্ মোতাবেক পরিচালিত জীবন বীমা কোম্পানী</span>
                        <span>সরকারী নিবন্ধন নম্বরঃ লাইফ ০২/২০১৩</span>
                    </div>
                </div>
            </div>
            
            <div class="meta-row">
                <div>
                    <div><strong>সূত্র নংঃ</strong> ${config.refNo}</div>
                    <div><strong>তারিখঃ</strong> ${dateStr}</div>
                </div>
                ${qrBlockHtml}
            </div>

            <div class="note-sheet-title"><u>নোট শীট</u></div>

            <div class="subject">
                বিষয়ঃ ${config.subject}
            </div>

            <div class="paragraph">
                সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড এর দাবী নিষ্পত্তির ক্ষেত্রে শাখা অফিসের কর্মকর্তাগণ দাবী তদন্ত করে থাকেন। সেই আলোকে শাখা অফিসারদের যাতায়াত ও আপ্যায়ন বিল নিম্নোক্ত ছক অনুযায়ী সর্বমোট = ${toBanglaDigits(totalAmount)}/- টাকা অনুমোদনের প্রয়োজনীয়তা পরিলক্ষিত হয়।
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">ক্রঃনং</th>
                        <th style="width: 16%">অফিসের নাম</th>
                        <th style="width: 10%">ক্রমিক নং</th>
                        <th style="width: 11%">বিলের ধরন</th>
                        <th style="width: 10%">মাসের নাম</th>
                        <th style="width: 14%">দাবীর ধরন</th>
                        <th style="width: 22%">অফিসারের নাম</th>
                        <th style="width: 12%">টাকা</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                    <tr class="total-row">
                        <td colspan="7" style="text-align:right; padding-right: 10px;">মোট বিল=</td>
                        <td style="text-align:center;">${toBanglaDigits(totalAmount)}/-</td>
                    </tr>
                </tbody>
            </table>

            <div class="conclusion">
                এমতাবস্থায় উপরোক্ত ছক অনুযায়ী শাখা অফিসের অফিসারদের বীমাদাবী তদন্তের যাতায়াত বিল বাবদ সর্বমোট = ${toBanglaDigits(totalAmount)}/- টাকা অনুমোদনের বিষয়ে কর্তৃপক্ষের সিদ্ধান্তের লক্ষ্যে নথি পেশ করা হলো।
            </div>

            ${config.showSignatures ? `
            <div class="signatures">
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>${config.signatory1Name}</strong>
                    <span>${config.signatory1Title}</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>${config.signatory2Name}</strong>
                    <span>${config.signatory2Title}</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <strong>${config.signatory3Name}</strong>
                    <span>${config.signatory3Title}</span>
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
                </div>
            </div>
            ` : ''}

            <script>window.print();</script>
        </body>
        </html>
    ` : `
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <title>সোনালী লাইফ - ক্যাশ ভাউচার [${trackingId}]</title>
            <style>
                @font-face {
                    font-family: 'SutonnyMJ';
                    src: local('SutonnyMJ'),
                         local('SutonnyOMJ'),
                         local('Sutonny OMJ'),
                         url('${origin}/fonts/SutonnyOMJ.ttf') format('truetype');
                    unicode-range: U+0980-09FF, U+200C-200D, U+25CC;
                }
                @font-face {
                    font-family: 'SutonnyOMJ';
                    src: local('Sutonny OMJ'),
                         local('SutonnyOMJ'),
                         local('SutonnyMJ'),
                         url('${origin}/fonts/SutonnyOMJ.ttf') format('truetype');
                    unicode-range: U+0980-09FF, U+200C-200D, U+25CC;
                }
                body, html { 
                    font-family: 'SutonnyMJ', 'SutonnyOMJ', 'Inter', Arial, sans-serif; 
                    padding: 20px; 
                    color: #000; 
                    font-size: 13px;
                    max-width: 600px;
                    margin: 0 auto;
                }
                .badge, .en-font, .font-mono {
                    font-family: 'Inter', Arial, sans-serif !important;
                }
                .voucher-card {
                    border: 2px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    position: relative;
                }
                .v-header {
                    text-align: center;
                    border-bottom: 2px dashed #666;
                    padding-bottom: 10px;
                    margin-bottom: 12px;
                }
                .v-title {
                    font-size: 20px;
                    font-weight: bold;
                    color: #c48c36;
                    margin: 0;
                }
                .v-subtitle {
                    font-size: 12px;
                    color: #555;
                }
                .badge {
                    display: inline-block;
                    background: #eee;
                    border: 1px solid #ccc;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                    margin-top: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                th, td {
                    border: 1px solid #444;
                    padding: 5px;
                }
                th { background: #f0f0f0; }
                .v-footer {
                    margin-top: 40px;
                    display: flex;
                    justify-content: space-between;
                    text-align: center;
                }
                .v-line {
                    border-top: 1px solid #000;
                    width: 120px;
                    margin-bottom: 3px;
                }
                .qr-voucher-box {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-top: 15px;
                    padding: 8px;
                    border: 1px dashed #047857;
                    border-radius: 6px;
                    background: #f9fdfa;
                }
                .qr-voucher-img {
                    width: 55px;
                    height: 55px;
                }
            </style>
        </head>
        <body>
            <div class="voucher-card">
                <div class="v-header">
                    <h2 class="v-title">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h2>
                    <div style="font-size: 11px; font-weight: bold; color: #7ab83e; font-family: Arial, sans-serif; letter-spacing: 0.5px; margin-top: 2px;">SONALI LIFE INSURANCE COMPANY LIMITED</div>
                    <div class="v-subtitle" style="font-weight: bold; margin-top: 3px;">CASH VOUCHER / ক্যাশ ভাউচার ও পেমেন্ট স্লিপ</div>
                    <div class="badge" style="font-family: Arial, sans-serif;">ID: ${trackingId} | DATE: ${dateStr}</div>
                </div>

                <div style="font-size: 12px; margin-bottom: 8px;">
                    <strong>বিষয়/বিবরণ:</strong> ${config.subject}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 8%">#</th>
                            <th>শাখা ও কর্মকর্তা</th>
                            <th style="width: 20%">সিরিয়াল</th>
                            <th style="width: 25%; text-align: right;">টাকা</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${memoRows}
                        <tr style="font-weight: bold; background: #fafafa;">
                            <td colspan="3" style="text-align: right; padding: 8px;">সর্বমোট পরিশোধযোগ্য=</td>
                            <td style="text-align: right; padding: 8px; font-size: 15px; color: #15803d;">${toBanglaDigits(totalAmount)}/-</td>
                        </tr>
                    </tbody>
                </table>

                ${showQrCode && qrDataUrl ? `
                <div class="qr-voucher-box">
                    <img src="${qrDataUrl}" alt="QR" class="qr-voucher-img" />
                    <div style="font-size: 10px; text-align: left; font-family: sans-serif;">
                        <strong style="color: #047857;">সোনালী লাইফ ডিজিটাল ভেরিফিকেশন</strong><br/>
                        ট্র্যাকিং আইডি: ${trackingId} | স্ট্যাটাস: ${statusMeta.label.split(' ')[0]}<br/>
                        <span style="color: #64748b;">অনলাইনে স্ক্যান করে ভাউচারের বিবরণ ট্র্যাক করুন</span>
                    </div>
                </div>
                ` : ''}

                <div class="v-footer">
                    <div>
                        <div class="v-line"></div>
                        <span>প্রস্তুতকারী</span>
                    </div>
                    <div>
                        <div class="v-line"></div>
                        <span>যাচাইকারী</span>
                    </div>
                    <div>
                        <div class="v-line"></div>
                        <span>অনুমোদনকারী</span>
                    </div>
                </div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCopyText = () => {
    let text = `*সোনালী লাইফ ইন্স্যুরেন্স - বিল বিবরণী*\n`;
    text += `ট্র্যাকিং আইডি: ${trackingId}\n`;
    text += `স্ট্যাটাস: ${statusMeta.label}\n`;
    text += `তারিখ: ${dateStr}\n`;
    text += `বিষয়: ${config.subject}\n`;
    text += `অনলাইন ভেরিফিকেশন: ${trackUrl}\n`;
    text += `------------------------------------\n`;
    billItems.forEach((item, i) => {
      text += `${toBanglaDigits(i + 1)}. ${item.branch} (কোড: ${toBanglaDigits(item.code)}) - ${item.name} | সিরিয়াল: ${toBanglaDigits(item.serial) || '-'} | টাকা: ${toBanglaDigits(item.amount || '০')}/-\n`;
    });
    text += `------------------------------------\n`;
    text += `*সর্বমোট বিল:* ${toBanglaDigits(totalAmount)}/- টাকা (${toBanglaDigits(billItems.length)} টি ব্রাঞ্চ)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('ক্লিপবোর্ডে কপি হয়েছে (WhatsApp/মেসেজে পাঠানোর জন্য প্রস্তুত)', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyTrackLink = () => {
    navigator.clipboard.writeText(trackUrl);
    setCopiedLink(true);
    addToast('বিলের অনলাইন ট্র্যাকিং লিংক কপি হয়েছে', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(15);
    doc.text('Sonali Life Insurance Company Limited', 14, 18);
    
    doc.setFontSize(9);
    doc.text(`Tracking ID: ${trackingId}`, 14, 25);
    doc.text(`Status: ${statusMeta.label}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 14, 35);
    doc.text(`Ref: ${config.refNo}`, 14, 40);

    // Embed QR Code on the top right
    if (showQrCode && qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, 'PNG', 162, 12, 34, 34);
        doc.setFontSize(7);
        doc.text('Scan to Verify Online', 163, 49);
      } catch (err) {
        console.error('Failed to embed QR in PDF:', err);
      }
    }

    const tableColumn = ["#", "Code", "Branch", "Officer Name", "Serial", "Amount (Tk)"];
    const tableRows = billItems.map((item, idx) => [
      idx + 1,
      item.code,
      item.branch,
      item.name,
      item.serial || '-',
      item.amount || '0'
    ]);

    tableRows.push(['', '', '', '', 'Total:', totalAmount.toString()]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 53,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [5, 150, 105] },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data: any) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [236, 253, 245];
        }
      }
    });

    doc.save(`sonali_bill_${trackingId}.pdf`);
    addToast('PDF ফাইল সফলভাবে ডাউনলোড হয়েছে (QR কোড সহ)', 'success');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-gray-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/30">
              <Eye size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  প্রিন্ট প্রিভিউ ও কিউআর কোড
                </h2>
                <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                  {trackingId}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                প্রিন্ট ও ডাউনলোডের জন্য ডিজিটাল কিউআর কোড সহ লাইভ লেআউট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Format Toggle Tabs */}
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('notesheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'notesheet'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <FileText size={14} />
                <span className="hidden sm:inline">নোট শীট</span>
              </button>
              <button
                onClick={() => setActiveTab('memo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'memo'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Shield size={14} />
                <span className="hidden sm:inline">ভাউচার স্লিপ</span>
              </button>
            </div>

            {/* QR Code Toggle Switch */}
            <button
              onClick={() => setShowQrCode(!showQrCode)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                showQrCode 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'
              }`}
              title="কিউআর কোড প্রদর্শন বা লুকান"
            >
              <QrCode size={16} />
              <span className="hidden md:inline">{showQrCode ? 'QR চালু' : 'QR বন্ধ'}</span>
            </button>

            <button 
              onClick={onClose} 
              className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Live Interactive Preview Box */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 dark:bg-gray-950 flex justify-center">
          <div className="bg-white text-black p-6 sm:p-10 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-200 min-h-[500px] text-xs sm:text-sm font-sans relative">
            
            {activeTab === 'notesheet' ? (
              <div>
                {/* Sonali Life Official Header */}
                <div className="text-center pb-3 mb-4 border-b-2 border-[#c48c36]">
                  <h1 className="text-2xl font-bold text-[#c48c36] leading-tight">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h1>
                  <h2 className="text-xs tracking-wider text-[#7ab83e] font-sans font-bold">SONALI LIFE INSURANCE COMPANY LIMITED</h2>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-sans">
                    <span><strong className="text-[#c48c36]">SLI</strong> ইসলামী শরিয়াহ্ মোতাবেক পরিচালিত জীবন বীমা</span>
                    <span className="text-[#c48c36]">সরকারী নিবন্ধন নম্বরঃ লাইফ ০২/২০১৩</span>
                  </div>
                </div>

                {/* Meta Row with QR Badge */}
                <div className="flex items-center justify-between text-xs mb-3 font-mono">
                  <div>
                    <div><strong>সূত্র নংঃ</strong> {config.refNo}</div>
                    <div><strong>তারিখঃ</strong> {dateStr}</div>
                  </div>

                  {showQrCode && qrDataUrl && (
                    <div className="flex items-center gap-2 p-1.5 border border-dashed border-emerald-500 rounded-xl bg-emerald-50/50">
                      <img src={qrDataUrl} alt="QR Code" className="w-11 h-11 rounded" />
                      <div className="text-[9px] font-sans text-left leading-tight">
                        <span className="font-bold text-emerald-800 block">স্মার্ট ভেরিফিকেশন</span>
                        <span className="text-gray-700 block font-mono font-bold">{trackingId}</span>
                        <span className="text-emerald-700 font-bold block">{statusMeta.label.split(' ')[0]}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center font-bold text-base my-3">
                  <u>নোট শীট</u>
                </div>

                <div className="font-bold underline mb-2 leading-snug">
                  বিষয়ঃ {config.subject}
                </div>

                <p className="text-justify leading-relaxed mb-4">
                  সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড এর দাবী নিষ্পত্তির ক্ষেত্রে শাখা অফিসারদের যাতায়াত ও আপ্যায়ন বিল নিম্নোক্ত ছক অনুযায়ী সর্বমোট = <strong>{toBanglaDigits(totalAmount)}/-</strong> টাকা অনুমোদনের প্রয়োজনীয়তা পরিলক্ষিত হয়।
                </p>

                {/* Table Preview */}
                <table className="w-full border-collapse border border-black text-[11px] mb-4">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-black p-1 text-center">ক্রঃ</th>
                      <th className="border border-black p-1">অফিস</th>
                      <th className="border border-black p-1 text-center">ক্রমিক</th>
                      <th className="border border-black p-1 text-center">ধরন</th>
                      <th className="border border-black p-1">কর্মকর্তা</th>
                      <th className="border border-black p-1 text-right">টাকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, i) => (
                      <tr key={i}>
                        <td className="border border-black p-1 text-center">{toBanglaDigits(i + 1)}</td>
                        <td className="border border-black p-1 font-sans">{item.branch}</td>
                        <td className="border border-black p-1 text-center">{toBanglaDigits(item.serial) || '-'}</td>
                        <td className="border border-black p-1 text-center">{config.billType}</td>
                        <td className="border border-black p-1">{item.name}</td>
                        <td className="border border-black p-1 text-right font-bold">{toBanglaDigits(item.amount || '০')}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-50">
                      <td colSpan={5} className="border border-black p-1.5 text-right">মোট বিল=</td>
                      <td className="border border-black p-1.5 text-right text-emerald-800">{toBanglaDigits(totalAmount)}/-</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signatures Preview */}
                {config.showSignatures && (
                  <div className="grid grid-cols-3 gap-6 text-center text-[10px] mt-10 pt-4">
                    <div>
                      <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
                      <strong>{config.signatory1Name}</strong>
                      <div className="text-gray-600">{config.signatory1Title}</div>
                    </div>
                    <div>
                      <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
                      <strong>{config.signatory2Name}</strong>
                      <div className="text-gray-600">{config.signatory2Title}</div>
                    </div>
                    <div>
                      <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
                      <strong>{config.signatory3Name}</strong>
                      <div className="text-gray-600">{config.signatory3Title}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-400 p-6 rounded-xl">
                <div className="text-center border-b border-gray-300 pb-3 mb-3">
                  <h2 className="text-xl font-bold text-[#c48c36]">সোনালী লাইফ ইন্স্যুরেন্স কোম্পানী লিমিটেড</h2>
                  <p className="text-xs text-[#7ab83e] font-sans font-bold tracking-wider">SONALI LIFE INSURANCE COMPANY LIMITED</p>
                  <p className="text-xs text-gray-700 font-sans font-semibold mt-0.5">CASH VOUCHER / ক্যাশ ভাউচার ও পেমেন্ট স্লিপ</p>
                  <span className="inline-block bg-gray-100 px-3 py-1 rounded text-[11px] font-mono mt-1 font-bold">
                    ID: {trackingId} | তারিখঃ {dateStr}
                  </span>
                </div>

                <div className="text-xs mb-3">
                  <strong>বিষয়:</strong> {config.subject}
                </div>

                <table className="w-full border-collapse border border-gray-300 text-xs mb-4">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-1 text-center w-8">#</th>
                      <th className="border border-gray-300 p-1 text-left"> শাখা ও অফিসার</th>
                      <th className="border border-gray-300 p-1 text-center w-20">সিরিয়াল</th>
                      <th className="border border-gray-300 p-1 text-right w-24">টাকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 p-1 text-center">{toBanglaDigits(i + 1)}</td>
                        <td className="border border-gray-300 p-1">
                          <strong>{item.branch}</strong> ({toBanglaDigits(item.code)})<br />
                          <span className="text-gray-600 text-[11px]">{item.name}</span>
                        </td>
                        <td className="border border-gray-300 p-1 text-center">{toBanglaDigits(item.serial) || '-'}</td>
                        <td className="border border-gray-300 p-1 text-right font-bold">{toBanglaDigits(item.amount || '০')}/-</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-50 font-bold">
                      <td colSpan={3} className="border border-gray-300 p-2 text-right">সর্বমোট টাকা:</td>
                      <td className="border border-gray-300 p-2 text-right text-emerald-800 text-sm">{toBanglaDigits(totalAmount)}/-</td>
                    </tr>
                  </tbody>
                </table>

                {/* Voucher QR Verification Stamp */}
                {showQrCode && qrDataUrl && (
                  <div className="flex items-center justify-center gap-3 my-4 p-2 bg-emerald-50/60 rounded-xl border border-dashed border-emerald-500">
                    <img src={qrDataUrl} alt="QR Stamp" className="w-12 h-12 rounded" />
                    <div className="text-[10px] font-sans text-left leading-tight">
                      <strong className="text-emerald-900 block">সোনালী লাইফ ডিজিটাল ভেরিফিকেশন</strong>
                      <span className="font-mono text-gray-700 font-bold block">{trackingId}</span>
                      <span className="text-emerald-700 font-bold block">স্ট্যাটাস: {statusMeta.label.split(' ')[0]}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-[11px] text-center mt-10 pt-4">
                  <div>
                    <div className="border-t border-black w-24 mb-1"></div>
                    <span>প্রস্তুতকারী</span>
                  </div>
                  <div>
                    <div className="border-t border-black w-24 mb-1"></div>
                    <span>যাচাইকারী</span>
                  </div>
                  <div>
                    <div className="border-t border-black w-24 mb-1"></div>
                    <span>অনুমোদনকারী</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-wrap items-center justify-between gap-3 transition-colors">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'কপি হয়েছে' : 'টেক্সট কপি'}</span>
            </button>

            <button
              onClick={handleCopyTrackLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              {copiedLink ? <Check size={15} /> : <ExternalLink size={15} />}
              <span>{copiedLink ? 'লিংক কপি হয়েছে' : 'ট্র্যাকিং লিংক'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              <Download size={15} />
              <span>PDF ডাউনলোড</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              বন্ধ করুন
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Printer size={18} />
              <span>প্রিন্ট করুন (QR সহ)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintPreviewModal;
