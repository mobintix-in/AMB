'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Receipt, 
  Boxes, 
  ShoppingBag, 
  AlertTriangle, 
  Users, 
  BarChart3, 
  Pill, 
  ArrowRight,
  Database,
  Building2
} from 'lucide-react';
import { useERPStore } from '@/lib/store';
import { sounds } from '@/lib/audio';

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, parties, batches } = useERPStore();

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const q = query.toLowerCase().trim();

  // Navigation targets
  const quickActions = [
    { title: 'New Sales Bill (POS)', category: 'Actions', shortcut: 'F1', href: '/billing', icon: Receipt },
    { title: 'Inward Purchase Entry (GRN)', category: 'Actions', shortcut: 'F2', href: '/purchases', icon: ShoppingBag },
    { title: 'Medicine Master & Batches', category: 'Actions', shortcut: 'F3', href: '/inventory', icon: Boxes },
    { title: 'Expiry Radar & Risk Tracking', category: 'Actions', shortcut: 'F5', href: '/expiry', icon: AlertTriangle },
    { title: 'Customer & Supplier Accounts', category: 'Actions', shortcut: 'F4', href: '/parties', icon: Users },
    { title: 'Sales Analytics & GST Reports', category: 'Actions', shortcut: 'F6', href: '/reports', icon: BarChart3 },
    { title: 'Staff Login (Mobile & OTP)', category: 'Account', shortcut: 'Alt+L', href: '/login', icon: Users },
    { title: 'Register Pharmacy / Chemist Store', category: 'Account', shortcut: 'Alt+R', href: '/register', icon: Building2 },
    { title: 'Pharmacy Profile & Drug License', category: 'Account', shortcut: 'Alt+P', href: '/', icon: Building2 },
  ];

  const matchedActions = quickActions.filter(a => a.title.toLowerCase().includes(q));

  // Matched items / medicines
  const matchedItems = q
    ? items.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.salt_composition.toLowerCase().includes(q) || 
        i.item_code.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  // Matched parties / ledgers
  const matchedParties = q
    ? parties.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.phone.includes(q) || 
        (p.gstin && p.gstin.toLowerCase().includes(q))
      ).slice(0, 3)
    : [];

  const handleSelect = (href: string) => {
    sounds.playScan();
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-sky-600 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a medicine name, molecule (e.g. Paracetamol), customer ledger, or action..."
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none font-medium"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white text-slate-500 border border-slate-200 rounded shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Search Results list */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-4 text-xs">
          {/* Quick Actions */}
          {matchedActions.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                Navigation & Shortcuts
              </div>
              <div className="space-y-1">
                {matchedActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.title}
                      onClick={() => handleSelect(action.href)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-sky-600 text-sky-600 group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-800">{action.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
                            {action.shortcut}
                          </kbd>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Medicines / Salts */}
          {matchedItems.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                Medicines & Active Salts
              </div>
              <div className="space-y-1">
                {matchedItems.map((itm) => {
                  const itmBatches = batches.filter(b => b.item_id === itm.id);
                  const totalStock = itmBatches.reduce((sum, b) => sum + b.quantity_available, 0);

                  return (
                    <button
                      key={itm.id}
                      onClick={() => handleSelect(`/inventory?search=${encodeURIComponent(itm.brand_name)}`)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {itm.name}
                            <span className="text-[10px] font-normal text-slate-500">({itm.manufacturer})</span>
                          </div>
                          <div className="text-[11px] text-sky-700 truncate">{itm.salt_composition}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        <div>
                          <div className="font-mono text-emerald-700 font-bold">{totalStock} in stock</div>
                          <div className="text-[10px] text-slate-400">{itm.unit}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parties / Ledgers */}
          {matchedParties.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                Customer & Supplier Ledgers
              </div>
              <div className="space-y-1">
                {matchedParties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => handleSelect(`/parties?search=${encodeURIComponent(party.name)}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-slate-900">{party.name}</div>
                        <div className="text-[11px] text-slate-500">{party.party_type} • {party.phone}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-amber-700 font-bold">₹{party.current_balance.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400">Balance</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && matchedActions.length === 0 && matchedItems.length === 0 && matchedParties.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              No results found for &quot;{query}&quot;. Try searching for &quot;Augmentin&quot;, &quot;Paracetamol&quot;, or &quot;Apollo&quot;.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-700 shadow-2xs">F1</kbd> to launch high-speed billing</span>
          <span>Dual Input: Keyboard + Mouse</span>
        </div>
      </div>
    </div>
  );
}
