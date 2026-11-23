'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, Phone, KeyRound, ShieldCheck, ArrowRight, 
  Sparkles, CheckCircle2, Lock, UserCheck, AlertCircle, RefreshCw 
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useERPStore } from '@/lib/store';
import { sounds } from '@/lib/audio';

export default function LoginPage() {
  const router = useRouter();
  const { tenant, currentUser, loginWithPhone, users, resetToDemoData } = useERPStore();

  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState('');
  const [authMode, setAuthMode] = useState<'OTP' | 'PIN'>('OTP');
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [pinInput, setPinInput] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  const handleSendOtp = () => {
    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    setErrorMessage(null);
    sounds.playScan();

    // Generate random 4-digit demo OTP
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setDemoCode(generated);
    setOtpSent(true);
    setCountdown(30);
  };

  const handleAutoFillDemoOtp = () => {
    if (!demoCode) return;
    setOtpInput(demoCode.split(''));
    sounds.playScan();
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const newOtp = [...otpInput];
    newOtp[index] = digit;
    setOtpInput(newOtp);

    // Auto advance focus
    if (digit && index < 3) {
      const nextInput = document.getElementById(`otp-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyAndLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    if (authMode === 'OTP') {
      if (!otpSent) {
        handleSendOtp();
        return;
      }
      const enteredOtp = otpInput.join('');
      if (enteredOtp.length < 4) {
        setErrorMessage('Please enter the 4-digit OTP code');
        return;
      }
    } else {
      if (pinInput.length < 4) {
        setErrorMessage('Please enter your 4-digit Cashier PIN');
        return;
      }
    }

    const res = loginWithPhone(clean);
    setSuccessMessage(`Welcome back, ${res.user.name}! Redirecting to POS...`);
    setTimeout(() => {
      router.push('/billing');
    }, 800);
  };

  const handleDirectLogin = () => {
    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    setErrorMessage(null);
    const res = loginWithPhone(clean);
    setSuccessMessage(`Logged in as ${res.user.name}! Launching AMB MedERP...`);
    setTimeout(() => {
      router.push('/billing');
    }, 600);
  };

  const handleQuickDemoLogin = (demoPhone: string) => {
    setPhone(demoPhone);
    setErrorMessage(null);
    const res = loginWithPhone(demoPhone);
    setSuccessMessage(`Logged in as ${res.user.name} (${res.user.role})!`);
    setTimeout(() => {
      router.push('/billing');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none">
      <Navbar onResetData={resetToDemoData} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-sm mb-1">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Sign in to AMB MedERP
            </h1>
            <p className="text-xs text-slate-500">
              High-Speed Medical Inventory, Billing Terminal & Drug License Authentication
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            {/* Mode Selector Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('OTP');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'OTP'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile OTP Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('PIN');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'PIN'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Cashier PIN Login</span>
              </button>
            </div>

            {/* Error / Success Notifications */}
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

            <form onSubmit={handleVerifyAndLogin} className="space-y-4">
              {/* Phone number input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Registered Mobile Number *
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden shadow-2xs focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
                  <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 border-r border-slate-200 flex items-center gap-1">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMessage(null);
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium font-mono"
                  />
                </div>
              </div>

              {/* OTP Flow */}
              {authMode === 'OTP' && (
                <>
                  {!otpSent ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Send Verification Code (OTP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDirectLogin}
                        className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Quick Direct Login with Phone (Skip OTP)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-in fade-in">
                      {/* Simulated SMS OTP Toast */}
                      <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-sky-900 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>Simulated SMS Delivery</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleAutoFillDemoOtp}
                            className="text-sky-700 underline hover:text-sky-800 font-bold"
                          >
                            Auto-Fill ({demoCode})
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Your AMB MedERP security verification OTP is: <strong className="font-mono text-slate-900 text-sm">{demoCode}</strong>
                        </p>
                      </div>

                      {/* 4-digit OTP input boxes */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Enter 4-Digit OTP Code:
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[0, 1, 2, 3].map((idx) => (
                            <input
                              key={idx}
                              id={`otp-box-${idx}`}
                              type="text"
                              maxLength={1}
                              value={otpInput[idx]}
                              onChange={(e) => handleOtpChange(idx, e.target.value)}
                              className="h-12 text-center text-lg font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Didn&apos;t receive code?</span>
                        <button
                          type="button"
                          disabled={countdown > 0}
                          onClick={handleSendOtp}
                          className="font-medium text-sky-700 hover:text-sky-800 disabled:text-slate-400"
                        >
                          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Enter POS</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* PIN Flow */}
              {authMode === 'PIN' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Cashier Terminal PIN (4-Digit) *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 1234 (Demo PIN)"
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500 font-mono tracking-widest text-center"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Quick PIN Sign In</span>
                  </button>
                </div>
              )}
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                One-Click Demo Staff Logins:
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {mounted && users.slice(0, 3).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(u.phone)}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between text-slate-700 transition-colors shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px]">
                        {u.name.slice(0, 1)}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">{u.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">📱 {u.phone}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Register Prompt */}
          <div className="text-center text-xs text-slate-600 space-y-1">
            <div>
              New Pharmacy, Hospital, or Wholesale Chemist?
            </div>
            <div>
              <Link
                href="/register"
                className="font-bold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 underline"
              >
                <span>Register Store & Drug License with Phone Number</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600">
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
