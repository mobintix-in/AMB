import { NextRequest, NextResponse } from 'next/server';
import { saveUserAndBusinessProfileInSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, currentEmail, account, business } = body;

    if (!account || !business) {
      return NextResponse.json(
        { success: false, error: 'Account and business details are required.' },
        { status: 400 }
      );
    }

    const result = await saveUserAndBusinessProfileInSupabase({
      userId,
      currentEmail,
      account,
      business,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      tenant: result.tenant,
      message: result.message,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
