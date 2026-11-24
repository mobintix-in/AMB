'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, Lock, ArrowRight, ShieldCheck, 
  CheckCircle2, AlertCircle, Database, Mail, KeyRound, Loader2 
} from 'lucide-react';
import { useERPStore } from '@/lib/store';
import { isSupabaseConfigured, getSupabaseCredentials, testSupabaseLiveConnection } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { tenant, currentUser, loginWithSupabase } = useERPStore();

  const [mounted, setMounted] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ checked: boolean; ok: boolean; msg: string }>({
    checked: false,
    ok: false,
    msg: '',
  });

  useEffect(() => {
    setMounted(true);
    // Check live connection on mount
    testSupabaseLiveConnection().then((res) => {
      setDbStatus({ checked: true, ok: res.ok, msg: res.message });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email address or registered mobile number');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password or security PIN');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginWithSupabase(identifier.trim(), password.trim());
      if (res.success && res.user) {
        setSuccessMessage(`Welcome back, ${res.user.name}! Redirecting to AMB MedERP POS...`);
        setTimeout(() => {
          router.push('/billing');
        }, 600);
      } else {
        setErrorMessage(res.error || 'Invalid credentials or user not found. Please verify and retry.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Authentication failed. Please check your Supabase connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:py-14 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-5">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-sm mb-1">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              AMB MedERP Terminal
            </h1>
            <p className="text-xs text-slate-500">
              Secure Pharmacist & Billing Counter Authentication
            </p>
          </div>

          {/* Enterprise System Security Pill */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dbStatus.ok ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`} />
              <span className="font-semibold text-slate-700">
                {dbStatus.ok ? 'Enterprise Cloud Sync Active' : 'Local Terminal Active'}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-Bit SSL Encrypted</span>
            </span>
          </div>

          {/* Unified Enterprise Login Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            {/* Notifications */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              {/* Email / Mobile input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Registered Pharmacist Email or Mobile *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. admin@amb-med.in or 9820144552"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium text-xs shadow-2xs"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Terminal Password / Security PIN *</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter your terminal password"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium text-xs shadow-2xs font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Terminal Access...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Secure Sign In • Enterprise Terminal</span>
                  </>
                )}
              </button>
            </form>

            {/* Direct Registration Prompt */}
            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600 space-y-1">
              <div>Need a new operator or store account?</div>
              <Link
                href="/register"
                className="font-bold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 underline"
              >
                <span>Register Store & Add Operator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center space-y-1">
            <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600 inline-block">
              ← Return to Dashboard
            </Link>
            <div className="text-[10px] text-slate-400">
              AMB MedERP Suite • Enterprise Edition • Licensed Software
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
