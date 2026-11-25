'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Building2,
  User,
  CreditCard,
  Landmark,
  FileText,
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useERPStore } from '@/lib/store';
import { Tenant } from '@/types/erp';

const DEFAULT_TERMS = [
  '1. Goods once sold will not be accepted without original tax bill.',
  '2. Store medicines in cool, dry place as per package instructions.',
  '3. Disputes are subject to local jurisdiction only.',
].join('\n');

function resizeLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const maxSide = 160;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL('image/webp', 0.85);
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const {
    currentUser,
    tenant,
    subscription,
    isLoaded,
    saveProfile,
    syncWithSupabase,
    isSyncing,
    resetToDemoData,
  } = useERPStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedKeyRef = useRef<string>('');

  // 1. Logo
  const [logoUrl, setLogoUrl] = useState('');

  // 2. Account & Contact
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPhone, setAccountPhone] = useState('');

  // 3. Business Details (From)
  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [gstin, setGstin] = useState('');
  const [fssaiNo, setFssaiNo] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');

  // 4. Bank Account & UPI Payments
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // 5. Invoice Terms & Default Notes
  const [invoiceTerms, setInvoiceTerms] = useState(DEFAULT_TERMS);
  const [invoiceNotes, setInvoiceNotes] = useState('Thank you for choosing our pharmacy! Get well soon.');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const applyStoreToForm = (u: typeof currentUser, t: typeof tenant) => {
    if (u) {
      setAccountName(u.name || '');
      setAccountEmail(u.email || t?.email || '');
      setAccountPhone(u.phone || t?.phone || '');
    }
    if (t) {
      setLogoUrl(t.logo_url || u?.logo_url || '');
      setBusinessName(t.name || u?.store_name || '');
      setTradeName(t.trade_name || '');
      setBranchName(t.branch_name || 'Main Pharmacy Branch');
      setDrugLicenseNo(t.drug_license_no || u?.drug_license_no || '');
      setGstin(t.gstin || u?.gstin || '');
      setFssaiNo(t.fssai_no || '');
      setAddress(t.address || '');
      setStateName(t.state || 'Maharashtra');
      setStateCode(t.state_code || '27');
      setBankAccountName(t.bank_account_name || '');
      setBankName(t.bank_name || '');
      setBankAccountNo(t.bank_account_no || '');
      setBankIfsc(t.bank_ifsc || '');
      setUpiId(t.upi_id || '');
      setInvoiceTerms(t.invoice_terms || DEFAULT_TERMS);
      setInvoiceNotes(t.invoice_notes || 'Thank you for choosing our pharmacy! Get well soon.');
    }
  };

  // Hydrate form from Supabase once loaded (without overwriting unsaved edits on tab focus)
  useEffect(() => {
    if (!isLoaded) return;
    const syncKey = `${currentUser?.id || 'none'}:${tenant?.id || 'none'}:${tenant?.updated_at || ''}:${tenant?.bank_account_no || ''}:${tenant?.upi_id || ''}:${tenant?.logo_url ? '1' : '0'}`;
    if (hydratedKeyRef.current === syncKey) return;
    // Only auto-hydrate if this is first load or user switched account
    if (!hydratedKeyRef.current || !hydratedKeyRef.current.startsWith(`${currentUser?.id || 'none'}:`)) {
      hydratedKeyRef.current = syncKey;
      applyStoreToForm(currentUser, tenant);
    }
  }, [isLoaded, currentUser, tenant]);

  // Ensure initial Supabase sync updates form once if it arrives right after localStorage hydration
  const initialCloudAppliedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || initialCloudAppliedRef.current) return;
    if (tenant?.bank_account_no || tenant?.upi_id || tenant?.logo_url || currentUser?.id) {
      initialCloudAppliedRef.current = true;
      applyStoreToForm(currentUser, tenant);
    }
  }, [isLoaded, currentUser, tenant]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Logo file must be under 5 MB.' });
      return;
    }
    try {
      const dataUrl = await resizeLogoFile(file);
      setLogoUrl(dataUrl);
      setSaveMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not process logo image.';
      setSaveMessage({ type: 'error', text: msg });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);

    if (!accountName.trim()) {
      setSaveMessage({ type: 'error', text: 'Account contact name is required.' });
      return;
    }
    if (!businessName.trim()) {
      setSaveMessage({ type: 'error', text: 'Business / Store name is required.' });
      return;
    }

    setIsSaving(true);

    const updatedBusiness: Tenant = {
      id: tenant.id,
      name: businessName.trim(),
      trade_name: tradeName.trim(),
      branch_name: branchName.trim() || 'Main Branch',
      gstin: gstin.trim().toUpperCase(),
      drug_license_no: drugLicenseNo.trim() || '20B/21B-PENDING',
      fssai_no: fssaiNo.trim(),
      phone: accountPhone.trim(),
      email: accountEmail.trim(),
      address: address.trim(),
      state: stateName.trim() || 'Maharashtra',
      state_code: stateCode.trim() || '27',
      currency: tenant.currency || 'INR',
      logo_url: logoUrl,
      bank_account_name: bankAccountName.trim(),
      bank_name: bankName.trim(),
      bank_account_no: bankAccountNo.trim(),
      bank_ifsc: bankIfsc.trim().toUpperCase(),
      upi_id: upiId.trim(),
      invoice_terms: invoiceTerms,
      invoice_notes: invoiceNotes.trim(),
    };

    const res = await saveProfile({
      account: {
        name: accountName.trim(),
        email: accountEmail.trim(),
        phone: accountPhone.trim(),
      },
      business: updatedBusiness,
    });

    setIsSaving(false);
    if (res.success) {
      setSaveMessage({
        type: 'success',
        text: 'User profile, business details, bank/UPI, and invoice terms saved to Supabase!',
      });
    } else {
      setSaveMessage({
        type: 'error',
        text: res.error || 'Failed to save profile.',
      });
    }
  };

  const isPlanActive = subscription?.status !== 'EXPIRED' && Boolean(subscription?.isPaid);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col md:flex-row font-sans">
      <Sidebar onResetData={resetToDemoData} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                User &amp; Business Profile
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage your store logo, account contact, GST/DL business details, bank &amp; UPI payments, and invoice defaults.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  hydratedKeyRef.current = '';
                  initialCloudAppliedRef.current = false;
                  await syncWithSupabase();
                }}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>Refresh</span>
              </button>
              <button
                type="submit"
                form="profile-settings-form"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {saveMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          )}

          <form id="profile-settings-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Logo + Subscription */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Business Logo */}
              <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Business Logo</h2>
                    <p className="text-[11px] text-slate-500">Shown on sidebar and printed tax invoices</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Store Logo" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                      </button>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      PNG, JPG, or WebP. Automatically resized for crisp invoice printing.
                    </p>
                  </div>
                </div>
              </section>

              {/* 2. Subscription */}
              <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Subscription</h2>
                      <p className="text-[11px] text-slate-500">Assigned by AMB Admin Console</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                      isPlanActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isPlanActive ? 'Active' : 'No Plan'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Active Package</span>
                    <span className="font-bold text-slate-900">{subscription.planName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Payment Ref / License</span>
                    <span className="font-mono text-slate-700">{subscription.licenseKey}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Valid Until</span>
                    <span className="font-mono font-semibold text-slate-800">{subscription.validUntil}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Managed via Admin Console</span>
                  </span>
                  <Link
                    href="/subscription"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>View License</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>
            </div>

            {/* 3. Account & Contact */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Account &amp; Contact</h2>
                    <p className="text-[11px] text-slate-500">Primary pharmacist / terminal operator identity in Supabase Auth</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold uppercase border border-slate-200">
                  {currentUser?.role || 'ADMIN'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Full Name / Contact Person *</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Aryan Bhimani"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Account Email</label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="owner@pharmacy.in"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Mobile / Contact Phone *</label>
                  <input
                    type="text"
                    value={accountPhone}
                    onChange={(e) => setAccountPhone(e.target.value)}
                    placeholder="9409383803"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            </section>

            {/* 4. Business Details (From) */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Business Details (From)</h2>
                  <p className="text-[11px] text-slate-500">Printed as the supplier/pharmacy header on all Tax Invoices &amp; 80mm bills</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Store / Legal Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Mobintix Pharmacy"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Trade / Brand Name</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="e.g. Mobintix Chemists & Druggists"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Main Pharmacy Branch"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Drug License No. (D.L. No) *</label>
                  <input
                    type="text"
                    value={drugLicenseNo}
                    onChange={(e) => setDrugLicenseNo(e.target.value)}
                    placeholder="20B-MH-492102 / 21B-MH-492103"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono uppercase placeholder:normal-case focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">FSSAI License No. (Optional)</label>
                  <input
                    type="text"
                    value={fssaiNo}
                    onChange={(e) => setFssaiNo(e.target.value)}
                    placeholder="11521029000184"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700">Business Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop / Building, Street, City, Pincode"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">State</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">State Code</label>
                  <input
                    type="text"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    maxLength={2}
                    placeholder="27"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

            {/* 5. Bank Account & UPI Payments */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Bank Account &amp; UPI Payments</h2>
                  <p className="text-[11px] text-slate-500">Printed on invoices for customer NEFT/IMPS transfers and BHIM UPI QR payments</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="e.g. Mobintix Pharmacy"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank / SBI"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Account Number</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="e.g. 50200012345678"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">IFSC Code</label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono uppercase placeholder:normal-case focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700">UPI ID (VPA for Invoice QR)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mobintix@okicici or 9409383803@upi"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

            {/* 6. Invoice Terms & Default Notes */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Invoice Terms &amp; Default Notes</h2>
                  <p className="text-[11px] text-slate-500">Default terms and footer message shown on generated invoices</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Terms &amp; Conditions (One per line)</label>
                  <textarea
                    rows={4}
                    value={invoiceTerms}
                    onChange={(e) => setInvoiceTerms(e.target.value)}
                    placeholder={DEFAULT_TERMS}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Default Invoice Notes / Footer</label>
                  <textarea
                    rows={4}
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="Thank you for choosing our pharmacy! Get well soon."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-2 pb-6">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Profile to Supabase...' : 'Save Profile Settings'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
