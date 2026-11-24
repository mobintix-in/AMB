'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useERPStore } from '@/lib/store';
import { Building2, Loader2, ShieldCheck } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

export function AuthGuard({ children, requireSubscription = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, subscription, isLoaded } = useERPStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    // 1. Mandatory Login Gate: Anyone accessing must be logged in first
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    // 2. Subscription Gate: If subscription is strictly required on this page
    if (requireSubscription && (!subscription || subscription.status === 'EXPIRED')) {
      router.replace('/subscription');
      return;
    }

    setAuthorized(true);
  }, [currentUser, subscription, isLoaded, router, pathname, requireSubscription]);

  if (!isLoaded || !authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold mx-auto shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-base font-bold text-slate-900">AMB MedERP Terminal</div>
            <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verifying operator credentials...</span>
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
