'use client';

import { useState } from 'react';
import { X, Printer, Share2, FileText, Check, QrCode } from 'lucide-react';
import { SalesInvoice, Tenant } from '@/types/erp';

interface InvoicePrintModalProps {
  invoice: SalesInvoice;
  tenant: Tenant;
  onClose: () => void;
}

export function InvoicePrintModal({ invoice, tenant, onClose }: InvoicePrintModalProps) {
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');
  const [copiedLink, setCopiedLink] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `*Tax Invoice: ${invoice.invoice_number}*\nStore: ${tenant.name}\nCustomer: ${invoice.party_name}\nTotal Amount: ₹${invoice.total_amount.toFixed(2)}\nPayment: ${invoice.payment_mode} (${invoice.payment_status})\n\nThank you for choosing ${tenant.trade_name}!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900">
        {/* Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Invoice #{invoice.invoice_number}</span>
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
                80mm Thermal Slip
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable View Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 flex justify-center">
          {format === 'a4' ? (
            /* A4 Standard GST Tax Invoice */
            <div className="w-full max-w-[210mm] bg-white text-slate-900 p-8 rounded-lg shadow-md border border-slate-200 text-xs font-sans print:shadow-none print:p-0 print:border-none">
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">{tenant.name}</h1>
                  <p className="text-xs font-medium text-slate-700">{tenant.trade_name}</p>
                  <p className="text-[11px] text-slate-600 max-w-sm mt-0.5">{tenant.address}</p>
                  <div className="mt-2 text-[11px] text-slate-700 space-y-0.5">
                    <div><strong>Drug License (D.L. No):</strong> {tenant.drug_license_no}</div>
                    <div><strong>GSTIN:</strong> {tenant.gstin} | <strong>FSSAI:</strong> {tenant.fssai_no || 'N/A'}</div>
                    <div><strong>Phone:</strong> {tenant.phone} | <strong>Email:</strong> {tenant.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white font-bold text-xs uppercase px-2 py-1 rounded mb-2">
                    TAX INVOICE
                  </span>
                  <div className="text-xs font-semibold text-slate-900">Invoice: #{invoice.invoice_number}</div>
                  <div className="text-[11px] text-slate-600">Date: {invoice.invoice_date} {invoice.invoice_time}</div>
                  <div className="text-[11px] text-slate-600">Payment: <strong className="text-emerald-700 font-bold">{invoice.payment_mode}</strong></div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">E-Way Bill: {invoice.e_way_bill_no}</div>
                </div>
              </div>

              {/* Billed To / Patient Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 mb-4 border-b border-slate-200 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="font-bold text-slate-900 uppercase block mb-1">Billed To (Customer):</span>
                  <div className="font-semibold text-slate-800 text-sm">{invoice.party_name}</div>
                  <div className="text-slate-600">Patient: {invoice.patient_name || 'Counter Patient'}</div>
                  <div className="text-slate-600">Doctor: {invoice.doctor_name || 'Self / Direct'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-right">
                  <span className="font-bold text-slate-900 uppercase block mb-1">Tax & Regulatory Memo:</span>
                  <div className="text-slate-600">Supply State: {tenant.state} (Code: {tenant.state_code})</div>
                  <div className="text-slate-600">Reverse Charge (RCM): No</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">IRN: {invoice.irn_number}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse mb-4">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-y border-slate-300 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-2 text-center">#</th>
                    <th className="py-2 px-2">Description of Medicine</th>
                    <th className="py-2 px-2 text-center">Batch</th>
                    <th className="py-2 px-2 text-center">Exp</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Free</th>
                    <th className="py-2 px-2 text-right">MRP</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">Disc%</th>
                    <th className="py-2 px-2 text-right">GST%</th>
                    <th className="py-2 px-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {invoice.items.map((it, idx) => (
                    <tr key={it.id} className="text-slate-800">
                      <td className="py-2 px-2 text-center text-slate-500 font-sans">{idx + 1}</td>
                      <td className="py-2 px-2 font-sans">
                        <strong className="text-slate-900">{it.item_name}</strong>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{it.salt_composition}</div>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-700">{it.batch_number}</td>
                      <td className="py-2 px-2 text-center">{it.expiry_date}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">{it.quantity}</td>
                      <td className="py-2 px-2 text-right text-slate-500">{it.free_quantity || 0}</td>
                      <td className="py-2 px-2 text-right text-slate-500">₹{it.mrp.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right">₹{it.rate.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-slate-500">{it.discount_percent > 0 ? `${it.discount_percent}%` : '-'}</td>
                      <td className="py-2 px-2 text-right text-slate-500">{it.tax_rate}%</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">₹{it.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Calculation & Tax Breakdown */}
              <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-800 pt-4">
                {/* GST Details Box */}
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px]">
                  <span className="font-bold text-slate-800 uppercase block mb-1">GST Tax Breakdown:</span>
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
                  <div className="flex justify-between text-slate-600">
                    <span>Total Discount:</span>
                    <span className="font-mono text-emerald-700">- ₹{invoice.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (CGST + SGST):</span>
                    <span className="font-mono">+ ₹{(invoice.cgst_amount + invoice.sgst_amount).toFixed(2)}</span>
                  </div>
                  {invoice.round_off !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">₹{invoice.round_off.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-1.5">
                    <span>Grand Total:</span>
                    <span className="font-mono text-sky-800">₹{invoice.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1">
                    Amount in words: Rupees {Math.round(invoice.total_amount)} Only
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
                <div>
                  <div className="w-24 h-24 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-[10px] text-slate-400">
                    [ UPI QR Code ]
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">Scan to pay directly</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">{tenant.name}</div>
                  <div className="text-[10px] text-slate-500 mt-8">Authorised Signatory / Pharmacist</div>
                </div>
              </div>
            </div>
          ) : (
            /* 80mm POS Thermal Receipt */
            <div className="w-[80mm] bg-white text-slate-900 p-4 rounded shadow-md border border-slate-200 text-[10px] font-mono leading-tight">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="font-bold text-xs uppercase text-slate-900">{tenant.name}</div>
                <div>{tenant.address.slice(0, 40)}</div>
                <div>DL: {tenant.drug_license_no.split('/')[0]}</div>
                <div>GSTIN: {tenant.gstin}</div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[9px]">
                <div>Inv: #{invoice.invoice_number}</div>
                <div>Date: {invoice.invoice_date} {invoice.invoice_time}</div>
                <div>Cust: {invoice.party_name}</div>
                {invoice.doctor_name && <div>Doc: {invoice.doctor_name}</div>}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold border-b border-slate-300 pb-1 mb-1">
                  <span>ITEM / BATCH / EXP</span>
                  <span>QTY x RATE = AMT</span>
                </div>
                {invoice.items.map((item) => (
                  <div key={item.id} className="mb-1.5">
                    <div className="font-bold text-slate-800">{item.item_name}</div>
                    <div className="text-[8px] text-slate-500">
                      B:{item.batch_number} E:{item.expiry_date}
                    </div>
                    <div className="flex justify-between">
                      <span>{item.quantity} {item.free_quantity ? `(+${item.free_quantity}F)` : ''} x ₹{item.rate}</span>
                      <span className="font-bold">₹{item.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Taxable:</span>
                  <span>₹{invoice.taxable_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Total:</span>
                  <span>₹{(invoice.cgst_amount + invoice.sgst_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>TOTAL PAYABLE:</span>
                  <span>₹{invoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span>Payment Mode:</span>
                  <span>{invoice.payment_mode}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[9px] text-slate-500">
                <div>*** Get Well Soon ***</div>
                <div>Keep Medicines Away From Children</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
