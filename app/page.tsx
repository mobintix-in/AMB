'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Receipt, Boxes, ShoppingBag, AlertTriangle, Users, 
  BarChart3, Database, Sparkles, ArrowRight, ShieldCheck, 
  TrendingUp, Pill, Zap, Clock, Printer, CheckCircle2, Building2 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useERPStore } from '@/lib/store';
import { InvoicePrintModal } from '@/components/InvoicePrintModal';
import { SalesInvoice } from '@/types/erp';

export default function HomePage() {
  const { tenant, invoices, items, batches, parties, currentUser, getStats, resetToDemoData } = useERPStore();
  const stats = getStats();
  const [mounted, setMounted] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const quickLaunch = [
    {
      title: 'High-Speed POS Billing',
      desc: 'Dual input keyboard-first billing, live margin %, substitute finder & dynamic UPI.',
      href: '/billing',
      icon: Receipt,
      hotkey: 'F1',
      color: 'from-emerald-600 to-teal-600',
      badge: 'Lightning Fast',
    },
    {
      title: 'Medicine Master & Batches',
      desc: 'Track items by generic active salt formulation, FEFO expiry & stock levels.',
      href: '/inventory',
      icon: Boxes,
      hotkey: 'F3',
      color: 'from-sky-600 to-blue-600',
      badge: 'Molecule Search',
    },
    {
      title: 'AI Purchase Ingestion (OCR)',
      desc: 'Extract supplier PDF & photo invoices into batches and GRN in 2 seconds.',
      href: '/purchases',
      icon: ShoppingBag,
      hotkey: 'F2',
      color: 'from-purple-600 to-indigo-600',
      badge: 'Document AI',
    },
    {
      title: 'Expiry Radar & Risk Engine',
      desc: 'Predictive alerts for batches expiring in 30/60/90 days to prevent valuation loss.',
      href: '/expiry',
      icon: AlertTriangle,
      hotkey: 'Alert',
      color: 'from-amber-600 to-orange-600',
      badge: `${stats.nearExpiryCount} Near Expiry`,
    },
    {
      title: 'Party & Wholesale Ledgers',
      desc: 'Retail chemist accounts, hospital clients, credit limits & payment histories.',
      href: '/parties',
      icon: Users,
      hotkey: 'F4',
      color: 'from-cyan-600 to-sky-700',
      badge: `${parties.length} Accounts`,
    },
    {
      title: 'GST & Sales Intelligence',
      desc: 'One-click GSTR-1 summaries, profit margin analytics & top SKU trends.',
      href: '/reports',
      icon: BarChart3,
      hotkey: 'F6',
      color: 'from-rose-600 to-pink-600',
      badge: 'GSTR-1 Ready',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none">
      <Navbar onResetData={resetToDemoData} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50 via-white to-slate-50 border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AMB MedERP Suite • Enterprise Pharmacy Edition</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  POS Active
                </span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>AMB</span>
                  <span className="text-sky-600">MedERP</span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Hub
                  </span>
                </h1>
                <div className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span className="font-bold text-slate-900">{tenant.name || 'AMB Pharmaceuticals & Surgicals'}</span>
                  {tenant.trade_name && tenant.trade_name !== tenant.name && (
                    <span className="text-xs font-normal text-slate-500">• {tenant.trade_name}</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Enterprise pharmaceutical management, automated FEFO inventory control, CDSCO Schedule H/H1 regulatory compliance, and high-speed multi-counter billing engine.
              </p>

              {/* Clean Structured Meta Chips (Prevents collision / wrapping overlap) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Branch</span>
                  <span className="font-semibold text-slate-800 text-[11px] truncate block" title={tenant.branch_name}>
                    {tenant.branch_name || 'Central Wholesale'}
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Drug License</span>
                  <span className="font-mono font-semibold text-slate-800 text-[11px] truncate block" title={tenant.drug_license_no}>
                    {tenant.drug_license_no || '20B/21B-MH-492102'}
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">GSTIN</span>
                  <span className="font-mono font-semibold text-slate-800 text-[11px] truncate block" title={tenant.gstin}>
                    {tenant.gstin || 'Unregistered'}
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Operator</span>
                  <span className="font-semibold text-emerald-700 text-[11px] truncate block" title={mounted && currentUser ? `${currentUser.name} (${currentUser.phone})` : 'Guest Operator'}>
                    {mounted && currentUser ? currentUser.name : 'Guest Operator'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 flex-shrink-0">
              <Link
                href="/inventory"
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Boxes className="w-4 h-4 text-sky-600" />
                <span>Medicine Master (F3)</span>
              </Link>

              <Link
                href="/billing"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                <span>Launch Billing POS (F1)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Real-time KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Today&apos;s Revenue</span>
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-700" suppressHydrationWarning>
              ₹{stats.totalRevenueToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500" suppressHydrationWarning>
              {stats.totalInvoicesCount} invoices generated today
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span>Net Profit Realized</span>
            </span>
            <div className="text-2xl font-bold font-mono text-sky-700" suppressHydrationWarning>
              ₹{stats.totalProfitToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Gross margin live calculation
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Near-Expiry At Risk</span>
            </span>
            <div className="text-2xl font-bold font-mono text-amber-700" suppressHydrationWarning>
              {stats.nearExpiryCount} Batches
            </div>
            <span className="text-[11px] text-amber-700 font-medium" suppressHydrationWarning>
              Valuation: ₹{stats.nearExpiryValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Customer Receivables</span>
            </span>
            <div className="text-2xl font-bold font-mono text-purple-700" suppressHydrationWarning>
              ₹{stats.totalReceivables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-500">
              Pending wholesale ledger dues
            </span>
          </div>
        </div>

        {/* Quick Launch Action Tiles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Core Modules & Workflows
            </h2>
            <span className="text-xs text-slate-500">Dual-Input Keyboard & Mouse Ergonomics</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLaunch.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.title}
                  href={tile.href}
                  className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/20 transition-all shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-tr ${tile.color} text-white shadow-xs group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {tile.badge}
                      </span>
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {tile.hotkey}
                      </kbd>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors flex items-center gap-1">
                      <span>{tile.title}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-sky-600" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {tile.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Enterprise Compliance & Operational Security Standards */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-900 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Enterprise Regulatory Compliance & Cloud Security</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit">
              CDSCO & GST Compliant
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>CDSCO & Schedule H/H1</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Mandatory prescriber doctor recording, patient verification, and tamper-proof audit trails for controlled substances.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-sky-600" />
                <span>GST E-Way Bill Ready</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Automated HSN 3004 tax calculation, state code splitting (CGST/SGST/IGST), and direct GSTR-1 sales register generation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>FEFO Expiry Lockout</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                First-Expiry-First-Out automated batch routing prevents dispensing near-expiry stock, protecting pharmacy capital.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Encrypted Cloud Sync</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Multi-counter high-speed billing with local-first offline resilience and instant multi-branch ledger synchronization.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Invoices Log */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Sales Invoices
            </h3>
            <Link href="/reports" className="text-xs text-sky-600 hover:text-sky-700 font-semibold">
              View All Invoices →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-sans font-semibold">
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">GST</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                  <th className="py-2.5 px-3 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100" suppressHydrationWarning>
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-sky-700">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3 text-slate-500">{inv.invoice_date}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{inv.party_name}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">₹{inv.taxable_amount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">₹{(inv.cgst_amount + inv.sgst_amount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{inv.total_amount.toFixed(2)}</td>
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
                        {inv.payment_mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1 rounded text-slate-400 hover:text-sky-600 transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
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
