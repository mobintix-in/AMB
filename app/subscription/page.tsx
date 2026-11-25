'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useERPStore } from '@/lib/store';
import { SubscriptionTier } from '@/types/erp';
import { sounds } from '@/lib/audio';

interface LivePackage {
  id: string;
  tier: SubscriptionTier;
  name: string;
  code: string;
  price: number;
  yearlyPrice: number;
  terminals: string;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
}

function mapCodeToTier(code: string, name: string): SubscriptionTier {
  const upper = `${code} ${name}`.toUpperCase();
  if (upper.includes('ENT') || upper.includes('LIFETIME')) return 'ENTERPRISE';
  if (upper.includes('PRO') || upper.includes('YEAR')) return 'PROFESSIONAL';
  return 'STARTER';
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { currentUser, subscription, syncWithSupabase, isSyncing } = useERPStore();
  const [livePlans, setLivePlans] = useState<LivePackage[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const loadSubscriptionData = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const [pkgRes] = await Promise.all([
        fetch('/api/subscription'),
        syncWithSupabase(),
      ]);
      const json = await pkgRes.json();
      if (json.success && Array.isArray(json.packages)) {
        const mapped: LivePackage[] = json.packages
          .filter((p: any) => p.status !== 'Archived')
          .map((p: any) => ({
            id: p.id,
            tier: mapCodeToTier(p.code || '', p.name || ''),
            name: p.name,
            code: p.code || '',
            price: Number(p.monthlyPrice ?? 999),
            yearlyPrice: Number(p.yearlyPrice ?? 9999),
            terminals: p.terminals || '1 Counter Terminal',
            period: '/ month',
            description: p.description || '',
            popular: Boolean(p.popular),
            features: Array.isArray(p.features) ? p.features : [],
          }));
        setLivePlans(mapped);
      }
    } catch (err) {
      console.warn('Failed to fetch packages from Supabase:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [syncWithSupabase]);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const isPlanActive = subscription?.status !== 'EXPIRED' && Boolean(subscription?.isPaid);

  const handleEnterDashboard = () => {
    if (!isPlanActive) return;
    sounds.playSave();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                AMB <span className="text-indigo-600">MedERP</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1 leading-none">
                Commercial License Status
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 border-r border-slate-200 pr-3">
                <span className={`w-2 h-2 rounded-full ${isPlanActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-semibold text-slate-900">{currentUser.name}</span>
                <span className="text-slate-400 font-mono">({currentUser.phone})</span>
              </div>
            )}
            <button
              onClick={loadSubscriptionData}
              disabled={isSyncing || loadingPlans}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs shadow-2xs transition-all"
              title="Refresh plan assigned by Admin Console"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || loadingPlans ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>Sync Plan</span>
            </button>
            <button
              onClick={handleEnterDashboard}
              disabled={!isPlanActive}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition-all"
            >
              <span>Enter Main Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Admin-Managed Licensing • Live Supabase Sync</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Subscription &amp; License Plan
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your active package and expiry are assigned and managed directly from the AMB Admin Console.
          </p>
        </div>

        {/* Inactive / Revoked Warning */}
        {!isPlanActive && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3 max-w-3xl mx-auto">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <div className="font-bold">No Active Commercial Package Assigned</div>
              <div className="text-amber-700 mt-0.5">
                Please ask your AMB Administrator to assign or activate a subscription package for your account in the Admin Console, then click <strong>Sync Plan</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Current License Status Card (Read directly from Supabase) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
              isPlanActive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900">{subscription.planName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${
                  isPlanActive
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {isPlanActive ? 'ACTIVE' : 'NO PLAN'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2 font-mono">
                <span>UTR / Ref: <strong className="text-slate-700">{subscription.licenseKey}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Valid Until: <strong className="text-slate-700">{subscription.validUntil}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={handleEnterDashboard}
            disabled={!isPlanActive}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition-all"
          >
            <span>Proceed to Dashboard (F1)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live Pricing Cards from Supabase (Read-Only View) */}
        <div className={`grid grid-cols-1 ${livePlans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'} gap-6`}>
          {loadingPlans && livePlans.length === 0 ? (
            <div className="col-span-full text-center py-8 text-xs text-slate-400">
              Loading commercial packages from Supabase...
            </div>
          ) : livePlans.length === 0 ? (
            <div className="col-span-full text-center py-8 text-xs text-slate-400">
              No commercial packages configured in Supabase yet.
            </div>
          ) : (
            livePlans.map((p) => {
              const isAssigned =
                isPlanActive &&
                subscription.planName.trim().toLowerCase() === p.name.trim().toLowerCase();
              return (
                <div
                  key={p.id}
                  className={`relative bg-white rounded-2xl p-6 flex flex-col justify-between transition-all border-2 ${
                    isAssigned
                      ? 'border-indigo-600 shadow-md ring-2 ring-indigo-100'
                      : 'border-slate-200 shadow-xs opacity-90'
                  }`}
                >
                  {p.popular && !isAssigned && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs">
                      Popular
                    </div>
                  )}
                  {isAssigned && (
                    <div className="absolute -top-3 right-5 px-3 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs">
                      Current License
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                      {isAssigned && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{p.description}</p>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 font-mono">
                          ₹{p.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{p.period}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        or ₹{p.yearlyPrice.toLocaleString('en-IN')} billed annually • {p.terminals}
                      </div>
                    </div>

                    <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                      {p.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    {isAssigned ? (
                      <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white text-center shadow-xs flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Active Assigned Package</span>
                      </div>
                    ) : (
                      <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500 text-center flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Assigned by Admin Console</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-4 pb-8">
          <button
            onClick={handleEnterDashboard}
            disabled={!isPlanActive}
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md transition-all"
          >
            <span>Proceed to AMB MedERP Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="text-[11px] text-slate-400 mt-2">
            Package upgrades and renewals are managed exclusively in the AMB Admin Console
          </div>
        </div>
      </main>
    </div>
  );
}
