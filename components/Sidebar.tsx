"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  LayoutDashboard,
  Plus,
  LogOut,
  Menu,
  X,
  CreditCard,
  UserCircle,
} from "lucide-react";
import { sounds } from "@/lib/audio";
import { useERPStore } from "@/lib/store";
import { CommandPalette } from "./CommandPalette";

interface SidebarProps {
  onResetData?: () => void;
}

export function Sidebar({ onResetData }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, tenant, isLoaded, cloudSynced, subscription, logout } = useERPStore();
  const [mounted, setMounted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSubscriptionBlocked = Boolean(
    currentUser &&
      cloudSynced &&
      (!subscription || subscription.status === 'EXPIRED' || !subscription.isPaid)
  );

  // Commercial App Auth & Subscription Gate
  useEffect(() => {
    if (!mounted || !isLoaded) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if ((cloudSynced || subscription?.status === 'EXPIRED') && (!subscription || subscription.status === 'EXPIRED' || !subscription.isPaid) && pathname !== '/subscription') {
      router.replace("/subscription");
    }
  }, [mounted, isLoaded, cloudSynced, currentUser, subscription, pathname, router]);

  const toggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    sounds.enabled = nextState;
    if (nextState) sounds.playScan();
  };

  const navLinks = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/billing", label: "Billing POS", icon: Receipt },
    { href: "/inventory", label: "Inventory & Stock", icon: Boxes },
    { href: "/purchases", label: "Purchases (GRN)", icon: ShoppingBag },
    {
      href: "/expiry",
      label: "Expiry Radar",
      icon: AlertTriangle,
      badge: "Alert",
    },
    { href: "/parties", label: "Accounts & Ledgers", icon: Users },
    { href: "/reports", label: "Reports & GST", icon: BarChart3 },
    { href: "/profile", label: "Business Profile", icon: UserCircle },
  ];

  return (
    <>
      {/* Full-Screen Subscription / Auth Lock Overlay */}
      {mounted && isLoaded && (!currentUser || isSubscriptionBlocked) && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900">
                {!currentUser ? 'Authentication Required' : 'Subscription Required or Expired'}
              </h2>
              <p className="text-xs text-slate-500">
                {!currentUser
                  ? 'Redirecting to terminal sign-in...'
                  : `Your plan (${subscription?.planName || 'No Plan'}) is inactive or expired. Please contact your AMB Administrator to activate your license.`}
              </p>
            </div>
            <Link
              href={!currentUser ? '/login' : '/subscription'}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              {!currentUser ? 'Go to Login' : 'View Subscription Status'}
            </Link>
          </div>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 sticky top-0 z-40 select-none">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              AMB <span className="text-indigo-600">MedERP</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-none">
              Enterprise Edition
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            title="Search medicines (Ctrl + K)"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            title="Toggle Menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar (Desktop Fixed Sticky & Mobile Slide-Out) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between select-none transition-transform duration-200 ease-out md:translate-x-0 ${
          mobileOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top: Logo, Primary Action Button & Navigation Links */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Logo Header */}
          <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 group"
              onClick={() => setMobileOpen(false)}
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                  <span>AMB</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                    MedERP
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1 leading-none">
                  Enterprise Edition
                </div>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Button (Modeled after InvoicePro '+ New Invoice') */}
          <div className="p-3 pb-2">
            <Link
              href="/billing"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-sm transition-all hover:shadow active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Sales Bill (F1)</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                    />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Search, Audio Toggle & User Profile */}
        <div className="border-t border-slate-100 bg-white">
          {/* Quick Search & Audio Controls */}
          <div className="p-3 pb-2 space-y-2">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-600 hover:text-slate-900 transition-all shadow-2xs"
              title="Search medicines or navigate (Ctrl + K)"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Search medicine...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
                Ctrl K
              </kbd>
            </button>

            <div className="flex items-center justify-between px-3 py-1 text-xs text-slate-600">
              <span className="text-[11px] font-medium text-slate-500">
                Terminal Audio
              </span>
              <button
                onClick={toggleAudio}
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title={
                  audioEnabled ? "Mute Terminal Audio" : "Enable Terminal Audio"
                }
              >
                {audioEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* User Account & Sign Out (Matching InvoicePro footer) */}
          <div className="p-3 bg-slate-50/70 border-t border-slate-100">
            {mounted && currentUser ? (
              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 rounded-xl p-1 -m-1 hover:bg-slate-100/90 transition-colors"
                  title="Open User & Business Profile"
                >
                  {tenant?.logo_url || currentUser.logo_url ? (
                    <img
                      src={tenant?.logo_url || currentUser.logo_url}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white flex-shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500 truncate font-mono">
                        {currentUser.phone || currentUser.email || "Pharmacist"}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono tracking-wide truncate max-w-[100px] ${
                          subscription?.status === "EXPIRED"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {subscription?.status === "EXPIRED"
                          ? "NO PLAN"
                          : subscription?.tier || "STARTER"}
                      </span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Log out from current terminal session?")) {
                      logout();
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : mounted ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex-1 py-1.5 text-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="flex-1 py-1.5 text-center rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-all"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="h-8" />
            )}
          </div>
        </div>
      </aside>

      {/* Ctrl + K Universal Command Palette */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
    </>
  );
}

// Re-export Navbar for backwards compatibility
export const Navbar = Sidebar;
export default Sidebar;
