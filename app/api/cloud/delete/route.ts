import { NextRequest, NextResponse } from 'next/server';
import { deleteOperationalRecordFromSupabase } from '@/lib/supabase-server';

const ALLOWED_TABLES = new Set(['items', 'item_batches', 'parties', 'sales_invoices']);

export async function POST(req: NextRequest) {
  try {
    const { table, id } = await req.json();
    if (!table || !id || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json(
        { success: false, error: 'Valid table and record id are required.' },
        { status: 400 }
      );
    }

    const result = await deleteOperationalRecordFromSupabase({ table, id });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
