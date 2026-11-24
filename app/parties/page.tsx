'use client';

import { useState } from 'react';
import { 
  Users, Plus, Search, Phone, Mail, Building, 
  CreditCard, CheckCircle2, FileText, ArrowUpRight, ArrowDownLeft, Trash2 
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useERPStore } from '@/lib/store';
import { Party, PartyType } from '@/types/erp';
import { sounds } from '@/lib/audio';

export default function PartiesPage() {
  const { parties, addParty, deleteParty, resetToDemoData } = useERPStore();
  const [activeTab, setActiveTab] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [search, setSearch] = useState('');

  // Add party modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [partyType, setPartyType] = useState<PartyType>('CUSTOMER');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState(100000);
  const [creditDays, setCreditDays] = useState(30);

  // Filtered parties
  const filtered = parties.filter((p) => {
    if (activeTab !== 'ALL' && p.party_type !== activeTab) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.gstin && p.gstin.toLowerCase().includes(q))
    );
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Please fill Name and Phone');
      return;
    }

    addParty({
      party_type: partyType,
      name,
      phone,
      email,
      gstin,
      drug_license_no: dlNumber,
      address,
      credit_limit: creditLimit,
      credit_days: creditDays,
      current_balance: 0,
      is_active: true,
    });

    sounds.playSave();
    setShowAddModal(false);
    setName('');
    setPhone('');
    setEmail('');
    setGstin('');
    setDlNumber('');
    setAddress('');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col md:flex-row font-sans select-none">
      <Sidebar onResetData={resetToDemoData} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <span>Customer & Supplier Ledgers</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Wholesale Clients, Hospital Accounts, C&F Depots & Credit Control
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Account</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone, or GSTIN..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 text-xs font-medium shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-between bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            {(
              [
                { id: 'ALL', label: 'All Accounts' },
                { id: 'CUSTOMER', label: 'Customers (B2B/B2C)' },
                { id: 'SUPPLIER', label: 'Suppliers & Depots' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1 px-2 text-center text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parties List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((party) => {
            const isCustomer = party.party_type === 'CUSTOMER';

            return (
              <div
                key={party.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                      isCustomer ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {party.party_type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{party.name}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Current Balance</span>
                    <span className={`font-mono text-base font-bold ${
                      party.current_balance > 0 ? (isCustomer ? 'text-amber-700' : 'text-purple-700') : 'text-slate-500'
                    }`}>
                      ₹{party.current_balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{party.phone}</span>
                  </div>
                  {party.gstin && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-500 font-sans">GSTIN:</span>
                      <span className="text-slate-800">{party.gstin}</span>
                    </div>
                  )}
                  {party.drug_license_no && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-500 font-sans">D.L.:</span>
                      <span className="text-slate-800">{party.drug_license_no}</span>
                    </div>
                  )}
                  {party.address && (
                    <div className="text-[11px] text-slate-500 truncate">{party.address}</div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500">
                    Credit: <strong className="text-slate-800">₹{party.credit_limit.toLocaleString('en-IN')}</strong> ({party.credit_days} days)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Opening ledger statement for ${party.name}`)}
                      className="text-sky-700 hover:text-sky-800 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <span>View Ledger</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete account "${party.name}"? This cannot be undone.`)) deleteParty(party.id); }}
                      className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </main>
      </div>

      {/* Add Party Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create Customer / Supplier Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Account Type</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as PartyType)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  >
                    <option value="CUSTOMER">Customer (Pharmacy / Clinic)</option>
                    <option value="SUPPLIER">Supplier (Distributor / C&F)</option>
                    <option value="DOCTOR">Referring Doctor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Business / Party Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. LifeCare Pharmacy"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="accounts@example.com"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCM..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Drug License No (DL No)</label>
                  <input
                    type="text"
                    value={dlNumber}
                    onChange={(e) => setDlNumber(e.target.value)}
                    placeholder="20B/21B..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Billing Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Area, City, Pin Code"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 shadow-2xs focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Credit Days</label>
                  <input
                    type="number"
                    value={creditDays}
                    onChange={(e) => setCreditDays(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono shadow-2xs focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
