'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useERPStore } from '@/lib/store';
import { UserRole } from '@/types/erp';

export default function RegisterPage() {
  const router = useRouter();
  const { registerWithPhone } = useERPStore();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [gstin, setGstin] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!storeName.trim()) {
      setErrorMessage('Please enter Medical Store / Pharmacy Name.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter Pharmacist / Owner Name.');
      return;
    }
    if (!drugLicenseNo.trim()) {
      setErrorMessage('Drug License No. (D.L. 20B/21B) is mandatory.');
      return;
    }
    if (pin.trim().length < 6) {
      setErrorMessage('Terminal Password / PIN must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await registerWithPhone({
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim(),
        pin: pin.trim(),
        storeName: storeName.trim(),
        drugLicenseNo: drugLicenseNo.trim(),
        gstin: gstin.trim().toUpperCase(),
        role,
      });

      if (res.success) {
        setSuccessMessage(`Store "${storeName.trim()}" registered! Redirecting to subscription...`);
        setTimeout(() => {
          router.push('/subscription');
        }, 500);
      } else {
        setErrorMessage(res.error || 'Registration failed. Please verify your details and try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans select-none">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-sm mb-1">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Register Pharmacy in <span className="text-indigo-600">AMB MedERP</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create your isolated pharmacy workspace with cloud sync, drug license compliance, and GST billing.
            </p>
          </div>

          {/* Form Card */}
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

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Proprietor / Pharmacist Mobile Number *
                </label>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                  <div className="bg-slate-100/80 px-3.5 py-2.5 text-xs font-bold text-slate-600 border-r border-slate-200 flex items-center">
                    +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMessage(null);
                    }}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium font-mono"
                  />
                </div>
              </div>

              {/* Store & Owner Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block whitespace-nowrap truncate">
                    Medical Store / Pharmacy Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => {
                      setStoreName(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. Apex Health Pharmacy"
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block whitespace-nowrap truncate">
                    Pharmacist / Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. Suresh Verma"
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Store / Pharmacist Email <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. contact@apexpharmacy.in"
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Drug License & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block whitespace-nowrap truncate">
                    Drug License No. (D.L. 20B/21B) *
                  </label>
                  <input
                    type="text"
                    required
                    value={drugLicenseNo}
                    onChange={(e) => {
                      setDrugLicenseNo(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. 20B-MH-994120"
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block whitespace-nowrap truncate">
                    GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AABCR8941N1Z5"
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Role & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block whitespace-nowrap truncate">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="ADMIN">Store Owner / Administrator</option>
                    <option value="PHARMACIST">Staff Pharmacist (M.Pharm / B.Pharm)</option>
                    <option value="CASHIER">Billing POS Cashier</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block whitespace-nowrap truncate">
                    Password / Security PIN (6+ chars) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs text-slate-900 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      title={showPin ? 'Hide password' : 'Show password'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register Store &amp; Continue</span>
                  </>
                )}
              </button>
            </form>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                Complies with Central Drugs Standard Control Organisation (CDSCO) guidelines &amp; Schedule H prescription logging rules.
              </span>
            </div>
          </div>

          {/* Already registered */}
          <div className="text-center text-xs text-slate-600 space-y-1">
            <div>Already have an AMB MedERP account?</div>
            <Link
              href="/login"
              className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              <span>Sign in with Email or Mobile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
