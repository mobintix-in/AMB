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
  LayoutDashboard
} from 'lucide-react';
import { sounds } from '@/lib/audio';
import { useERPStore } from '@/lib/store';
import { CommandPalette } from './CommandPalette';

interface NavbarProps {
  onResetData?: () => void;
}

export function Navbar({ onResetData }: NavbarProps) {
  const pathname = usePathname();
  const { currentUser, logout } = useERPStore();
  const [mounted, setMounted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
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
              <div className="text-[10px] text-slate-500 mt-0.5 leading-none">Enterprise Edition</div>
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
              onClick={toggleAudio}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={audioEnabled ? 'Mute Terminal Audio' : 'Enable Terminal Audio'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-sky-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

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

      {/* Ctrl + K Universal Command Palette */}
      {showCommandPalette && <CommandPalette onClose={() => setShowCommandPalette(false)} />}
    </>
  );
}
