'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Boxes, AlertTriangle, ShieldCheck, 
  Pill, Sparkles, Eye, ArrowUpDown, ChevronDown, Trash2 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useERPStore } from '@/lib/store';
import { Item, ItemBatch } from '@/types/erp';
import { SubstituteFinderModal } from '@/components/SubstituteFinderModal';

export default function InventoryPage() {
  const { items, batches, addItem, addBatch, deleteItem, deleteBatch, findSubstitutes, resetToDemoData } = useERPStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dateRef, setDateRef] = useState({ year: 2026, month: 11 });

  // Update date on client mount safely
  useEffect(() => {
    const d = new Date();
    setDateRef({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }, []);

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [batchTargetItemId, setBatchTargetItemId] = useState<string | null>(null);
  const [substituteItem, setSubstituteItem] = useState<Item | null>(null);

  // New Item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemSalt, setNewItemSalt] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Antibiotic');
  const [newItemManufacturer, setNewItemManufacturer] = useState('');
  const [newItemHsn, setNewItemHsn] = useState('300490');
  const [newItemUnit, setNewItemUnit] = useState('Strip');
  const [newItemPackSize, setNewItemPackSize] = useState('10 Tablets');
  const [newItemTax, setNewItemTax] = useState(12);
  const [newItemReorder, setNewItemReorder] = useState(20);
  const [newItemRx, setNewItemRx] = useState(true);

  // New Batch form state
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchMfg, setNewBatchMfg] = useState('2026-01');
  const [newBatchExp, setNewBatchExp] = useState('2028-01');
  const [newBatchMrp, setNewBatchMrp] = useState(150);
  const [newBatchPurRate, setNewBatchPurRate] = useState(100);
  const [newBatchSaleRate, setNewBatchSaleRate] = useState(120);
  const [newBatchQty, setNewBatchQty] = useState(50);
  const [newBatchRack, setNewBatchRack] = useState('R-A1-01');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return ['ALL', ...Array.from(set)];
  }, [items]);

  // Enriched items with batches & stock
  const enrichedItems = useMemo(() => {
    const currentYear = dateRef.year;
    const currentMonth = dateRef.month;

    return items.map((itm) => {
      const itmBatches = batches.filter((b) => b.item_id === itm.id);
      const totalStock = itmBatches.reduce((sum, b) => sum + b.quantity_available, 0);

      // Check expiry status
      let hasExpired = false;
      let hasNearExpiry = false;

      itmBatches.forEach((b) => {
        if (b.quantity_available <= 0) return;
        const [yStr, mStr] = b.expiry_date.split('-');
        const monthsDiff = (parseInt(yStr, 10) - currentYear) * 12 + (parseInt(mStr, 10) - currentMonth);
        if (monthsDiff < 0) hasExpired = true;
        else if (monthsDiff <= 3) hasNearExpiry = true;
      });

      const isLowStock = totalStock <= itm.reorder_level;

      return {
        ...itm,
        batches: itmBatches,
        totalStock,
        hasExpired,
        hasNearExpiry,
        isLowStock,
      };
    });
  }, [items, batches, dateRef]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();

    return enrichedItems.filter((itm) => {
      if (q) {
        const matchesName = itm.name.toLowerCase().includes(q);
        const matchesSalt = itm.salt_composition.toLowerCase().includes(q);
        const matchesCode = itm.item_code.toLowerCase().includes(q);
        if (!matchesName && !matchesSalt && !matchesCode) return false;
      }

      if (selectedCategory !== 'ALL' && itm.category !== selectedCategory) {
        return false;
      }

      if (filterType === 'LOW_STOCK' && !itm.isLowStock) return false;
      if (filterType === 'NEAR_EXPIRY' && !itm.hasNearExpiry) return false;
      if (filterType === 'EXPIRED' && !itm.hasExpired) return false;

      return true;
    });
  }, [enrichedItems, search, selectedCategory, filterType]);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemSalt) {
      alert('Please fill Medicine Name and Active Salt Formulation');
      return;
    }

    const code = newItemCode || newItemName.slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);

    addItem({
      item_code: code,
      name: newItemName,
      brand_name: newItemBrand || newItemName.split(' ')[0],
      salt_composition: newItemSalt,
      category: newItemCategory,
      manufacturer: newItemManufacturer || 'Standard Laboratories',
      hsn_code: newItemHsn,
      unit: newItemUnit,
      pack_size: newItemPackSize,
      conversion_factor: 1,
      tax_rate: newItemTax,
      cess_rate: 0,
      reorder_level: newItemReorder,
      is_prescription_required: newItemRx,
      storage_condition: 'Store in cool, dry place',
    });

    setShowAddItemModal(false);
    // Reset form
    setNewItemName('');
    setNewItemBrand('');
    setNewItemCode('');
    setNewItemSalt('');
    setNewItemManufacturer('');
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTargetItemId || !newBatchNumber) {
      alert('Batch number is required');
      return;
    }

    addBatch({
      item_id: batchTargetItemId,
      batch_number: newBatchNumber.toUpperCase(),
      mfg_date: newBatchMfg,
      expiry_date: newBatchExp,
      mrp: newBatchMrp,
      purchase_rate: newBatchPurRate,
      sale_rate: newBatchSaleRate,
      quantity_available: newBatchQty,
      rack_location: newBatchRack,
    });

    setShowAddBatchModal(false);
    setNewBatchNumber('');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none">
      <Navbar onResetData={resetToDemoData} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-sky-600" />
              <span>Pharmaceutical Master & Inventory</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Active Molecule Tracking, Batch-wise FEFO Expiry, and Reorder Intelligence
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddItemModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Medicine</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-2xs text-xs">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand name, salt/molecule formulation, or item code..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-xs font-medium shadow-2xs"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-500 text-xs shadow-2xs font-medium"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="md:col-span-4 flex items-center justify-between bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            {(
              [
                { id: 'ALL', label: 'All Items' },
                { id: 'LOW_STOCK', label: 'Low Stock' },
                { id: 'NEAR_EXPIRY', label: 'Near Expiry' },
                { id: 'EXPIRED', label: 'Expired' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`flex-1 py-1 px-1.5 text-center text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Medicines Catalog Grid / Table */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">No medicines matched your criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try searching by active salt molecule or resetting filters.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-all shadow-sm space-y-3"
              >
                {/* Item Top Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-slate-900 tracking-tight">{item.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium border border-slate-200">
                        {item.item_code}
                      </span>
                      <span className="text-xs text-slate-500">by {item.manufacturer}</span>
                      {item.is_prescription_required && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          Schedule H (Rx Required)
                        </span>
                      )}
                    </div>

                    {/* Salt formulation badge */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Active Formulation:</span>
                      <span className="text-sky-800 font-medium bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {item.salt_composition}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Category: <strong className="text-slate-700">{item.category}</strong></span>
                      <span>•</span>
                      <span>Unit: <strong className="text-slate-700">{item.unit} ({item.pack_size})</strong></span>
                      <span>•</span>
                      <span>HSN: <strong className="text-slate-700">{item.hsn_code}</strong></span>
                      <span>•</span>
                      <span>GST: <strong className="text-slate-700">{item.tax_rate}%</strong></span>
                    </div>
                  </div>

                  {/* Stock summary and Actions */}
                  <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between gap-2 flex-shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-500">Total Available Stock</div>
                      <div className={`text-xl font-bold font-mono ${
                        item.totalStock <= item.reorder_level ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {item.totalStock} {item.unit}s
                      </div>
                      {item.totalStock <= item.reorder_level && (
                        <div className="text-[10px] text-amber-700 font-medium">
                          Below Reorder Level ({item.reorder_level})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSubstituteItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition-colors shadow-2xs"
                        title="Find alternatives by salt composition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Find Substitutes</span>
                      </button>

                      <button
                        onClick={() => {
                          setBatchTargetItemId(item.id);
                          setShowAddBatchModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-300 transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                        <span>New Batch</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete "${item.name}" and ALL its batches? This cannot be undone.`)) {
                            deleteItem(item.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-colors shadow-2xs"
                        title="Delete medicine and all batches"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batches Table for this item */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span>Registered Batches (FEFO Sorted):</span>
                    <span>{item.batches.length} Batch(es) Active</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-500 bg-slate-50/60 border-b border-slate-200 text-[10px] uppercase font-mono font-semibold">
                          <th className="py-2 px-3">Batch Number</th>
                          <th className="py-2 px-3">Rack</th>
                          <th className="py-2 px-3">Mfg Date</th>
                          <th className="py-2 px-3">Expiry Date</th>
                          <th className="py-2 px-3 text-right">Available Qty</th>
                          <th className="py-2 px-3 text-right">Purchase Rate</th>
                          <th className="py-2 px-3 text-right">Sale Rate</th>
                          <th className="py-2 px-3 text-right">MRP</th>
                                          <th className="py-2 px-3 text-center">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        {item.batches.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-3 px-3 text-center text-slate-400 font-sans">
                              No batches recorded. Click &quot;New Batch&quot; or enter a purchase bill to stock this medicine.
                            </td>
                          </tr>
                        ) : (
                          item.batches.map((batch) => {
                            const [yStr, mStr] = batch.expiry_date.split('-');
                            const diff = (parseInt(yStr, 10) - dateRef.year) * 12 + (parseInt(mStr, 10) - dateRef.month);
                            const isNear = diff >= 0 && diff <= 3;
                            const isExp = diff < 0;

                            return (
                              <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{batch.batch_number}</span>
                                  {isExp && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                      EXPIRED
                                    </span>
                                  )}
                                  {isNear && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                      EXPIRING SOON
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-500">{batch.rack_location || '-'}</td>
                                <td className="py-2 px-3 text-slate-500">{batch.mfg_date}</td>
                                <td className={`py-2 px-3 font-medium ${isExp ? 'text-rose-700 font-bold' : isNear ? 'text-amber-700 font-bold' : 'text-slate-600'}`}>
                                  {batch.expiry_date}
                                </td>
                                <td className={`py-2 px-3 text-right font-bold ${batch.quantity_available > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  {batch.quantity_available}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-600">₹{batch.purchase_rate.toFixed(2)}</td>
                                <td className="py-2 px-3 text-right text-sky-700 font-medium">₹{batch.sale_rate.toFixed(2)}</td>
                                <td className="py-2 px-3 text-right text-slate-900 font-semibold">₹{batch.mrp.toFixed(2)}</td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete batch "${batch.batch_number}"?`)) {
                                        deleteBatch(batch.id);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Delete this batch"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add New Medicine Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-sky-600" />
                <span>Register New Medicine in Master</span>
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Medicine Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Augmentin 625 Duo"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Brand / Base Name</label>
                  <input
                    type="text"
                    value={newItemBrand}
                    onChange={(e) => setNewItemBrand(e.target.value)}
                    placeholder="e.g. Augmentin"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium flex items-center justify-between">
                  <span>Generic Active Molecule / Salt Formulation *</span>
                  <span className="text-[10px] text-sky-600 font-semibold">Crucial for auto substitute matching</span>
                </label>
                <input
                  type="text"
                  required
                  value={newItemSalt}
                  onChange={(e) => setNewItemSalt(e.target.value)}
                  placeholder="e.g. Amoxicillin (500mg) + Clavulanic Acid (125mg)"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium text-sky-800 shadow-2xs focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Manufacturer / Pharma Company</label>
                  <input
                    type="text"
                    value={newItemManufacturer}
                    onChange={(e) => setNewItemManufacturer(e.target.value)}
                    placeholder="e.g. GlaxoSmithKline"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Therapeutic Category</label>
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    placeholder="e.g. Antibiotic"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Unit</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  >
                    <option value="Strip">Strip</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Box">Box</option>
                    <option value="Vial">Vial</option>
                    <option value="Ampoule">Ampoule</option>
                    <option value="Tube">Tube</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Pack Size</label>
                  <input
                    type="text"
                    value={newItemPackSize}
                    onChange={(e) => setNewItemPackSize(e.target.value)}
                    placeholder="e.g. 10 Tablets"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">GST Rate %</label>
                  <select
                    value={newItemTax}
                    onChange={(e) => setNewItemTax(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  >
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="rxCheckbox"
                  checked={newItemRx}
                  onChange={(e) => setNewItemRx(e.target.checked)}
                  className="rounded bg-white border-slate-300 text-sky-600 focus:ring-0"
                />
                <label htmlFor="rxCheckbox" className="text-slate-700 font-medium">
                  Schedule H / H1 Drug (Prescription verification mandatory)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create New Batch</h3>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Batch Number *</label>
                <input
                  type="text"
                  required
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  placeholder="e.g. AG9921"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Mfg Date (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    value={newBatchMfg}
                    onChange={(e) => setNewBatchMfg(e.target.value)}
                    placeholder="2026-01"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Expiry Date (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    value={newBatchExp}
                    onChange={(e) => setNewBatchExp(e.target.value)}
                    placeholder="2028-01"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-emerald-700 font-semibold shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Purchase Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatchPurRate}
                    onChange={(e) => setNewBatchPurRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Sale Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatchSaleRate}
                    onChange={(e) => setNewBatchSaleRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-sky-700 font-semibold shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">MRP</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatchMrp}
                    onChange={(e) => setNewBatchMrp(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newBatchQty}
                    onChange={(e) => setNewBatchQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Rack Location</label>
                  <input
                    type="text"
                    value={newBatchRack}
                    onChange={(e) => setNewBatchRack(e.target.value)}
                    placeholder="R-A1-01"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
                >
                  Add Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Substitute Finder Modal */}
      {substituteItem && (
        <SubstituteFinderModal
          baseItem={substituteItem}
          substitutes={findSubstitutes(substituteItem.id)}
          onSelectSubstitute={() => {
            setSubstituteItem(null);
          }}
          onClose={() => setSubstituteItem(null)}
        />
      )}
    </div>
  );
}
