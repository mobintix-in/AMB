'use client';

import { X, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import { Item, SubstituteMedicine, ItemBatch } from '@/types/erp';
import { sounds } from '@/lib/audio';

interface SubstituteFinderModalProps {
  baseItem: Item;
  substitutes: SubstituteMedicine[];
  onSelectSubstitute: (substituteItem: Item, selectedBatch: ItemBatch) => void;
  onClose: () => void;
}

export function SubstituteFinderModal({
  baseItem,
  substitutes,
  onSelectSubstitute,
  onClose,
}: SubstituteFinderModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                Smart Molecule Matcher
              </span>
              <h3 className="text-base font-bold text-slate-900">In-Stock Substitute Medicines</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active Salt / Generic Formula: <span className="text-sky-700 font-semibold">{baseItem.salt_composition}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Queried Medicine Summary */}
        <div className="bg-slate-50/70 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            <span className="text-slate-500">Queried Medicine: </span>
            <span className="text-slate-900 font-semibold">{baseItem.name}</span>
            <span className="text-slate-500"> ({baseItem.manufacturer})</span>
          </div>
          <span className="text-slate-500">
            Pack: <span className="text-slate-800 font-medium">{baseItem.pack_size}</span>
          </span>
        </div>

        {/* Alternatives List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {substitutes.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">No other brands with this active salt formulation found in stock.</p>
            </div>
          ) : (
            substitutes.map((sub) => {
              const bestBatch = sub.batches[0]; // Earliest expiry batch (FEFO)
              const isSame = sub.isSameBrand;

              return (
                <div
                  key={sub.item.id}
                  className={`p-4 rounded-xl border transition-all shadow-xs ${
                    isSame
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{sub.item.name}</span>
                        {isSame ? (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded font-medium">
                            Original Brand
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">
                            Direct Substitute
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-normal">
                          by {sub.item.manufacturer}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Salt: <span className="text-slate-700 font-medium">{sub.item.salt_composition}</span>
                      </div>
                      <div className="text-xs flex items-center gap-3 pt-1">
                        <span className="text-slate-500">
                          Total Stock:{' '}
                          <strong className={sub.totalStock > 0 ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                            {sub.totalStock} {sub.item.unit}s
                          </strong>
                        </span>
                        {bestBatch && (
                          <span className="text-slate-500">
                            Batch: <span className="text-slate-800 font-mono font-medium">{bestBatch.batch_number}</span> (Exp: {bestBatch.expiry_date})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-sky-700 font-mono">
                          ₹{bestBatch ? bestBatch.sale_rate.toFixed(2) : sub.minPrice.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400 line-through">
                          MRP: ₹{bestBatch ? bestBatch.mrp.toFixed(2) : sub.maxPrice.toFixed(2)}
                        </div>
                      </div>

                      {bestBatch && bestBatch.quantity_available > 0 ? (
                        <button
                          onClick={() => {
                            sounds.playScan();
                            onSelectSubstitute(sub.item, bestBatch);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Select Batch</span>
                        </button>
                      ) : (
                        <span className="text-xs text-rose-600 font-medium px-2 py-1 bg-rose-50 rounded border border-rose-200">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-batch list if more than 1 batch available */}
                  {sub.batches.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="text-[11px] text-slate-500 mb-1.5 font-medium">Other Available Batches (FEFO):</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sub.batches.map((batch) => (
                          <button
                            key={batch.id}
                            onClick={() => {
                              sounds.playScan();
                              onSelectSubstitute(sub.item, batch);
                              onClose();
                            }}
                            className="flex items-center justify-between p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors text-left shadow-2xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-slate-900">{batch.batch_number}</span>
                              <span className="text-slate-500 text-[10px] ml-2">Exp: {batch.expiry_date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-emerald-700 font-semibold">{batch.quantity_available} left</span>
                              <span className="font-mono text-sky-700 font-bold">₹{batch.sale_rate}</span>
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Click any batch to immediately insert it into the invoice</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
