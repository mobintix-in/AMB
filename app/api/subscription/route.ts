import { NextRequest, NextResponse } from 'next/server';
import { fetchPackagesFromSupabase, updateUserSubscriptionInSupabase } from '@/lib/supabase-server';

export async function GET() {
  try {
    const packages = await fetchPackagesFromSupabase();
    return NextResponse.json({ success: true, packages }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email, plan, plan_duration, expires_at } = await req.json();
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan name is required.' }, { status: 400 });
    }

    const result = await updateUserSubscriptionInSupabase({
      userId,
      email,
      plan,
      plan_duration,
      expires_at,
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
