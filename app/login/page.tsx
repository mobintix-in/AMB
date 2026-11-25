'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useERPStore } from '@/lib/store';
import { testSupabaseLiveConnection } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithSupabase } = useERPStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ checked: boolean; ok: boolean; msg: string }>({
    checked: false,
    ok: false,
    msg: '',
  });

  useEffect(() => {
    testSupabaseLiveConnection().then((res) => {
      setDbStatus({ checked: true, ok: res.ok, msg: res.message });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered email address or mobile number.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your terminal password or security PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginWithSupabase(identifier.trim(), password.trim());
      if (res.success && res.user) {
        const isActivePaid = res.subscription?.status === 'ACTIVE' && Boolean(res.subscription?.isPaid);
        setSuccessMessage(
          isActivePaid
            ? `Welcome back, ${res.user.name}! Opening terminal dashboard...`
            : `Welcome back, ${res.user.name}! Checking license plan...`
        );
        setTimeout(() => {
          router.push(isActivePaid ? '/' : '/subscription');
        }, 450);
      } else {
        setErrorMessage(res.error || 'Invalid credentials or user not found. Please verify and retry.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Authentication failed. Please check your cloud connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans select-none">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-10 sm:py-14 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-5">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-sm mb-1">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              AMB <span className="text-indigo-600">MedERP</span> Terminal
            </h1>
            <p className="text-xs text-slate-500">
              Secure Pharmacist &amp; Billing Counter Authentication
            </p>
          </div>

          {/* Cloud Connection Status Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  !dbStatus.checked
                    ? 'bg-amber-400 animate-pulse'
                    : dbStatus.ok
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-slate-700">
                {!dbStatus.checked
                  ? 'Connecting to Cloud...'
                  : dbStatus.ok
                    ? 'Enterprise Cloud Sync Active'
                    : 'Cloud Connection Unavailable'}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SSL Secured</span>
            </span>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Registered Email or Mobile Number *
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
                    placeholder="e.g. pharmacy@store.in or 9820144552"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Terminal Password / Security PIN *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter your password or PIN"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Terminal</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600 space-y-1">
              <div>New medical store or pharmacy operator?</div>
              <Link
                href="/register"
                className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                <span>Register Store &amp; Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-400">
            AMB MedERP • Cloud Pharmacy Billing &amp; Inventory Suite
          </div>
        </div>
      </main>
    </div>
  );
}
