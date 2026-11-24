'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Check, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  CreditCard, 
  KeyRound, 
  BadgeCheck, 
  Clock, 
  Boxes, 
  Receipt, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useERPStore } from '@/lib/store';
import { SubscriptionTier } from '@/types/erp';
import { sounds } from '@/lib/audio';

export default function SubscriptionPage() {
  const router = useRouter();
  const { currentUser, subscription, activateSubscription } = useERPStore();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(subscription.tier || 'ENTERPRISE');
  const [customKey, setCustomKey] = useState('');
  const [keySuccess, setKeySuccess] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleSelectPlan = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    activateSubscription(tier);
  };

  const handleApplyLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKey.trim()) return;
    setIsActivating(true);
    setTimeout(() => {
      activateSubscription('ENTERPRISE', customKey.trim().toUpperCase());
      setKeySuccess(true);
      setIsActivating(false);
      sounds.playSave();
    }, 400);
  };

  const handleEnterDashboard = () => {
    sounds.playSave();
    router.push('/');
  };

  const plans = [
    {
      tier: 'STARTER' as SubscriptionTier,
      name: 'Starter Retail',
      price: 999,
      period: '/ month',
      description: 'Ideal for independent single-counter pharmacies & local clinics.',
      popular: false,
      features: [
        'Single billing counter terminal',
        'Up to 1,500 sales bills / month',
        'Standard batch FEFO expiry alerts',
        'CDSCO Schedule H / H1 drug warnings',
        'Local offline database caching',
        'Email technical support',
      ],
    },
    {
      tier: 'PROFESSIONAL' as SubscriptionTier,
      name: 'Professional Pharmacy',
      price: 1999,
      period: '/ month',
      description: 'Built for high-volume retail chemists & busy hospital dispensaries.',
      popular: true,
      features: [
        'Up to 3 simultaneous POS billing counters',
        'Unlimited sales bills & customer ledgers',
        'Dynamic instant UPI QR on thermal receipts',
        'Real-time automated substitute medicine finder',
        'GSTR-1 tax intelligence & financial ledgers',
        'Automated daily cloud backup',
      ],
    },
    {
      tier: 'ENTERPRISE' as SubscriptionTier,
      name: 'Enterprise Cloud Chain',
      price: 3499,
      period: '/ month',
      description: 'Full-scale wholesale distribution, hospital chains & pharma depots.',
      popular: false,
      badge: 'Current License',
      features: [
        'Unlimited billing terminals & branch users',
        'AI Inward Purchase Ingestion (OCR)',
        'Full Supabase PostgreSQL cloud sync',
        'Multi-depot & C&F supplier ledger management',
        'Automated regulatory compliance audit logs',
        '24/7 dedicated account manager & telephone SLA',
      ],
    },
  ];

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
                Enterprise Commercial Licensing
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 border-r border-slate-200 pr-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-900">{currentUser.name}</span>
                <span className="text-slate-400 font-mono">({currentUser.phone})</span>
              </div>
            )}
            <button
              onClick={handleEnterDashboard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
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
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Commercial Paid Product • Enterprise Licensing Active</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Subscription & License Plans
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Select your software tier or confirm your active enterprise subscription license to continue into the full AMB MedERP Hub.
          </p>
        </div>

        {/* Current License Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900">{subscription.planName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  {subscription.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2 font-mono">
                <span>License Key: <strong className="text-slate-700">{subscription.licenseKey}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Valid Until: <strong className="text-slate-700">{subscription.validUntil}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={handleEnterDashboard}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <span>Proceed to Dashboard (F1)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isSelected = selectedTier === p.tier;
            return (
              <div
                key={p.tier}
                onClick={() => handleSelectPlan(p.tier)}
                className={`cursor-pointer relative bg-white rounded-2xl p-6 flex flex-col justify-between transition-all border-2 ${
                  isSelected
                    ? 'border-indigo-600 shadow-md ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs">
                    Most Popular
                  </div>
                )}
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs">
                    {p.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{p.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 font-mono">₹{p.price.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-500 font-medium">{p.period}</span>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(p.tier);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ Plan Selected' : `Select ${p.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* License Key Activation Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <KeyRound className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Custom Enterprise License Key</h4>
              <p className="text-xs text-slate-500">Have an offline commercial activation key from Mobintix Infotech?</p>
            </div>
          </div>

          <form onSubmit={handleApplyLicense} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="e.g. AMB-ENT-2026-9482-MH"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs uppercase text-slate-900 focus:bg-white focus:outline-indigo-600"
            />
            <button
              type="submit"
              disabled={isActivating || !customKey.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isActivating ? 'Verifying...' : 'Activate License'}</span>
            </button>
          </form>

          {keySuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>License key successfully applied! Enterprise Cloud edition activated.</span>
            </div>
          )}
        </div>

        {/* Bottom Final CTA */}
        <div className="text-center pt-4 pb-8">
          <button
            onClick={handleEnterDashboard}
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Proceed to AMB MedERP Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="text-[11px] text-slate-400 mt-2">
            Protected by CDSCO Drug License Compliance & 256-Bit SSL Encryption
          </div>
        </div>
      </main>
    </div>
  );
}
