'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, Phone, ShieldCheck, CheckCircle2, 
  ArrowRight, Sparkles, FileText, Lock, User, AlertCircle 
} from 'lucide-react';
import { useERPStore } from '@/lib/store';
import { UserRole } from '@/types/erp';
import { sounds } from '@/lib/audio';

export default function RegisterPage() {
  const router = useRouter();
  const { registerWithPhone } = useERPStore();

  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [gstin, setGstin] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [pin, setPin] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP simulation for mobile number verification
  const [otpStep, setOtpStep] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSendOtp = () => {
    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    setErrorMessage(null);
    sounds.playScan();

    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setDemoCode(generated);
    setOtpStep(true);
  };

  const handleVerifyOtp = () => {
    const entered = otpInput.join('');
    if (entered.length < 4) {
      setErrorMessage('Please enter the 4-digit code');
      return;
    }
    setIsPhoneVerified(true);
    setOtpStep(false);
    setErrorMessage(null);
    sounds.playSave();
  };

  const handleAutoFillOtp = () => {
    if (!demoCode) return;
    setOtpInput(demoCode.split(''));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    if (cleanPhone.length < 10) {
      setErrorMessage('Please provide a valid 10-digit phone number');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter Pharmacist / Proprietor Name');
      return;
    }
    if (!storeName.trim()) {
      setErrorMessage('Please enter Medical Store / Pharmacy Name');
      return;
    }
    if (pin.trim().length < 6) {
      setErrorMessage('Security PIN or Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await registerWithPhone({
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim(),
        pin: pin.trim() || '1234',
        storeName: storeName.trim(),
        drugLicenseNo: drugLicenseNo.trim() || '20B-MH-NEW-REG',
        gstin: gstin.trim(),
        role,
      });

      if (res.success) {
        setSuccessMessage(`Store "${storeName}" successfully registered! Activating commercial license...`);
        setTimeout(() => {
          router.push('/subscription');
        }, 600);
      } else {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-sm mb-1">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Register Pharmacy in AMB MedERP
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Join next-gen cloud pharmacy network with mobile authentication, drug license compliance, and FEFO inventory tracking.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
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

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Step 1: Mobile Phone Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Proprietor / Pharmacist Mobile Number *
                  </label>
                  {isPhoneVerified && (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

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
                    disabled={isPhoneVerified}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMessage(null);
                    }}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium font-mono disabled:bg-slate-50"
                  />
                  {!isPhoneVerified && !otpStep && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold border-l border-slate-200 transition-colors whitespace-nowrap"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>

              {/* OTP Input Sub-flow */}
              {otpStep && !isPhoneVerified && (
                <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-sky-900 font-semibold">
                    <span>Simulated SMS Code: <strong className="font-mono text-sm">{demoCode}</strong></span>
                    <button
                      type="button"
                      onClick={handleAutoFillOtp}
                      className="text-sky-700 underline text-[11px] font-bold"
                    >
                      Auto-Fill
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={otpInput[idx]}
                        onChange={(e) => {
                          const digit = e.target.value.slice(-1);
                          const next = [...otpInput];
                          next[idx] = digit;
                          setOtpInput(next);
                        }}
                        className="h-10 text-center text-base font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs"
                  >
                    Confirm Phone Verification
                  </button>
                </div>
              )}

              {/* Step 2: Store & Pharmacist Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Medical Store / Pharmacy Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Apex Health Pharmacy"
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Registered Pharmacist / Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Suresh Verma"
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Email (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Store / Pharmacist Email (Optional — for cloud receipt alerts)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@apexpharmacy.in (or login via mobile)"
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Drug License & GST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Drug License No. (D.L. 20B/21B)</span>
                    <span className="text-[10px] text-sky-700 font-normal">Mandatory</span>
                  </label>
                  <input
                    type="text"
                    value={drugLicenseNo}
                    onChange={(e) => setDrugLicenseNo(e.target.value)}
                    placeholder="e.g. 20B-MH-994120 / 21B-MH-994121"
                    className="w-full px-3 py-2 text-xs text-slate-900 font-mono bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    GSTIN (GST Number)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCR8941N1Z5"
                    className="w-full px-3 py-2 text-xs text-slate-900 font-mono bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Role & Cashier PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500 font-medium"
                  >
                    <option value="ADMIN">Store Owner / Administrator</option>
                    <option value="PHARMACIST">Staff Pharmacist (M.Pharm / B.Pharm)</option>
                    <option value="CASHIER">Billing POS Cashier</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Terminal Password / Security PIN (6+ Digits) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter password or 6-digit PIN (e.g. 123456)"
                    className="w-full px-3 py-2 text-xs text-slate-900 font-mono bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering & Saving to Enterprise Cloud...' : 'Register Store & Launch AMB MedERP'}</span>
              </button>
            </form>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Complies with Central Drugs Standard Control Organisation (CDSCO) guidelines & Schedule H prescription logging rules.</span>
            </div>
          </div>

          {/* Already registered */}
          <div className="text-center text-xs text-slate-600 space-y-1">
            <div>Already have an AMB MedERP account?</div>
            <div>
              <Link
                href="/login"
                className="font-bold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 underline"
              >
                <span>Sign in with Mobile Number →</span>
              </Link>
            </div>
            <div>
              <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600 inline-block mt-2">
                ← Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
