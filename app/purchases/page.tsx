'use client';

import { useState } from 'react';
import { 
  ShoppingBag, Plus, Sparkles, Trash2, CheckCircle2, 
  FileText, Truck, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useERPStore } from '@/lib/store';
import { AIPurchaseModal } from '@/components/AIPurchaseModal';
import { sounds } from '@/lib/audio';

interface PurchaseLine {
  id: string;
  item_id: string;
  item_name: string;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  quantity: number;
  free_quantity: number;
  purchase_rate: number;
  mrp: number;
  sale_rate: number;
  tax_rate: number;
}

export default function PurchasesPage() {
  const { parties, items, addPurchaseBill, resetToDemoData } = useERPStore();

  const suppliers = parties.filter((p) => p.party_type === 'SUPPLIER');

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNo, setInvoiceNo] = useState('PUR-882104');
  const [invoiceDate, setInvoiceDate] = useState('2026-11-14');

  const [lines, setLines] = useState<PurchaseLine[]>([
    {
      id: 'p-1',
      item_id: items[0]?.id || '',
      item_name: items[0]?.name || '',
      batch_number: 'CIP-9921',
      mfg_date: '2026-02',
      expiry_date: '2028-01',
      quantity: 50,
      free_quantity: 5,
      purchase_rate: 140.00,
      mrp: 220.00,
      sale_rate: 172.50,
      tax_rate: 12,
    }
  ]);

  const [showAiModal, setShowAiModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  // Active line input state
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [batchNo, setBatchNo] = useState('');
  const [mfgDate, setMfgDate] = useState('2026-01');
  const [expDate, setExpDate] = useState('2028-01');
  const [qty, setQty] = useState(10);
  const [freeQty, setFreeQty] = useState(0);
  const [purRate, setPurRate] = useState(100);
  const [mrp, setMrp] = useState(150);
  const [saleRate, setSaleRate] = useState(125);

  const handleAddLine = () => {
    const itm = items.find((i) => i.id === selectedItemId);
    if (!itm || !batchNo) {
      alert('Please select item and enter batch number');
      return;
    }

    const newLine: PurchaseLine = {
      id: `pline-${Date.now()}`,
      item_id: itm.id,
      item_name: itm.name,
      batch_number: batchNo.toUpperCase(),
      mfg_date: mfgDate,
      expiry_date: expDate,
      quantity: qty,
      free_quantity: freeQty,
      purchase_rate: purRate,
      mrp: mrp,
      sale_rate: saleRate,
      tax_rate: itm.tax_rate,
    };

    setLines([...lines, newLine]);
    setBatchNo('');
    sounds.playScan();
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const handleSavePurchase = () => {
    if (lines.length === 0) {
      alert('Add at least one medicine batch line');
      return;
    }

    const supplier = suppliers.find((s) => s.id === supplierId) || suppliers[0];

    const totalTaxable = lines.reduce((acc, l) => acc + l.quantity * l.purchase_rate, 0);
    const totalTax = lines.reduce((acc, l) => acc + (l.quantity * l.purchase_rate * l.tax_rate) / 100, 0);
    const totalAmount = totalTaxable + totalTax;

    const supplierIdFinal = supplier?.id || 'direct-supplier';
    addPurchaseBill(supplierIdFinal, invoiceNo, lines);

    sounds.playSave();
    setSuccessBanner(true);
    setLines([]);
    setInvoiceNo(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);
    setTimeout(() => setSuccessBanner(false), 5000);
  };

  const totalTaxable = lines.reduce((acc, l) => acc + l.quantity * l.purchase_rate, 0);
  const totalTax = lines.reduce((acc, l) => acc + (l.quantity * l.purchase_rate * l.tax_rate) / 100, 0);
  const totalPayable = totalTaxable + totalTax;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col md:flex-row font-sans select-none">
      <Sidebar onResetData={resetToDemoData} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <span>Inward Purchase Billing & GRN</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Goods Receipt Note, Automated FEFO Stock Ingestion, and AI OCR Vision
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Document Ingestion (OCR)</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800 text-xs flex items-center justify-between animate-in fade-in shadow-2xs">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Inward stock and batches successfully registered and added to live inventory!</span>
            </div>
          </div>
        )}

        {/* Supplier and Bill Header Form */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Distributor / Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium shadow-2xs focus:border-sky-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (GST: {s.gstin || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Vendor Invoice No. *</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Fast Add Line Item Bar */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-2xs space-y-3">
          <div className="text-xs font-semibold text-slate-700">Add Medicine Batch to Inward Order:</div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs">
            {/* Medicine */}
            <div className="col-span-2 space-y-1">
              <label className="text-slate-600 font-medium">Medicine</label>
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                }}
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 shadow-2xs focus:border-sky-500"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Batch No</label>
              <input
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. BT-991"
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
              />
            </div>

            {/* Mfg */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Mfg (YYYY-MM)</label>
              <input
                type="text"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
              />
            </div>

            {/* Exp */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Exp (YYYY-MM)</label>
              <input
                type="text"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono text-emerald-700 font-semibold shadow-2xs focus:border-sky-500"
              />
            </div>

            {/* Qty & Free */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Qty (+Free)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-1/2 bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono font-bold shadow-2xs focus:border-sky-500"
                />
                <input
                  type="number"
                  min="0"
                  value={freeQty}
                  onChange={(e) => setFreeQty(parseInt(e.target.value) || 0)}
                  placeholder="Free"
                  className="w-1/2 bg-white border border-slate-300 rounded p-1.5 text-slate-500 font-mono shadow-2xs focus:border-sky-500"
                />
              </div>
            </div>

            {/* Pur Rate */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Pur. Rate</label>
              <input
                type="number"
                step="0.01"
                value={purRate}
                onChange={(e) => setPurRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
              />
            </div>

            {/* Add action */}
            <div className="flex items-end">
              <button
                onClick={handleAddLine}
                className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lines Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-sans font-semibold">
                  <th className="py-2.5 px-3 text-center">#</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3 text-center">Batch</th>
                  <th className="py-2.5 px-3 text-center">Mfg</th>
                  <th className="py-2.5 px-3 text-center">Exp</th>
                  <th className="py-2.5 px-3 text-right">Inward Qty</th>
                  <th className="py-2.5 px-3 text-right">Free Qty</th>
                  <th className="py-2.5 px-3 text-right">Pur. Rate</th>
                  <th className="py-2.5 px-3 text-right">MRP</th>
                  <th className="py-2.5 px-3 text-right">Sale Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 font-sans">
                      No purchase lines. Add items manually or use &quot;AI Document Ingestion&quot; above to auto-populate from a bill!
                    </td>
                  </tr>
                ) : (
                  lines.map((l, idx) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-900">{l.item_name}</td>
                      <td className="py-2 px-3 text-center text-purple-700 font-bold">{l.batch_number}</td>
                      <td className="py-2 px-3 text-center text-slate-500">{l.mfg_date}</td>
                      <td className="py-2 px-3 text-center text-emerald-700 font-medium">{l.expiry_date}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{l.quantity}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{l.free_quantity || 0}</td>
                      <td className="py-2 px-3 text-right text-slate-700">₹{l.purchase_rate.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">₹{l.mrp.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-sky-700 font-medium">₹{l.sale_rate.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{(l.quantity * l.purchase_rate).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleRemoveLine(l.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inward Bill Summary & Save Bar */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <div>
              <span>Taxable Value: </span>
              <strong className="text-slate-900 font-mono text-sm">₹{totalTaxable.toFixed(2)}</strong>
            </div>
            <div>
              <span>GST Total: </span>
              <strong className="text-slate-700 font-mono text-sm">₹{totalTax.toFixed(2)}</strong>
            </div>
            <div>
              <span>Total Payable: </span>
              <strong className="text-purple-700 font-mono text-base font-bold">
                ₹{totalPayable.toFixed(2)}
              </strong>
            </div>
          </div>

          <button
            onClick={handleSavePurchase}
            disabled={lines.length === 0}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>CONFIRM & UPDATE INVENTORY STOCK</span>
          </button>
        </div>
        </main>
      </div>

      {/* AI Purchase Ingestion Modal */}
      {showAiModal && (
        <AIPurchaseModal
          items={items}
          onIngestSuccess={(extracted) => {
            const matchedSupplier = suppliers.find((s) => s.name === extracted.supplierName);
            if (matchedSupplier) setSupplierId(matchedSupplier.id);
            setInvoiceNo(extracted.invoiceNo);
            setInvoiceDate(extracted.date);

            const newLines: PurchaseLine[] = extracted.items.map((it, idx) => ({
              id: `ai-${Date.now()}-${idx}`,
              item_id: it.item_id,
              item_name: it.item_name,
              batch_number: it.batch_number,
              mfg_date: it.mfg_date,
              expiry_date: it.expiry_date,
              quantity: it.quantity,
              free_quantity: it.free_quantity,
              purchase_rate: it.purchase_rate,
              mrp: it.mrp,
              sale_rate: it.sale_rate,
              tax_rate: it.tax_rate,
            }));

            setLines(newLines);
            sounds.playSave();
          }}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  );
}
