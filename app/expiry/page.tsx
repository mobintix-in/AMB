'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, ShieldAlert, Clock, ArrowRight, DollarSign, 
  RotateCcw, Sparkles, Filter, CheckCircle2, Trash2 
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useERPStore } from '@/lib/store';
import { Item, ItemBatch } from '@/types/erp';
import { sounds } from '@/lib/audio';

export default function ExpiryRadarPage() {
  const { items, batches, deleteBatch, resetToDemoData } = useERPStore();
  const [filterBucket, setFilterBucket] = useState<'ALL' | 'EXPIRED' | '30DAYS' | '60DAYS' | '90DAYS'>('ALL');
  const [clearedNotice, setClearedNotice] = useState<string | null>(null);
  const [dateRef, setDateRef] = useState({ year: 2026, month: 11 });

  // Update date safely on client mount
  useEffect(() => {
    const d = new Date();
    setDateRef({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }, []);

  // Classify batches by expiry status
  const analyzedBatches = useMemo(() => {
    const currentYear = dateRef.year;
    const currentMonth = dateRef.month;

    return batches
      .filter((b) => b.quantity_available > 0)
      .map((batch) => {
        const item = items.find((i) => i.id === batch.item_id);
        const [yStr, mStr] = batch.expiry_date.split('-');
        const expYear = parseInt(yStr, 10);
        const expMonth = parseInt(mStr, 10);

        const diffMonths = (expYear - currentYear) * 12 + (expMonth - currentMonth);

        let bucket: 'EXPIRED' | '30DAYS' | '60DAYS' | '90DAYS' | 'SAFE' = 'SAFE';
        if (diffMonths < 0) bucket = 'EXPIRED';
        else if (diffMonths <= 1) bucket = '30DAYS';
        else if (diffMonths <= 2) bucket = '60DAYS';
        else if (diffMonths <= 3) bucket = '90DAYS';

        const stockValuation = batch.quantity_available * batch.purchase_rate;
        const potentialRevenue = batch.quantity_available * batch.sale_rate;

        return {
          ...batch,
          item,
          diffMonths,
          bucket,
          stockValuation,
          potentialRevenue,
        };
      })
      .filter((b) => b.bucket !== 'SAFE'); // Only show near expiry or expired
  }, [batches, items, dateRef]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let expiredVal = 0;
    let nearExpiryVal = 0;
    let expiredCount = 0;
    let nearExpiryCount = 0;

    analyzedBatches.forEach((b) => {
      if (b.bucket === 'EXPIRED') {
        expiredVal += b.stockValuation;
        expiredCount += 1;
      } else {
        nearExpiryVal += b.stockValuation;
        nearExpiryCount += 1;
      }
    });

    return { expiredVal, nearExpiryVal, expiredCount, nearExpiryCount };
  }, [analyzedBatches]);

  // Filtered view
  const displayList = useMemo(() => {
    if (filterBucket === 'ALL') return analyzedBatches;
    return analyzedBatches.filter((b) => b.bucket === filterBucket);
  }, [analyzedBatches, filterBucket]);

  const handleSimulateReturn = (batchNumber: string, itemName: string) => {
    sounds.playSave();
    setClearedNotice(`Debit Note generated for ${itemName} (Batch ${batchNumber}). Stock scheduled for return to supplier.`);
    setTimeout(() => setClearedNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col md:flex-row font-sans select-none">
      <Sidebar onResetData={resetToDemoData} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Pharmaceutical Expiry Radar</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              FEFO Risk Analysis, Pre-emptive Clearance Discounts, and Vendor Debit Notes
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-medium">
              Near-Expiry At Risk: <strong>₹{metrics.nearExpiryVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </div>
            {metrics.expiredVal > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                Expired (Loss): <strong>₹{metrics.expiredVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
              </div>
            )}
          </div>
        </div>

        {clearedNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{clearedNotice}</span>
          </div>
        )}

        {/* Bucket Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
          {(
            [
              { id: 'ALL', label: `All Alerts (${analyzedBatches.length})` },
              { id: 'EXPIRED', label: 'Expired (Blocked)' },
              { id: '30DAYS', label: 'Critical: < 30 Days' },
              { id: '60DAYS', label: 'Warning: 31-60 Days' },
              { id: '90DAYS', label: 'Watchlist: 61-90 Days' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterBucket(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterBucket === tab.id
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Batches Radar List */}
        <div className="space-y-3">
          {displayList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="text-slate-800 font-semibold">No critical expiry risks in this category!</p>
              <p className="text-xs text-slate-500 mt-1">All batches are within compliant expiry limits.</p>
            </div>
          ) : (
            displayList.map((batch) => {
              const isExpired = batch.bucket === 'EXPIRED';
              const isCritical = batch.bucket === '30DAYS';

              return (
                <div
                  key={batch.id}
                  className={`p-4 rounded-xl border transition-all shadow-sm ${
                    isExpired
                      ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                      : isCritical
                      ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">{batch.item?.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          isExpired
                            ? 'bg-rose-600 text-white'
                            : isCritical
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {isExpired ? 'Expired' : isCritical ? 'Expires within 30 Days' : 'Expiring Soon'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          Batch: <strong className="text-slate-800">{batch.batch_number}</strong>
                        </span>
                      </div>

                      <div className="text-xs text-sky-800 font-medium">
                        Salt: {batch.item?.salt_composition}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
                        <span>Expiry Date: <strong className={isExpired ? 'text-rose-700 font-bold' : 'text-amber-700 font-bold'}>{batch.expiry_date}</strong></span>
                        <span>•</span>
                        <span>Quantity In Stock: <strong className="text-slate-900">{batch.quantity_available} {batch.item?.unit}s</strong></span>
                        <span>•</span>
                        <span>Cost Valuation: <strong className="text-slate-800">₹{batch.stockValuation.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSimulateReturn(batch.batch_number, batch.item?.name || '')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Return to Vendor (Debit Note)</span>
                      </button>

                      {!isExpired && (
                        <button
                          onClick={() => alert(`Applied 15% Clearance Scheme on Batch ${batch.batch_number}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Run 15% Clearance Scheme</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Permanently discard & delete expired batch "${batch.batch_number}" (${batch.item?.name})?`)) {
                            deleteBatch(batch.id);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors shadow-2xs"
                        title="Delete / Discard batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Discard</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  </div>
);
}
