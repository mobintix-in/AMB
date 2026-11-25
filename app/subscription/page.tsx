'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  LogOut,
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
}

function mapCodeToTier(code: string, name: string): SubscriptionTier {
  const upper = `${code} ${name}`.toUpperCase();
  if (upper.includes('ENT') || upper.includes('LIFETIME')) return 'ENTERPRISE';
  if (upper.includes('PRO') || upper.includes('YEAR')) return 'PROFESSIONAL';
  return 'STARTER';
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { currentUser, tenant, subscription, isLoaded, syncWithSupabase, logout, isSyncing } = useERPStore();
  const [livePlans, setLivePlans] = useState<LivePackage[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [payDuration, setPayDuration] = useState<'1 month' | '1 year'>('1 month');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<{ upiId: string; payeeName: string }>({
    upiId: '9409862204@kotakbank',
    payeeName: 'Mobintix Infotech',
  });

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
            yearlyPrice: Number(p.yearlyPrice ?? 3999),
            terminals: p.terminals || 'Unlimited Terminals',
          }));
        setLivePlans(mapped);
        if (mapped.length > 0) {
          setSelectedPlanId((prev) =>
            prev && mapped.some((p) => p.id === prev) ? prev : mapped[0].id
          );
        }
      }
      if (json.paymentConfig?.upiId) {
        setPaymentConfig({
          upiId: json.paymentConfig.upiId,
          payeeName: json.paymentConfig.payeeName || 'Mobintix Infotech',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch packages from Supabase:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [syncWithSupabase]);

  useEffect(() => {
    if (isLoaded) {
      loadSubscriptionData();
    }
  }, [isLoaded]);

  const selectedPkg = livePlans.find((p) => p.id === selectedPlanId) || livePlans[0] || null;
  const monthlyBtnPrice = selectedPkg ? Number(selectedPkg.price ?? 999) : 999;
  const annualBtnPrice = selectedPkg ? Number(selectedPkg.yearlyPrice ?? 3999) : 3999;
  const payAmount = payDuration === '1 year' ? annualBtnPrice : monthlyBtnPrice;

  const upiUri = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(
    paymentConfig.payeeName
  )}&am=${payAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `${selectedPkg?.name || 'AMB Plan'} (${payDuration})`
  )}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [upiUri]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyFeedback(null);

    const planName = selectedPkg?.name || 'AMB MedERP';

    setIsVerifying(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          email: currentUser?.email || tenant?.email,
          plan: planName,
          plan_duration: payDuration,
          amount: payAmount,
          utr_note: `UPI QR ₹${payAmount.toLocaleString('en-IN')} (${payDuration}) • Verified OK, Awaiting Admin`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setVerifyFeedback({
          type: 'error',
          text: json.error || 'Payment verification failed.',
        });
        return;
      }

      sounds.playSave();
      setVerifyFeedback({
        type: 'success',
        text: 'Verified OK! Payment submitted to the Admin Panel for manual approval.',
      });
      await syncWithSupabase();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVerifyFeedback({ type: 'error', text: msg || 'Network error verifying payment.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const isPlanActive = subscription?.status === 'ACTIVE' && Boolean(subscription?.isPaid);
  const isPendingApproval = subscription?.status === 'TRIAL';

  const handleEnterDashboard = () => {
    if (!isPlanActive) return;
    sounds.playSave();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                AMB <span className="text-indigo-600">MedERP</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1 leading-none">
                UPI Payment &amp; Commercial Licensing
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 border-r border-slate-200 pr-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPlanActive
                      ? 'bg-emerald-500 animate-pulse'
                      : isPendingApproval
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-rose-500'
                  }`}
                />
                <span className="font-semibold text-slate-900">{currentUser.name}</span>
                <span className="text-slate-400 font-mono">({currentUser.phone})</span>
              </div>
            )}
            <button
              onClick={loadSubscriptionData}
              disabled={isSyncing || loadingPlans}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs shadow-2xs transition-all"
              title="Check approval status from Admin Console"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing || loadingPlans ? 'animate-spin text-indigo-600' : 'text-slate-500'}`}
              />
              <span>Sync Plan</span>
            </button>
            <button
              onClick={handleEnterDashboard}
              disabled={!isPlanActive}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition-all"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {currentUser && (
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>Direct UPI QR Payment • Manual Admin Verification</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Subscription &amp; License Plan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Scan the direct UPI QR code below to complete payment, then submit for manual verification in the Admin Panel.
          </p>
        </div>

        {/* Direct UPI QR Payment & Verification Gateway */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Direct UPI QR Payment Gateway</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pay directly to <strong>{paymentConfig.payeeName}</strong> ({paymentConfig.upiId}) and submit for approval
                </p>
              </div>

              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs flex-shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPayDuration('1 month')}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    payDuration === '1 month' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ₹{monthlyBtnPrice.toLocaleString('en-IN')} / Month
                </button>
                <button
                  type="button"
                  onClick={() => setPayDuration('1 year')}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    payDuration === '1 year' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ₹{annualBtnPrice.toLocaleString('en-IN')} / Annual
                </button>
              </div>
            </div>

            {livePlans.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  Select Plan:
                </span>
                {livePlans.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPlanId(pkg.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold border transition-all whitespace-nowrap ${
                      selectedPkg?.id === pkg.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {pkg.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Left: Direct Scannable QR Code */}
            <div className="md:col-span-5 bg-slate-50/80 border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-between text-center space-y-3 h-full">
              <div className="text-xs font-semibold text-slate-500">
                {selectedPkg?.name || 'AMB MedERP'} • {payDuration === '1 year' ? 'Annual Plan' : 'Monthly Plan'}
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                ₹{payAmount.toLocaleString('en-IN')}
                <span className="text-xs font-semibold text-slate-500 ml-1">
                  /{payDuration === '1 year' ? 'annual' : 'month'}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col items-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Direct UPI QR Code" className="w-44 h-44 block" />
                ) : (
                  <div className="w-44 h-44 bg-slate-100 rounded-xl" />
                )}
                <span className="text-[9px] font-bold text-indigo-700 font-mono mt-1.5">
                  SCAN WITH GPAY / PHONEPE / PAYTM / BHIM
                </span>
              </div>

              <div className="w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span className="font-mono font-bold text-slate-900 truncate">{paymentConfig.upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 flex-shrink-0"
                >
                  {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <a
                href={upiUri}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <span>Open directly in UPI App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Right: Payment Verification Action */}
            <form onSubmit={handleVerifyAndSubmit} className="md:col-span-7 flex flex-col justify-between space-y-4 text-xs h-full">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Verify Your UPI Payment</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    After paying ₹{payAmount.toLocaleString('en-IN')} to <strong>{paymentConfig.upiId}</strong>, click verify below to send for manual approval in the Admin Panel.
                  </p>
                </div>

                {verifyFeedback && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                      verifyFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {verifyFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                    <span>{verifyFeedback.text}</span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Selected Package</span>
                    <span className="font-bold text-slate-900">{selectedPkg?.name || 'AMB MedERP'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Billing Cycle</span>
                    <span className="font-semibold text-slate-800">
                      {payDuration === '1 year' ? 'Annual (12 Months)' : 'Monthly (1 Month)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Payee UPI ID</span>
                    <span className="font-mono font-semibold text-indigo-700">{paymentConfig.upiId}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Payable Amount</span>
                    <span className="font-mono font-black text-slate-900">₹{payAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">Manual Admin Approval Flow:</div>
                  <div>1. Scan QR &amp; complete UPI payment of ₹{payAmount.toLocaleString('en-IN')}.</div>
                  <div>2. Click <strong>Verify Payment &amp; Submit for Approval</strong> (Verified OK).</div>
                  <div>3. Admin verifies in Admin Console → Users and clicks <strong>Verify &amp; Activate</strong>.</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying Payment...' : 'Verify Payment & Submit for Approval'}</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
