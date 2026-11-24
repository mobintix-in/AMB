'use client';

import { useState } from 'react';
import { X, Printer, Share2, FileText, Check, QrCode, Download } from 'lucide-react';
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

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `*Tax Invoice: ${invoice.invoice_number}*\nStore: ${tenant.name}\nCustomer: ${invoice.party_name}\nTotal Amount: ₹${invoice.total_amount.toFixed(2)}\nPayment: ${invoice.payment_mode} (${invoice.payment_status})\n\nThank you for choosing ${tenant.trade_name || tenant.name}!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const upiId = 'billing@amb-med.in';
  const qrString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(tenant.name)}&am=${invoice.total_amount.toFixed(2)}&cu=INR&tn=${invoice.invoice_number}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Dynamic Print Stylesheet for exact page sizing */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #print-invoice-area, #print-invoice-area * {
            visibility: visible;
          }
          #print-invoice-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: ${format === 'a4' ? '6mm' : '2mm'} !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .print-hidden-element {
            display: none !important;
          }
          @page {
            size: ${format === 'a4' ? 'A4 portrait' : '80mm auto'};
            margin: ${format === 'a4' ? '8mm' : '0mm'};
          }
        }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] text-slate-900 print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Controls Bar (Hidden in Print) */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
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

        {/* Printable View Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100/70 flex justify-center print:bg-white print:p-0">
          {format === 'a4' ? (
            /* =================================================================
               A4 Standard GST Tax Invoice
               ================================================================= */
            <div
              id="print-invoice-area"
              className="w-full max-w-[210mm] bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-xs font-sans print:shadow-none print:p-0 print:border-none print:max-w-none"
            >
              {/* Header: Pharmacy Brand & Invoice Meta */}
              <div className="border-b-2 border-slate-900 pb-3 mb-3 flex flex-wrap justify-between items-start gap-4">
                <div className="space-y-1 max-w-md">
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
                      <span className="font-mono font-bold">{tenant.gstin}</span>
                      {tenant.fssai_no && (
                        <span> | <strong>FSSAI:</strong> <span className="font-mono">{tenant.fssai_no}</span></span>
                      )}
                    </div>
                    <div>
                      <strong>Phone:</strong> {tenant.phone} | <strong>Email:</strong> {tenant.email}
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
                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wide block text-slate-500 mb-1">
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
                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wide block text-slate-500 mb-1">
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

              {/* Items Table with fixed column widths and whitespace-nowrap */}
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
                {/* GST Details Box */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1.5">
                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wide block">
                    GST Tax Breakdown (HSN 300490):
                  </span>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Central Tax (CGST 6%):</span>
                      <span className="font-mono text-slate-800">₹{invoice.cgst_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">State Tax (SGST 6%):</span>
                      <span className="font-mono text-slate-800">₹{invoice.sgst_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                      <span>Total Tax Liability:</span>
                      <span className="font-mono">₹{(invoice.cgst_amount + invoice.sgst_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Final Bill Payable Summary */}
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

              {/* Bottom: Terms, QR Code & Signature */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-end gap-4 text-xs">
                {/* UPI QR Block */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white border border-slate-300 rounded-lg shadow-2xs flex flex-col items-center">
                    <svg className="w-16 h-16 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm-2 2h2v2h-2v-2zm2 2h3v2h-3v-2zm-4-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-2-2h2v2h-2v-2z" />
                    </svg>
                    <span className="text-[8px] font-bold text-sky-700 font-mono mt-0.5">BHIM UPI SCAN</span>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <div className="font-bold text-slate-700">Scan & Pay Directly</div>
                    <div>Accepts GPay, PhonePe, Paytm</div>
                    <div className="font-mono text-[9px] text-slate-400">UPI ID: {upiId}</div>
                  </div>
                </div>

                {/* Terms and conditions */}
                <div className="text-[9px] text-slate-500 max-w-xs space-y-0.5">
                  <div className="font-bold text-slate-700">Terms & Conditions:</div>
                  <div>1. Goods once sold will not be accepted without original tax bill.</div>
                  <div>2. Store medicines in cool, dry place as per package instructions.</div>
                  <div>3. Disputes are subject to local jurisdiction only.</div>
                </div>

                {/* Authorised Pharmacist Signatory */}
                <div className="text-right flex flex-col items-end">
                  <div className="font-bold text-slate-800 text-xs">{tenant.name}</div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-44 mt-1" />
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Authorised Signatory / Registered Pharmacist
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =================================================================
               80mm POS Thermal Receipt
               ================================================================= */
            <div
              id="print-invoice-area"
              className="w-[80mm] max-w-[80mm] bg-white text-slate-900 p-3 sm:p-4 rounded-xl shadow-md border border-slate-200 text-[11px] font-mono leading-tight print:shadow-none print:border-none print:p-1"
            >
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
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
                  GSTIN: <strong>{tenant.gstin}</strong>
                </div>
                <div className="text-[9px] text-slate-500">Ph: {tenant.phone}</div>
              </div>

              {/* Invoice Info */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>BILL #{invoice.invoice_number}</span>
                  <span>{invoice.payment_mode}</span>
                </div>
                <div>Date: {invoice.invoice_date} {invoice.invoice_time}</div>
                <div>Cust: <strong className="text-slate-800">{invoice.party_name}</strong></div>
                {invoice.doctor_name && <div>Doc: {invoice.doctor_name}</div>}
              </div>

              {/* Items List */}
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

              {/* Summary Calculations */}
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
                  <span>GST Total (12%):</span>
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

              {/* Thermal Footer */}
              <div className="text-center pt-2.5 text-[9px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700">*** GET WELL SOON ***</div>
                <div>Keep Medicines Away From Children</div>
                <div className="text-[8px] text-slate-400 font-sans mt-1">Computer Generated POS Invoice</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
