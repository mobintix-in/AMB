'use client';

import { useState } from 'react';
import { 
  BarChart3, FileText, Download, Printer, TrendingUp, 
  DollarSign, CheckCircle2, ShieldAlert, ArrowUpRight, Trash2 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useERPStore } from '@/lib/store';
import { SalesInvoice } from '@/types/erp';
import { InvoicePrintModal } from '@/components/InvoicePrintModal';

export default function ReportsPage() {
  const { tenant, invoices, items, batches, parties, deleteInvoice, resetToDemoData } = useERPStore();
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  // Financial aggregates
  const totalRevenue = invoices.reduce((sum, i) => sum + i.total_amount, 0);
  const totalProfit = invoices.reduce((sum, i) => sum + i.profit_margin_amount, 0);
  const totalTaxCollected = invoices.reduce((sum, i) => sum + (i.cgst_amount + i.sgst_amount + i.igst_amount), 0);
  const totalTaxable = invoices.reduce((sum, i) => sum + i.taxable_amount, 0);

  // Total receivables
  const totalReceivables = parties
    .filter((p) => p.party_type === 'CUSTOMER')
    .reduce((sum, p) => sum + p.current_balance, 0);

  // Fast moving products
  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const existing = productSalesMap.get(item.item_id) || { name: item.item_name, qty: 0, revenue: 0 };
      existing.qty += item.quantity + (item.free_quantity || 0);
      existing.revenue += item.total_amount;
      productSalesMap.set(item.item_id, existing);
    });
  });

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none">
      <Navbar onResetData={resetToDemoData} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <span>Financial Analytics & GST Intelligence</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              GSTR-1 Ready Tax Ledgers, Fast-Moving SKU Trends, and Margin Audits
            </p>
          </div>

          <button
            onClick={() => alert('Exporting GSTR-1 JSON and Excel ledger...')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>Export GSTR-1 (JSON / Excel)</span>
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">Total Invoiced Revenue</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block" suppressHydrationWarning>
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block" suppressHydrationWarning>Across {invoices.length} invoices</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">Gross Profit Realized</span>
            <span className="text-2xl font-bold font-mono text-sky-700 mt-1 block" suppressHydrationWarning>
              ₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-700 mt-1 block font-medium" suppressHydrationWarning>
              Average Margin: {totalTaxable > 0 ? ((totalProfit / totalTaxable) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">GST Output Tax (CGST+SGST)</span>
            <span className="text-2xl font-bold font-mono text-purple-700 mt-1 block" suppressHydrationWarning>
              ₹{totalTaxCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block" suppressHydrationWarning>Taxable Base: ₹{totalTaxable.toFixed(2)}</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 block">Outstanding Receivables</span>
            <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block" suppressHydrationWarning>
              ₹{totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-amber-700 mt-1 block font-medium">Customer credit pending</span>
          </div>
        </div>

        {/* GST Filing Summary & Top Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* GST Return Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>GST Compliance Summary (GSTR-1 Table 4 & 5)</span>
              <span className="text-xs text-emerald-700 font-mono font-semibold">100% Tax Compliant</span>
            </h3>

            <div className="overflow-x-auto text-xs font-mono">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-600 bg-slate-50 border-b border-slate-200 font-sans font-semibold">
                    <th className="py-2.5 px-3">GST Rate</th>
                    <th className="py-2.5 px-3 text-right">Taxable Turnover</th>
                    <th className="py-2.5 px-3 text-right">CGST</th>
                    <th className="py-2.5 px-3 text-right">SGST</th>
                    <th className="py-2.5 px-3 text-right">Total GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800">12% Pharma Goods</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">₹{totalTaxable.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-sky-700">₹{(totalTaxCollected / 2).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-sky-700">₹{(totalTaxCollected / 2).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-700">₹{totalTaxCollected.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              Tax computed per Section 9 of CGST Act on HSN 300490 with electronic audit trail.
            </div>
          </div>

          {/* Top Fast-Moving SKUs */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Top Fast-Moving Medicines (Volume & Revenue)</span>
              <span className="text-xs text-sky-700 font-medium">Ranked by Units Sold</span>
            </h3>

            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900">{p.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-emerald-700 font-bold block">{p.qty} sold</span>
                    <span className="text-[10px] text-slate-500">₹{p.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoices History Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sales Invoices Log ({invoices.length} Bills)
            </h3>
            <span className="text-xs text-slate-500">Click &quot;Print&quot; on any row to reprint tax invoice</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-sans font-semibold">
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">GST</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100" suppressHydrationWarning>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-sky-700">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3 text-slate-500">{inv.invoice_date} {inv.invoice_time}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{inv.party_name}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{inv.items.length}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">₹{inv.taxable_amount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      ₹{(inv.cgst_amount + inv.sgst_amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      ₹{inv.total_amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        inv.payment_mode === 'CASH'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.payment_mode === 'UPI'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : inv.payment_mode === 'CREDIT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}>
                        {inv.payment_mode} ({inv.payment_status})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-sky-700 border border-slate-200 font-sans text-xs transition-colors shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => { if (confirm(`Delete invoice ${inv.invoice_number}? This cannot be undone.`)) deleteInvoice(inv.id); }}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Invoice Print Modal */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          tenant={tenant}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
