import { NextRequest, NextResponse } from 'next/server';
import { fetchOperationalDataFromSupabase } from '@/lib/supabase-server';

async function handleSync(params?: { userId?: string; email?: string; tenantId?: string }) {
  try {
    const result = await fetchOperationalDataFromSupabase(params);

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return handleSync({
    userId: searchParams.get('userId') || undefined,
    email: searchParams.get('email') || undefined,
    tenantId: searchParams.get('tenantId') || undefined,
  });
}

export async function POST(req: NextRequest) {
  let body: { userId?: string; email?: string; tenantId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return handleSync(body);
}
