import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPackagesFromSupabase,
  fetchMerchantPaymentConfig,
  submitUpiPaymentForVerification,
} from '@/lib/supabase-server';

export async function GET() {
  try {
    const [packages, paymentConfig] = await Promise.all([
      fetchPackagesFromSupabase(),
      fetchMerchantPaymentConfig(),
    ]);
    return NextResponse.json({ success: true, packages, paymentConfig }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email, plan, plan_duration, amount, utr_ref, utr_note } = await req.json();
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Package plan is required.' },
        { status: 400 }
      );
    }

    const result = await submitUpiPaymentForVerification({
      userId,
      email,
      plan,
      plan_duration: plan_duration || '1 month',
      amount: Number(amount || 0),
      utr_ref: utr_ref || '',
      utr_note,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      message: result.message,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
