'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Building2, 
  Receipt, 
  Boxes, 
  ShoppingBag, 
  AlertTriangle, 
  Users, 
  BarChart3, 
  Search, 
  Volume2, 
  VolumeX, 
  Database,
  RefreshCw,
  LayoutDashboard,
  Trash2
} from 'lucide-react';
import { sounds } from '@/lib/audio';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useERPStore } from '@/lib/store';
import { SupabaseModal } from './SupabaseModal';
import { CommandPalette } from './CommandPalette';

interface NavbarProps {
  onResetData?: () => void;
}

export function Navbar({ onResetData }: NavbarProps) {
  const pathname = usePathname();
  const { currentUser, logout, clearAllData, resetToDemoData } = useERPStore();
  const [mounted, setMounted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showDbModal, setShowDbModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    sounds.enabled = nextState;
    if (nextState) sounds.playScan();
  };

  const navLinks = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/billing', label: 'Billing POS', icon: Receipt },
    { href: '/inventory', label: 'Inventory & Stock', icon: Boxes },
    { href: '/purchases', label: 'Purchases (GRN)', icon: ShoppingBag },
    { href: '/expiry', label: 'Expiry Radar', icon: AlertTriangle, badge: 'Alert' },
    { href: '/parties', label: 'Accounts & Ledgers', icon: Users },
    { href: '/reports', label: 'Reports & GST', icon: BarChart3 },
  ];

  return (
    <>
      <header className="bg-white text-slate-800 border-b border-slate-200 sticky top-0 z-40 select-none shadow-xs">
        {/* Top Mini-Bar */}
        <div className="border-b border-slate-100 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 py-1.5 text-xs flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Branch 01: Central Wholesale</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="hidden sm:inline text-slate-500">DL: 20B/21B-MH-492102</span>
              <span className="text-slate-300 hidden md:inline">•</span>
              <span className="hidden md:inline text-slate-500 font-mono text-[11px]">GSTIN: 27AABCR8941N1Z5</span>
              {mounted && currentUser && (
                <>
                  <span className="text-slate-300 hidden lg:inline">•</span>
                  <span className="hidden lg:inline text-slate-500 font-mono text-[11px]">
                    Operator: {currentUser.phone}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowDbModal(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
                  isSupabaseConfigured 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs'
                }`}
                title="Supabase Database Configuration"
              >
                <Database className={`w-3 h-3 ${isSupabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>{isSupabaseConfigured ? 'Supabase Connected' : 'Local-First'}</span>
              </button>

              <button
                onClick={toggleAudio}
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                title={audioEnabled ? 'Mute Sound' : 'Enable Sound'}
              >
                {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-sky-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              <button
                onClick={() => {
                  if (confirm('Delete / Wipe all inventory, batches, parties and invoice records? This will give you a fresh empty database.')) {
                    clearAllData();
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                title="Wipe / Delete all records (Fresh start)"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                <span className="hidden md:inline">Delete All</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset to initial pharma demo records?')) {
                    if (onResetData) onResetData();
                    else resetToDemoData();
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                title="Reset demo data"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden md:inline">Reset Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Navigation Row */}
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                <span>AMB</span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-200">
                  MedERP
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-none">Pharma Suite</div>
            </div>
          </Link>

          {/* Horizontal Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center overflow-x-auto py-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold border border-sky-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Search & Auth Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs text-slate-600 hover:text-slate-900 transition-all shadow-2xs"
              title="Search medicines or navigate (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline text-slate-500">Search medicine...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
                Ctrl K
              </kbd>
            </button>

            {mounted && currentUser ? (
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 transition-all shadow-2xs group"
                  title={`Logged in as ${currentUser.name} (${currentUser.phone})`}
                >
                  <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.name.slice(0, 1)}
                  </div>
                  <span className="hidden md:inline font-semibold text-slate-800 truncate max-w-[100px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                    {currentUser.role}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    if (confirm('Log out from current terminal session?')) {
                      logout();
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Logout / Switch Cashier"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : mounted ? (
              <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                <Link
                  href="/login"
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-2xs transition-all"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-block px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-all"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="w-24 h-7 pl-1 border-l border-slate-200 flex items-center gap-1 opacity-0">
                <div className="px-2.5 py-1.5 text-xs">Sign in</div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex overflow-x-auto px-3 py-1.5 bg-slate-50 border-t border-slate-200 gap-1.5 scrollbar-none">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
                  isActive ? 'bg-sky-50 text-sky-700 font-semibold border border-sky-200' : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Supabase DDL & Configuration Modal */}
      {showDbModal && <SupabaseModal onClose={() => setShowDbModal(false)} />}

      {/* Ctrl + K Universal Command Palette */}
      {showCommandPalette && <CommandPalette onClose={() => setShowCommandPalette(false)} />}
    </>
  );
}
