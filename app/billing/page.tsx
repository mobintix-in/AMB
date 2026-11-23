'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Trash2, Printer, QrCode, Search, Pause, Play, 
  HelpCircle, AlertCircle, Sparkles, Check, ArrowRight,
  TrendingUp, ShieldAlert, CreditCard, Banknote, UserCheck, 
  FileText, ShoppingBag, Pill
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useERPStore } from '@/lib/store';
import { sounds } from '@/lib/audio';
import { 
  Party, Item, ItemBatch, SalesInvoiceItem, 
  PaymentMode, SalesInvoice 
} from '@/types/erp';
import { SubstituteFinderModal } from '@/components/SubstituteFinderModal';
import { InvoicePrintModal } from '@/components/InvoicePrintModal';
import { UpiQrModal } from '@/components/UpiQrModal';

export default function BillingPage() {
  const { 
    tenant, parties, items, batches, searchItems, 
    findSubstitutes, createSalesInvoice, resetToDemoData 
  } = useERPStore();

  // Invoice header state
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0892');
  const [currentDate, setCurrentDate] = useState('2026-11-14');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('pty-101');
  const [doctorName, setDoctorName] = useState('Dr. S. K. Roy (MBBS, MD)');
  const [patientName, setPatientName] = useState('General Patient / Counter');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');

  // Line items state
  const [lineItems, setLineItems] = useState<SalesInvoiceItem[]>([]);

  // Item Search & Active row entry state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ItemBatch | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [freeQuantity, setFreeQuantity] = useState<number>(0);
  const [customRate, setCustomRate] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Held Bills state (F7 Hold Bill feature)
  const [heldBills, setHeldBills] = useState<{
    id: string;
    partyId: string;
    partyName: string;
    doctorName: string;
    patientName: string;
    items: SalesInvoiceItem[];
    total: number;
    heldAt: string;
  }[]>([]);

  // Modals state
  const [substituteItem, setSubstituteItem] = useState<Item | null>(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);

  // Input refs for keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);

  // Initialize new invoice number on mount
  useEffect(() => {
    generateNewInvoiceNumber();
    setCurrentDate(new Date().toISOString().slice(0, 10));
  }, []);

  const generateNewInvoiceNumber = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`INV-2026-${randomDigits}`);
  };

  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId) || parties[0];
  }, [parties, selectedPartyId]);

  // Search results
  const searchResults = useMemo(() => {
    return searchItems(searchQuery);
  }, [searchQuery, searchItems]);

  // Keyboard shortcut listener (F1, F4, F7, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: New Bill
      if (e.key === 'F1') {
        e.preventDefault();
        handleNewBill();
      }
      // F7: Hold current bill
      if (e.key === 'F7' || (e.altKey && e.key.toLowerCase() === 'h')) {
        e.preventDefault();
        handleHoldBill();
      }
      // Ctrl+S or F10: Save & Print
      if ((e.ctrlKey && e.key.toLowerCase() === 's') || e.key === 'F10') {
        e.preventDefault();
        handleSaveBill();
      }
      // F3: Focus search
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lineItems, selectedParty, selectedPartyId, paymentMode]);

  // Selecting an item from the search typeahead
  const handleSelectItem = (item: Item & { batches: ItemBatch[]; totalStock: number }) => {
    setSelectedItem(item);
    setSearchQuery('');
    setIsDropdownOpen(false);

    // Pick FEFO batch (First Expired First Out) with stock > 0
    const availableBatches = item.batches
      .filter((b) => b.quantity_available > 0)
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

    if (availableBatches.length > 0) {
      const bestBatch = availableBatches[0];
      setSelectedBatch(bestBatch);
      setCustomRate(bestBatch.sale_rate);
      setQuantity(1);
      setFreeQuantity(0);
      setDiscountPercent(0);
      sounds.playScan();
      setTimeout(() => qtyInputRef.current?.focus(), 50);
    } else {
      sounds.playAlert();
      // Out of stock! Suggest alternatives
      setSubstituteItem(item);
    }
  };

  // Add line item to table
  const handleAddLineItem = () => {
    if (!selectedItem || !selectedBatch) return;

    if (quantity <= 0) {
      alert('Quantity must be greater than zero');
      return;
    }

    const totalRequested = quantity + freeQuantity;
    if (totalRequested > selectedBatch.quantity_available) {
      sounds.playAlert();
      const proceed = confirm(
        `Requested quantity (${totalRequested}) exceeds available batch stock (${selectedBatch.quantity_available}). Proceed anyway?`
      );
      if (!proceed) return;
    }

    // Calculations
    const rate = customRate || selectedBatch.sale_rate;
    const grossAmount = quantity * rate;
    const discountAmt = (grossAmount * discountPercent) / 100;
    const taxableAmount = grossAmount - discountAmt;
    const taxRate = selectedItem.tax_rate;
    const cgst = (taxableAmount * (taxRate / 2)) / 100;
    const sgst = (taxableAmount * (taxRate / 2)) / 100;
    const totalAmount = taxableAmount + cgst + sgst;

    const newLine: SalesInvoiceItem = {
      id: `line-${Date.now()}`,
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      brand_name: selectedItem.brand_name,
      salt_composition: selectedItem.salt_composition,
      batch_id: selectedBatch.id,
      batch_number: selectedBatch.batch_number,
      expiry_date: selectedBatch.expiry_date,
      quantity,
      free_quantity: freeQuantity,
      mrp: selectedBatch.mrp,
      rate,
      purchase_rate: selectedBatch.purchase_rate,
      discount_percent: discountPercent,
      tax_rate: taxRate,
      taxable_amount: taxableAmount,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: 0,
      total_amount: totalAmount,
    };

    setLineItems([...lineItems, newLine]);
    sounds.playScan();

    // Reset input row
    setSelectedItem(null);
    setSelectedBatch(null);
    setQuantity(1);
    setFreeQuantity(0);
    setCustomRate(0);
    setDiscountPercent(0);

    // Refocus search for next item
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((i) => i.id !== id));
    sounds.playScan();
  };

  // Live bill financials calculation
  const calculations = useMemo(() => {
    let grossTotal = 0;
    let totalDiscount = 0;
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let totalCost = 0;

    lineItems.forEach((item) => {
      const gross = item.quantity * item.rate;
      const disc = (gross * item.discount_percent) / 100;
      grossTotal += gross;
      totalDiscount += disc;
      taxableTotal += item.taxable_amount;
      cgstTotal += item.cgst_amount;
      sgstTotal += item.sgst_amount;
      totalCost += (item.quantity + item.free_quantity) * item.purchase_rate;
    });

    const subtotalWithTaxes = taxableTotal + cgstTotal + sgstTotal;
    const roundedTotal = Math.round(subtotalWithTaxes);
    const roundOff = roundedTotal - subtotalWithTaxes;

    const netProfitAmount = taxableTotal - totalCost;
    const netProfitPercent = taxableTotal > 0 ? (netProfitAmount / taxableTotal) * 100 : 0;

    return {
      grossTotal,
      totalDiscount,
      taxableTotal,
      cgstTotal,
      sgstTotal,
      roundOff,
      totalPayable: roundedTotal,
      totalCost,
      netProfitAmount,
      netProfitPercent,
    };
  }, [lineItems]);

  // Hold current bill
  const handleHoldBill = () => {
    if (lineItems.length === 0) {
      alert('Cannot hold an empty bill.');
      return;
    }
    const newHold = {
      id: `hold-${Date.now()}`,
      partyId: selectedPartyId,
      partyName: selectedParty?.name || 'Walk-in Customer',
      doctorName,
      patientName,
      items: lineItems,
      total: calculations.totalPayable,
      heldAt: new Date().toLocaleTimeString(),
    };
    setHeldBills([...heldBills, newHold]);
    sounds.playAlert();
    handleNewBill();
  };

  // Resume a held bill
  const handleResumeBill = (holdId: string) => {
    const target = heldBills.find((h) => h.id === holdId);
    if (!target) return;
    setSelectedPartyId(target.partyId);
    setDoctorName(target.doctorName);
    setPatientName(target.patientName);
    setLineItems(target.items);
    setHeldBills(heldBills.filter((h) => h.id !== holdId));
    sounds.playScan();
  };

  // New Bill
  const handleNewBill = () => {
    generateNewInvoiceNumber();
    setLineItems([]);
    setSelectedItem(null);
    setSelectedBatch(null);
    setPaymentMode('CASH');
    searchInputRef.current?.focus();
  };

  // Save Bill
  const handleSaveBill = () => {
    if (lineItems.length === 0) {
      alert('Please add at least one medicine to the bill.');
      return;
    }

    if (paymentMode === 'UPI') {
      setShowUpiModal(true);
      return;
    }

    finalizeInvoice();
  };

  const finalizeInvoice = (upiRef?: string) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    const savedInvoice = createSalesInvoice({
      invoice_number: invoiceNumber,
      invoice_date: dateStr,
      invoice_time: timeStr,
      party_id: selectedPartyId,
      party_name: selectedParty.name,
      party_gstin: selectedParty.gstin,
      doctor_name: doctorName,
      patient_name: patientName,
      items: lineItems,
      subtotal: calculations.grossTotal,
      discount_amount: calculations.totalDiscount,
      taxable_amount: calculations.taxableTotal,
      cgst_amount: calculations.cgstTotal,
      sgst_amount: calculations.sgstTotal,
      igst_amount: 0,
      round_off: calculations.roundOff,
      total_amount: calculations.totalPayable,
      total_cost: calculations.totalCost,
      profit_margin_amount: calculations.netProfitAmount,
      profit_margin_percent: calculations.netProfitPercent,
      payment_status: paymentMode === 'CREDIT' ? 'PENDING' : 'PAID',
      payment_mode: paymentMode,
      amount_received: paymentMode === 'CREDIT' ? 0 : calculations.totalPayable,
      upi_ref_id: upiRef,
      irn_number: 'e1074a38b376c99f02914102984920194819203912839182391',
      e_way_bill_no: '281920192841',
    });

    setCompletedInvoice(savedInvoice);
    setShowPrintModal(true);
    handleNewBill();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none">
      <Navbar onResetData={resetToDemoData} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-3">
        {/* Unified Invoice & POS Header Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
          {/* Top row: Invoice No, Date, Hotkey Actions, and Payment Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs uppercase tracking-wider font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 font-mono">
                #{invoiceNumber}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentDate}
              </span>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* Action shortcuts */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleNewBill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-sky-700 font-medium text-xs border border-slate-200 transition-colors"
                  title="New Bill (F1)"
                >
                  <kbd className="font-mono text-[10px] bg-white px-1 rounded border border-slate-300 text-slate-600 shadow-2xs">F1</kbd>
                  <span>New Bill</span>
                </button>

                <button
                  onClick={handleHoldBill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-amber-700 font-medium text-xs border border-slate-200 transition-colors"
                  title="Hold Bill (F7)"
                >
                  <kbd className="font-mono text-[10px] bg-white px-1 rounded border border-slate-300 text-slate-600 shadow-2xs">F7</kbd>
                  <span>Hold {heldBills.length > 0 ? `(${heldBills.length})` : ''}</span>
                </button>
              </div>

              {/* Held Bills Pills */}
              {heldBills.length > 0 && (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-800 text-[11px]">
                  <Pause className="w-3 h-3 text-amber-600" />
                  <span>Resume:</span>
                  {heldBills.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => handleResumeBill(h.id)}
                      className="underline hover:text-amber-900 font-mono font-bold"
                    >
                      ₹{h.total}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Mode Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 mr-1 hidden sm:inline">Payment:</span>
              {(['CASH', 'UPI', 'CARD', 'CREDIT'] as PaymentMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    paymentMode === mode
                      ? mode === 'UPI'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : mode === 'CREDIT'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Party and Doctor selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Customer Account */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium flex items-center justify-between">
                <span>Customer / Account (Alt+C):</span>
                {selectedParty && selectedParty.current_balance > 0 && (
                  <span className="text-amber-700 font-mono font-semibold">
                    Due: ₹{selectedParty.current_balance.toLocaleString('en-IN')}
                  </span>
                )}
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-sky-500 font-medium shadow-2xs"
              >
                {parties
                  .filter((p) => p.party_type === 'CUSTOMER')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.gstin ? `(GST: ${p.gstin.slice(0, 8)}...)` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Prescribing Doctor */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Prescribing Doctor / Hospital:</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. Name (Optional)"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            {/* Patient / Reference */}
            <div className="space-y-1">
              <label className="text-slate-600 font-medium">Patient / Reference Memo:</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient Name or Slip No."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Interactive Fast Entry Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-sky-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-sky-600" />
              <span>Fast Item Search (Brand Name OR Generic Salt Formula)</span>
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              Press <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.2 rounded font-mono text-slate-700">F3</kbd> to search
            </span>
          </div>

          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Type 'Augmentin', 'Amoxicillin', 'Dolo', 'Paracetamol', or scan barcode..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Live Typeahead Results Dropdown */}
            {isDropdownOpen && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No matching medicine found. Try searching by generic active ingredient (e.g. &quot;Amoxicillin&quot;, &quot;Pantoprazole&quot;).
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const hasStock = item.totalStock > 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5 max-w-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-mono border border-slate-200">
                              {item.item_code}
                            </span>
                            <span className="text-slate-500">({item.manufacturer})</span>
                          </div>
                          <div className="text-[11px] text-sky-700 font-medium flex items-center gap-1">
                            <Pill className="w-3 h-3 flex-shrink-0" />
                            <span>{item.salt_composition}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Pack: {item.pack_size} • GST: {item.tax_rate}%
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 flex items-center gap-3">
                          <div>
                            <div className={`font-bold font-mono ${hasStock ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {hasStock ? `${item.totalStock} ${item.unit}s in Stock` : 'Out of Stock'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.batches.length} batch(es) registered
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubstituteItem(item);
                              setIsDropdownOpen(false);
                            }}
                            className="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                            title="Find other brands with same active molecule"
                          >
                            <Sparkles className="w-3 h-3 text-sky-600" />
                            <span>Substitute</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Active Row Entry Details (Once medicine is chosen) */}
          {selectedItem && selectedBatch && (
            <div className="bg-sky-50/50 p-3 rounded-lg border border-sky-200 mt-2 space-y-2 animate-in fade-in duration-100">
              <div className="flex flex-wrap items-center justify-between text-xs border-b border-sky-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{selectedItem.name}</span>
                  <span className="text-slate-500">({selectedItem.manufacturer})</span>
                  <span className="text-sky-800 font-medium">[{selectedItem.salt_composition}]</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubstituteItem(selectedItem)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Check Other Brands (Substitutes)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                {/* Batch Selector */}
                <div className="space-y-1">
                  <label className="text-slate-600 font-medium">Batch (FEFO):</label>
                  <select
                    value={selectedBatch.id}
                    onChange={(e) => {
                      const b = batches.find((x) => x.id === e.target.value);
                      if (b) {
                        setSelectedBatch(b);
                        setCustomRate(b.sale_rate);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono shadow-2xs"
                  >
                    {batches
                      .filter((b) => b.item_id === selectedItem.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batch_number} (Exp: {b.expiry_date} | Qty: {b.quantity_available})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-slate-600 font-medium">Qty ({selectedItem.unit}):</label>
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLineItem();
                    }}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono font-bold text-sky-700 shadow-2xs"
                  />
                </div>

                {/* Free Quantity */}
                <div className="space-y-1">
                  <label className="text-slate-600 font-medium">Free Qty (Scheme):</label>
                  <input
                    type="number"
                    min="0"
                    value={freeQuantity}
                    onChange={(e) => setFreeQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLineItem();
                    }}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono shadow-2xs"
                  />
                </div>

                {/* Selling Rate */}
                <div className="space-y-1">
                  <label className="text-slate-600 font-medium">
                    Rate (MRP: ₹{selectedBatch.mrp}):
                  </label>
                  <input
                    ref={rateInputRef}
                    type="number"
                    step="0.01"
                    value={customRate}
                    onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLineItem();
                    }}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono shadow-2xs"
                  />
                </div>

                {/* Discount % */}
                <div className="space-y-1">
                  <label className="text-slate-600 font-medium">Disc %:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLineItem();
                    }}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono shadow-2xs"
                  />
                </div>

                {/* Add Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleAddLineItem}
                    className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add [Enter]</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Batch</th>
                  <th className="py-2.5 px-3 text-center">Expiry</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Free</th>
                  <th className="py-2.5 px-3 text-right">MRP</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Disc%</th>
                  <th className="py-2.5 px-3 text-right">GST%</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-sans">
                      <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">Bill cart is empty. Type a medicine name or molecule above to begin billing.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Shortcuts: F1 New Bill | F3 Search | F7 Hold Bill | F10 Save & Print</p>
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {item.item_name}
                          <button
                            type="button"
                            onClick={() => {
                              const itm = items.find((x) => x.id === item.item_id);
                              if (itm) setSubstituteItem(itm);
                            }}
                            className="text-[10px] text-sky-600 hover:text-sky-700 ml-1 font-mono font-normal"
                            title="Find substitutes for this medicine"
                          >
                            [Sub]
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.salt_composition}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-medium">{item.batch_number}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.expiry_date}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-sky-700">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{item.free_quantity || 0}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">₹{item.mrp.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">₹{item.rate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{item.tax_rate}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{item.total_amount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove item"
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

        {/* Live Calculation & Margin Feedback Footer */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          {/* Top row: Breakdown items */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs border-b border-slate-200 pb-3 text-slate-600">
            <div>
              <span className="block text-[11px] text-slate-500">Gross Amount:</span>
              <span className="font-mono text-slate-900 font-semibold text-sm">
                ₹{calculations.grossTotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">Total Discount:</span>
              <span className="font-mono text-emerald-700 font-semibold text-sm">
                - ₹{calculations.totalDiscount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">Taxable Value:</span>
              <span className="font-mono text-slate-900 font-semibold text-sm">
                ₹{calculations.taxableTotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">CGST (6%):</span>
              <span className="font-mono text-slate-800 font-semibold text-sm">
                + ₹{calculations.cgstTotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">SGST (6%):</span>
              <span className="font-mono text-slate-800 font-semibold text-sm">
                + ₹{calculations.sgstTotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">Round Off:</span>
              <span className="font-mono text-slate-600 font-semibold text-sm">
                {calculations.roundOff >= 0 ? `+ ₹${calculations.roundOff.toFixed(2)}` : `- ₹${Math.abs(calculations.roundOff).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Bottom row: Profit Feedback + Total Payable + Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Live Profit Margin Feedback Widget */}
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border ${
                calculations.netProfitPercent >= 12
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : calculations.netProfitPercent >= 8
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Net Profit on this Bill:</span>
                </div>
                <div className="font-mono text-sm font-bold mt-0.5 text-slate-900">
                  ₹{calculations.netProfitAmount.toFixed(2)} ({calculations.netProfitPercent.toFixed(1)}%)
                </div>
                {calculations.netProfitPercent < 8 && calculations.taxableTotal > 0 && (
                  <div className="text-[10px] text-amber-700 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Low margin alert: below standard 8% threshold</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 hidden lg:block">
                <div>Items: <strong className="text-slate-800">{lineItems.length}</strong></div>
                <div>Units Sold: <strong className="text-slate-800">{lineItems.reduce((acc, i) => acc + i.quantity + i.free_quantity, 0)}</strong></div>
              </div>
            </div>

            {/* Total Payable & Save/Print Actions */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Payable</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
                  ₹{calculations.totalPayable.toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {paymentMode === 'UPI' && (
                  <button
                    onClick={() => {
                      if (lineItems.length === 0) {
                        alert('Add items first');
                        return;
                      }
                      setShowUpiModal(true);
                    }}
                    className="px-3.5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="hidden sm:inline">Dynamic UPI QR</span>
                  </button>
                )}

                <button
                  onClick={handleSaveBill}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>SAVE & PRINT (Ctrl+S)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Smart Substitute Finder Modal */}
      {substituteItem && (
        <SubstituteFinderModal
          baseItem={substituteItem}
          substitutes={findSubstitutes(substituteItem.id)}
          onSelectSubstitute={(chosenItem, chosenBatch) => {
            setSelectedItem(chosenItem);
            setSelectedBatch(chosenBatch);
            setCustomRate(chosenBatch.sale_rate);
            setQuantity(1);
            setFreeQuantity(0);
            setDiscountPercent(0);
            setTimeout(() => qtyInputRef.current?.focus(), 50);
          }}
          onClose={() => setSubstituteItem(null)}
        />
      )}

      {/* Dynamic UPI Modal */}
      {showUpiModal && (
        <UpiQrModal
          amount={calculations.totalPayable}
          invoiceNumber={invoiceNumber}
          customerName={selectedParty.name}
          onPaymentConfirmed={(upiRef) => {
            setShowUpiModal(false);
            finalizeInvoice(upiRef);
          }}
          onClose={() => setShowUpiModal(false)}
        />
      )}

      {/* Printable Invoice Modal */}
      {showPrintModal && completedInvoice && (
        <InvoicePrintModal
          invoice={completedInvoice}
          tenant={tenant}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
