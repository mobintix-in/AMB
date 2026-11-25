'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { SalesInvoice, Tenant } from '@/types/erp';

interface InvoicePrintModalProps {
  invoice: SalesInvoice;
  tenant: Tenant;
  onClose: () => void;
}

// Convert numbers into Indian numbering words (Rupees)
function numberToWords(num: number): string {
  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit ? ' ' + units[unit] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (hundred) parts.push(`${units[hundred]} Hundred`);
    if (rest) parts.push(convertTwoDigits(rest));
    return parts.join(' and ');
  }

  let n = rounded;
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore) parts.push(`${convertTwoDigits(crore)} Crore`);

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh) parts.push(`${convertTwoDigits(lakh)} Lakh`);

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand) parts.push(`${convertTwoDigits(thousand)} Thousand`);

  if (n) parts.push(convertThreeDigits(n));

  return `${parts.join(' ')} Rupees Only`;
}

export function InvoicePrintModal({ invoice, tenant, onClose }: InvoicePrintModalProps) {
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `*Tax Invoice: ${invoice.invoice_number}*\nStore: ${tenant.name}\nCustomer: ${invoice.party_name}\nTotal Amount: ₹${invoice.total_amount.toFixed(2)}\nPayment: ${invoice.payment_mode} (${invoice.payment_status})\n\nThank you for choosing ${tenant.trade_name || tenant.name}!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const cleanStoreSlug = (tenant.name || 'pharmacy').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pharmacy';
  const upiId = tenant.upi_id?.trim()
    ? tenant.upi_id.trim()
    : tenant.phone
      ? `${tenant.phone.replace(/[^0-9]/g, '').slice(-10)}@upi`
      : `${cleanStoreSlug}@upi`;
  const upiPayUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(tenant.name || 'Pharmacy')}&am=${invoice.total_amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoice.invoice_number)}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(upiPayUri, {
      width: 160,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [upiPayUri]);
  const termLines = (tenant.invoice_terms || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const termsToShow = termLines.length > 0
    ? termLines
    : [
        '1. Goods once sold will not be accepted without original tax bill.',
        '2. Store medicines in cool, dry place as per package instructions.',
        '3. Disputes are subject to local jurisdiction only.',
      ];
  const hasBankDetails = Boolean(tenant.bank_name || tenant.bank_account_no || tenant.bank_ifsc);
  const thermalPageHeightMm = Math.max(215, 160 + (invoice.items?.length || 1) * 24);
  const pageStyleCss =
    format === 'a4'
      ? `@page { size: A4 portrait; margin: 0; }`
      : `@page { size: 80mm ${thermalPageHeightMm}mm; margin: 0; }`;

  const renderPrintableContent = (isPrintPortal: boolean) => (
    format === 'a4' ? (
      <div
        id={isPrintPortal ? 'print-invoice-area' : undefined}
        className={
          isPrintPortal
            ? 'w-full bg-white text-slate-900 p-[10mm] text-xs font-sans'
            : 'w-full max-w-[210mm] h-fit bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-xs font-sans'
        }
      >
        {/* Header: Pharmacy Brand & Invoice Meta */}
        <div className="border-b-2 border-slate-900 pb-3 mb-3 flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-start gap-3 max-w-md">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-1 flex-shrink-0"
              />
            )}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                {tenant.name}
              </h1>
              {tenant.trade_name && (
                <p className="text-xs font-semibold text-slate-700">{tenant.trade_name}</p>
              )}
              <p className="text-[11px] text-slate-600 leading-snug">{tenant.address}</p>
              <div className="pt-1 text-[11px] text-slate-700 space-y-0.5">
                <div>
                  <strong className="text-slate-900">Drug License (D.L. No):</strong>{' '}
                  <span className="font-mono">{tenant.drug_license_no}</span>
                </div>
                <div>
                  <strong className="text-slate-900">GSTIN:</strong>{' '}
                  <span className="font-mono font-bold">{tenant.gstin || 'Unregistered'}</span>
                  {tenant.fssai_no && (
                    <span> | <strong>FSSAI:</strong> <span className="font-mono">{tenant.fssai_no}</span></span>
                  )}
                </div>
                <div>
                  <strong>Phone:</strong> {tenant.phone}{tenant.email ? <> | <strong>Email:</strong> {tenant.email}</> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end space-y-1">
            <span className="inline-block bg-slate-900 text-white font-extrabold text-xs uppercase px-2.5 py-1 rounded tracking-wider shadow-2xs">
              TAX INVOICE
            </span>
            <div className="text-xs font-bold font-mono text-slate-900 pt-1">
              Invoice: #{invoice.invoice_number}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              Date: {invoice.invoice_date} {invoice.invoice_time}
            </div>
            <div className="text-[11px] text-slate-700">
              Payment Mode:{' '}
              <strong className="text-emerald-700 font-bold uppercase">{invoice.payment_mode}</strong>
            </div>
            {invoice.e_way_bill_no && (
              <div className="text-[10px] text-slate-500 font-mono">
                E-Way Bill: {invoice.e_way_bill_no}
              </div>
            )}
          </div>
        </div>

        {/* Billed To / Patient Info */}
        <div className="grid grid-cols-2 gap-3 pb-3 mb-3 border-b border-slate-200 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
            <span className="font-bold uppercase text-[10px] tracking-wide block text-slate-500 mb-1">
              BILLED TO (CUSTOMER):
            </span>
            <div className="font-bold text-slate-900 text-sm">{invoice.party_name}</div>
            {invoice.party_gstin && (
              <div className="text-[11px] font-mono text-slate-700">
                GSTIN: <strong>{invoice.party_gstin}</strong>
              </div>
            )}
            <div className="text-slate-600">
              Patient / Memo: <strong className="text-slate-800">{invoice.patient_name || 'General Counter'}</strong>
            </div>
            <div className="text-slate-600">
              Prescribing Doctor: <strong className="text-slate-800">{invoice.doctor_name || 'Direct / OTC'}</strong>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-right space-y-0.5">
            <span className="font-bold uppercase text-[10px] tracking-wide block text-slate-500 mb-1">
              TAX & REGULATORY DETAILS:
            </span>
            <div className="text-slate-700">
              Place of Supply: <strong>{tenant.state} (Code: {tenant.state_code})</strong>
            </div>
            <div className="text-slate-600">Reverse Charge (RCM): <strong>No</strong></div>
            <div className="text-slate-600">Invoice Category: <strong>B2C Retail / Pharma POS</strong></div>
            {invoice.irn_number && (
              <div className="text-[10px] font-mono text-slate-500 truncate pt-1">
                IRN: {invoice.irn_number.slice(0, 36)}...
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-y border-slate-300 font-bold uppercase text-[10px]">
                <th className="py-2 px-1.5 text-center w-6">#</th>
                <th className="py-2 px-2 text-left min-w-[160px]">Description of Medicine</th>
                <th className="py-2 px-2 text-center whitespace-nowrap w-20">Batch</th>
                <th className="py-2 px-2 text-center whitespace-nowrap w-20">Exp</th>
                <th className="py-2 px-2 text-right whitespace-nowrap w-12">Qty</th>
                <th className="py-2 px-2 text-right whitespace-nowrap w-10">Free</th>
                <th className="py-2 px-2 text-right whitespace-nowrap w-16">MRP</th>
                <th className="py-2 px-2 text-right whitespace-nowrap w-16">Rate</th>
                <th className="py-2 px-2 text-right whitespace-nowrap w-12">Disc%</th>
                <th className="py-2 px-2 text-right whitespace-nowrap w-12">GST%</th>
                <th className="py-2 px-2 text-right whitespace-nowrap w-20">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {(invoice.items || []).map((it, idx) => (
                <tr key={it.id || idx} className="text-slate-800">
                  <td className="py-2 px-1.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <div className="font-bold text-slate-900 leading-tight">{it.item_name}</div>
                    {it.salt_composition && (
                      <div className="text-[10px] text-slate-500 font-mono italic mt-0.5">
                        {it.salt_composition}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800 whitespace-nowrap">
                    {it.batch_number}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-medium text-slate-700 whitespace-nowrap">
                    {it.expiry_date}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {it.quantity}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-500 whitespace-nowrap">
                    {it.free_quantity || 0}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                    ₹{it.mrp.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-900 whitespace-nowrap">
                    ₹{it.rate.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-500 whitespace-nowrap">
                    {it.discount_percent > 0 ? `${it.discount_percent}%` : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                    {it.tax_rate}%
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    ₹{it.total_amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Calculation & Tax Breakdown */}
        <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-900 pt-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1.5">
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wide block">
              GST Tax Breakdown (HSN 300490):
            </span>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Central Tax (CGST):</span>
                <span className="font-mono text-slate-800">₹{invoice.cgst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">State Tax (SGST):</span>
                <span className="font-mono text-slate-800">₹{invoice.sgst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                <span>Total Tax Liability:</span>
                <span className="font-mono">₹{(invoice.cgst_amount + invoice.sgst_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-right">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Turnover:</span>
              <span className="font-mono">₹{invoice.taxable_amount.toFixed(2)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Total Discount:</span>
                <span className="font-mono text-emerald-700">- ₹{invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST (CGST + SGST):</span>
              <span className="font-mono">+ ₹{(invoice.cgst_amount + invoice.sgst_amount).toFixed(2)}</span>
            </div>
            {invoice.round_off !== 0 && (
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Round Off:</span>
                <span className="font-mono">
                  {invoice.round_off < 0
                    ? `- ₹${Math.abs(invoice.round_off).toFixed(2)}`
                    : `+ ₹${invoice.round_off.toFixed(2)}`}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base sm:text-lg font-black text-slate-900 border-t-2 border-slate-900 pt-1.5">
              <span>Grand Total:</span>
              <span className="font-mono text-sky-800">₹{invoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-slate-600 pt-0.5 italic">
              Amount in words: <strong>{numberToWords(invoice.total_amount)}</strong>
            </div>
          </div>
        </div>

        {/* Bottom: Terms, QR Code, Bank Details & Signature */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-12 gap-4 items-start text-xs">
          <div className="col-span-5 flex items-start gap-3 min-w-0">
            <div className="p-1.5 bg-white border border-slate-300 rounded-lg shadow-2xs flex flex-col items-center flex-shrink-0">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="UPI Payment QR" className="w-16 h-16 block" />
              ) : (
                <div className="w-16 h-16 bg-slate-100" />
              )}
              <span className="text-[7px] font-bold text-sky-700 font-mono mt-0.5">BHIM UPI SCAN</span>
            </div>
            <div className="text-[10px] text-slate-500 space-y-0.5 min-w-0">
              <div className="font-bold text-slate-800">Scan &amp; Pay Directly</div>
              <div>Accepts GPay, PhonePe, Paytm</div>
              <div className="font-mono text-[9px] text-slate-700 break-all">UPI: {upiId}</div>
              {hasBankDetails && (
                <div className="pt-1.5 text-[9px] text-slate-600 space-y-0.5 border-t border-slate-200 mt-1.5">
                  {tenant.bank_name && <div><strong>Bank:</strong> {tenant.bank_name}</div>}
                  {tenant.bank_account_name && <div><strong>A/c Name:</strong> {tenant.bank_account_name}</div>}
                  {tenant.bank_account_no && <div className="font-mono"><strong>A/c:</strong> {tenant.bank_account_no}</div>}
                  {tenant.bank_ifsc && <div className="font-mono"><strong>IFSC:</strong> {tenant.bank_ifsc}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4 text-[9px] text-slate-500 space-y-0.5 min-w-0">
            <div className="font-bold text-slate-800 text-[10px] mb-1">Terms &amp; Conditions:</div>
            {termsToShow.map((line, i) => (
              <div key={i} className="leading-snug">{line}</div>
            ))}
            {tenant.invoice_notes && (
              <div className="pt-1.5 text-slate-600 italic leading-snug">Note: {tenant.invoice_notes}</div>
            )}
          </div>

          <div className="col-span-3 text-right flex flex-col items-end justify-between self-stretch min-w-0">
            <div className="font-bold text-slate-800 text-xs">For {tenant.name}</div>
            <div className="w-full max-w-[155px] pt-8">
              <div className="border-b border-dashed border-slate-300 w-full" />
              <div className="text-[9px] text-slate-500 mt-1 font-medium leading-tight">
                Authorised Signatory / Pharmacist
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div
        id={isPrintPortal ? 'print-invoice-area' : undefined}
        className={
          isPrintPortal
            ? 'w-[76mm] mx-auto bg-white text-slate-900 p-[3mm] text-[11px] font-mono leading-tight break-inside-avoid'
            : 'w-[80mm] max-w-[80mm] h-fit bg-white text-slate-900 p-3 sm:p-4 rounded-xl shadow-md border border-slate-200 text-[11px] font-mono leading-tight'
        }
      >
        <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
          {tenant.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-10 h-10 object-contain mx-auto mb-1"
            />
          )}
          <div className="font-black text-sm uppercase tracking-tight text-slate-900">
            {tenant.name}
          </div>
          {tenant.trade_name && (
            <div className="text-[10px] font-medium text-slate-700">{tenant.trade_name}</div>
          )}
          <div className="text-[10px] text-slate-600">{tenant.address.slice(0, 42)}</div>
          <div className="text-[10px]">
            DL: <strong>{tenant.drug_license_no.split('/')[0]}</strong>
          </div>
          <div className="text-[10px]">
            GSTIN: <strong>{tenant.gstin || 'Unregistered'}</strong>
          </div>
          <div className="text-[9px] text-slate-500">Ph: {tenant.phone}</div>
        </div>

        <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
          <div className="flex justify-between font-bold">
            <span>BILL #{invoice.invoice_number}</span>
            <span>{invoice.payment_mode}</span>
          </div>
          <div>Date: {invoice.invoice_date} {invoice.invoice_time}</div>
          <div>Cust: <strong className="text-slate-800">{invoice.party_name}</strong></div>
          {invoice.doctor_name && <div>Doc: {invoice.doctor_name}</div>}
        </div>

        <div className="py-2 border-b border-dashed border-slate-400">
          <div className="flex justify-between font-bold text-[9px] border-b border-slate-300 pb-1 mb-1.5 uppercase text-slate-600">
            <span>ITEM / BATCH / EXP</span>
            <span>QTY x RATE = AMT</span>
          </div>
          {(invoice.items || []).map((item, idx) => (
            <div key={item.id || idx} className="mb-2">
              <div className="font-bold text-slate-900">{item.item_name}</div>
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>B:{item.batch_number} Exp:{item.expiry_date}</span>
                <span>MRP ₹{item.mrp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-0.5 font-semibold text-slate-800">
                <span>
                  {item.quantity} {item.free_quantity ? `(+${item.free_quantity}F)` : ''} x ₹{item.rate.toFixed(2)}
                </span>
                <span className="font-bold text-slate-900">₹{item.total_amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
          <div className="flex justify-between text-slate-600">
            <span>Taxable Amount:</span>
            <span>₹{invoice.taxable_amount.toFixed(2)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Discount:</span>
              <span>- ₹{invoice.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>GST Total (CGST+SGST):</span>
            <span>+ ₹{(invoice.cgst_amount + invoice.sgst_amount).toFixed(2)}</span>
          </div>
          {invoice.round_off !== 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Round Off:</span>
              <span>
                {invoice.round_off < 0
                  ? `- ₹${Math.abs(invoice.round_off).toFixed(2)}`
                  : `+ ₹${invoice.round_off.toFixed(2)}`}
              </span>
            </div>
          )}
          <div className="flex justify-between font-black text-sm pt-1 border-t-2 border-slate-900 text-slate-900">
            <span>TOTAL PAYABLE:</span>
            <span>₹{invoice.total_amount.toFixed(2)}</span>
          </div>
          <div className="text-[9px] text-slate-600 italic text-right pt-0.5">
            {numberToWords(invoice.total_amount)}
          </div>
        </div>

        <div className="text-center pt-3 text-[9px] text-slate-500 space-y-1">
          {qrDataUrl && (
            <div className="flex flex-col items-center pb-1">
              <div className="text-[8px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Scan &amp; Pay via UPI
              </div>
              <div className="p-1 bg-white border border-slate-200 rounded">
                <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 block" />
              </div>
            </div>
          )}
          <div className="font-mono text-slate-700 break-all">
            UPI: <strong>{upiId}</strong>
          </div>
          <div className="font-bold text-slate-700 pt-0.5 leading-snug">
            {tenant.invoice_notes ? tenant.invoice_notes : '*** GET WELL SOON ***'}
          </div>
          <div>Keep Medicines Away From Children</div>
          <div className="text-[8px] text-slate-400 font-sans pt-1">Computer Generated POS Invoice</div>
        </div>
      </div>
    )
  );

  return (
    <>
      <style>{pageStyleCss}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 print:hidden">

        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] text-slate-900">
          {/* Controls Bar */}
          <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                #{invoice.invoice_number}
              </span>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setFormat('a4')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    format === 'a4' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 Tax Invoice
                </button>
                <button
                  onClick={() => setFormat('thermal')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    format === 'thermal' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80mm Thermal POS
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleWhatsAppShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Preview Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex justify-center items-start">
            {renderPrintableContent(false)}
          </div>
        </div>
      </div>

      {/* Dedicated Body Portal for Print / Save PDF (eliminates blank Page 1) */}
      {mounted &&
        createPortal(
          <div id="amb-print-root" className="hidden print:block">
            {renderPrintableContent(true)}
          </div>,
          document.body
        )}
    </>
  );
}
