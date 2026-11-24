import { NextResponse } from 'next/server';
import { fetchOperationalDataFromSupabase } from '@/lib/supabase-server';

export async function GET() {
  try {
    const result = await fetchOperationalDataFromSupabase();

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
