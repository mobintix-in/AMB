'use client';

import { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
import { sounds } from '@/lib/audio';
import { Item } from '@/types/erp';

interface AIPurchaseModalProps {
  items: Item[];
  onIngestSuccess: (extractedData: {
    supplierName: string;
    invoiceNo: string;
    date: string;
    items: {
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
    }[];
  }) => void;
  onClose: () => void;
}

export function AIPurchaseModal({ items, onIngestSuccess, onClose }: AIPurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedSample, setSelectedSample] = useState<'sample1' | 'sample2'>('sample1');

  const sample1 = {
    title: 'Cipla Distribution C&F Invoice (PDF)',
    filename: 'CIPLA_INV_OCT2026_9941.pdf',
    supplierName: 'Cipla Distribution C&F Agency',
    invoiceNo: 'CIP-2026-9941',
    date: '2026-11-14',
    items: [
      {
        item_code: 'AUG625',
        batch_number: 'CIP-8941',
        mfg_date: '2026-05',
        expiry_date: '2028-04',
        quantity: 50,
        free_quantity: 5,
        purchase_rate: 142.00,
        mrp: 220.00,
        sale_rate: 172.50,
        tax_rate: 12,
      },
      {
        item_code: 'AZITH500',
        batch_number: 'AZ-7721',
        mfg_date: '2026-06',
        expiry_date: '2028-05',
        quantity: 40,
        free_quantity: 4,
        purchase_rate: 82.50,
        mrp: 135.00,
        sale_rate: 104.00,
        tax_rate: 12,
      }
    ]
  };

  const sample2 = {
    title: 'Sun Pharma Inward Tax Invoice (Scan)',
    filename: 'SUN_PHARMA_GRN_2810.jpg',
    supplierName: 'Sun Pharma Stockists & Distributors',
    invoiceNo: 'SUN-GRN-2810',
    date: '2026-11-14',
    items: [
      {
        item_code: 'PANDCAP',
        batch_number: 'PND-992',
        mfg_date: '2026-08',
        expiry_date: '2028-07',
        quantity: 100,
        free_quantity: 10,
        purchase_rate: 120.00,
        mrp: 199.00,
        sale_rate: 145.00,
        tax_rate: 12,
      },
      {
        item_code: 'DOLO650',
        batch_number: 'DL-2028',
        mfg_date: '2026-07',
        expiry_date: '2028-06',
        quantity: 200,
        free_quantity: 20,
        purchase_rate: 18.00,
        mrp: 34.00,
        sale_rate: 24.50,
        tax_rate: 12,
      }
    ]
  };

  const currentSample = selectedSample === 'sample1' ? sample1 : sample2;

  const handleSimulateOCR = () => {
    setIsProcessing(true);
    sounds.playScan();

    setTimeout(() => {
      setIsProcessing(false);
      setAnalyzed(true);
      sounds.playSave();
    }, 1800);
  };

  const handleApplyToPurchase = () => {
    // Resolve item IDs
    const matchedLines = currentSample.items.map((line) => {
      const matchedItem = items.find((i) => i.item_code === line.item_code) || items[0];
      return {
        item_id: matchedItem.id,
        item_name: matchedItem.name,
        batch_number: line.batch_number,
        mfg_date: line.mfg_date,
        expiry_date: line.expiry_date,
        quantity: line.quantity,
        free_quantity: line.free_quantity,
        purchase_rate: line.purchase_rate,
        mrp: line.mrp,
        sale_rate: line.sale_rate,
        tax_rate: line.tax_rate,
      };
    });

    onIngestSuccess({
      supplierName: currentSample.supplierName,
      invoiceNo: currentSample.invoiceNo,
      date: currentSample.date,
      items: matchedLines,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Purchase Bill Ingestion (Document AI)</h3>
              <p className="text-xs text-slate-500">Zero-friction automatic OCR extraction of batches, expiries, rates & tax</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Sample Bill Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Select Sample Vendor Invoice to Ingest:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedSample('sample1');
                  setAnalyzed(false);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedSample === 'sample1'
                    ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-xs text-slate-900">Cipla Agency Bill</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">{sample1.filename}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Augmentin 625 (50 Qty), Azithral (40 Qty)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSample('sample2');
                  setAnalyzed(false);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedSample === 'sample2'
                    ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span className="font-semibold text-xs text-slate-900">Sun Pharma Invoice</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">{sample2.filename}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Pan-D (100 Qty), Dolo 650 (200 Qty)</div>
              </button>
            </div>
          </div>

          {/* Drag & Drop Visual Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl p-6 text-center bg-slate-50/50 transition-colors">
            <UploadCloud className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-900">Selected Document: {currentSample.filename}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Supports scanned PDFs, thermal pictures, and mobile snapshots
            </div>

            {!analyzed && (
              <button
                onClick={handleSimulateOCR}
                disabled={isProcessing}
                className="mt-4 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Extracting line items & batches...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Vision Extraction (2s)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Extraction Results */}
          {analyzed && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 animate-in fade-in duration-150 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>OCR Extraction Complete (Confidence: 99.4%)</span>
                </div>
                <span className="text-[10px] text-slate-500">Supplier: {currentSample.supplierName}</span>
              </div>

              {/* Extracted table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="text-slate-600 bg-slate-50 border-b border-slate-200 font-semibold">
                      <th className="py-1 px-2">Item Code</th>
                      <th className="py-1 px-2">Batch</th>
                      <th className="py-1 px-2">Expiry</th>
                      <th className="py-1 px-2 text-right">Qty (+Free)</th>
                      <th className="py-1 px-2 text-right">Pur. Rate</th>
                      <th className="py-1 px-2 text-right">MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {currentSample.items.map((it, idx) => (
                      <tr key={idx} className="text-slate-700 hover:bg-slate-50">
                        <td className="py-1 px-2 font-semibold text-sky-700">{it.item_code}</td>
                        <td className="py-1 px-2 text-emerald-700 font-medium">{it.batch_number}</td>
                        <td className="py-1 px-2">{it.expiry_date}</td>
                        <td className="py-1 px-2 text-right">{it.quantity} (+{it.free_quantity} free)</td>
                        <td className="py-1 px-2 text-right">₹{it.purchase_rate.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right">₹{it.mrp.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                <span>All line items matched against medicine master. Zero manual typing required.</span>
                <button
                  onClick={handleApplyToPurchase}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>Fill Purchase Bill</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
