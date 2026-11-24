import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Item, ItemBatch, Party, SalesInvoice, Tenant, UserProfile, UserRole } from '@/types/erp';

// Retrieve configured Enterprise Cloud credentials directly from environment
export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url !== 'https://your-project.supabase.co' &&
    !url.includes('your-project')
  );

  return { url, anonKey, isConfigured };
}

// Deprecated no-op: Credentials are permanently managed via enterprise environment configuration
export function saveSupabaseCredentials(url: string, anonKey: string) {
  // Enterprise mode: manual local overrides disabled
}

// Client factory
let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUrl = url;
    lastKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Export default singleton
export const supabase = getSupabase();
export const isSupabaseConfigured = Boolean(getSupabaseCredentials().isConfigured);

// Live connection test
export async function testSupabaseLiveConnection(customUrl?: string, customKey?: string): Promise<{
  ok: boolean;
  message: string;
  tablesFound?: string[];
}> {
  const targetUrl = customUrl || getSupabaseCredentials().url;
  const targetKey = customKey || getSupabaseCredentials().anonKey;

  if (!targetUrl || !targetKey || targetUrl.includes('your-project')) {
    return { ok: false, message: 'Please provide valid Supabase Project URL and Anon Public Key.' };
  }

  try {
    const tempClient = createClient(targetUrl, targetKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Try pinging tenants or items table
    const { data, error } = await tempClient.from('items').select('id').limit(1);

    if (error) {
      // If code is 42P01, database connection is valid but tables are not yet run
      if (error.code === '42P01' || error.message.includes('relation "items" does not exist')) {
        return {
          ok: true,
          message: 'Enterprise Cloud Connected (Master tables initializing).',
        };
      }
      return { ok: false, message: `Cloud Sync Error: ${error.message}` };
    }

    return {
      ok: true,
      message: 'Successfully synchronized with Enterprise Cloud Database.',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Cloud Connection Failed: ${errorMsg}` };
  }
}

// ─── Direct Enterprise Cloud Authentication ──────────────────────────────────

export async function supabaseSignIn(
  emailOrPhone: string,
  password?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Enterprise cloud service unavailable. Operating in offline terminal mode.' };
  }

  const clean = emailOrPhone.trim();
  const isEmail = clean.includes('@');

  try {
    if (isEmail && password) {
      // Standard email + password sign in
      const { data, error } = await client.auth.signInWithPassword({
        email: clean,
        password: password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          phone: (data.user.user_metadata?.phone as string) || clean.split('@')[0],
          name: (data.user.user_metadata?.name as string) || data.user.email?.split('@')[0] || 'Pharmacist',
          role: ((data.user.user_metadata?.role as string)?.toUpperCase() as UserRole) || 'ADMIN',
          store_name: (data.user.user_metadata?.store_name as string) || 'AMB MedERP Store',
          drug_license_no: (data.user.user_metadata?.drug_license_no as string) || '',
          gstin: (data.user.user_metadata?.gstin as string) || '',
          is_verified: true,
          created_at: data.user.created_at,
        };
        return { success: true, user: profile };
      }
    } else {
      // Phone or username login (Query user from 'users' table or metadata)
      const phoneClean = clean.replace(/[^0-9]/g, '').slice(-10);
      const { data: dbUser, error: dbError } = await client
        .from('users')
        .select('*')
        .or(`phone.eq.${phoneClean},phone.eq.+91${phoneClean}`)
        .maybeSingle();

      if (dbUser && !dbError) {
        const profile: UserProfile = {
          id: dbUser.id,
          phone: dbUser.phone,
          name: dbUser.name || 'Store Operator',
          role: (dbUser.role?.toUpperCase() as UserRole) || 'ADMIN',
          store_name: dbUser.store_name || 'AMB MedERP Store',
          drug_license_no: dbUser.drug_license_no,
          gstin: dbUser.gstin,
          is_verified: true,
          created_at: dbUser.created_at || new Date().toISOString(),
        };
        return { success: true, user: profile };
      }

      // If user doesn't exist yet, auto-register them in Supabase
      const newId = `usr-${Date.now()}`;
      const newProfile: UserProfile = {
        id: newId,
        phone: phoneClean,
        name: `Pharmacist (${phoneClean.slice(-4)})`,
        role: 'ADMIN',
        store_name: 'AMB MedERP Store',
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      // Try saving to 'users' table if table exists
      try {
        await client.from('users').insert([newProfile]);
      } catch {
        // Table might not exist yet, still allow login
      }

      return { success: true, user: newProfile };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }

  return { success: false, error: 'Authentication failed.' };
}

export async function supabaseSignUp(
  email: string,
  password: string,
  metadata: { name: string; phone: string; storeName: string; drugLicense?: string; gstin?: string; role?: UserRole }
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata.name,
          phone: metadata.phone,
          store_name: metadata.storeName,
          drug_license_no: metadata.drugLicense,
          gstin: metadata.gstin,
          role: metadata.role || 'ADMIN',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      const profile: UserProfile = {
        id: data.user.id,
        phone: metadata.phone,
        name: metadata.name,
        role: metadata.role || 'ADMIN',
        store_name: metadata.storeName,
        drug_license_no: metadata.drugLicense,
        gstin: metadata.gstin,
        is_verified: true,
        created_at: data.user.created_at,
      };

      // Also try saving to users table
      try {
        await client.from('users').insert([profile]);
      } catch {
        // Ignored if table not created yet
      }

      return { success: true, user: profile };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }

  return { success: false, error: 'Signup failed.' };
}

// ─── Direct Database Sync Helpers ────────────────────────────────────────────

export async function fetchAllSupabaseData(): Promise<{
  items?: Item[];
  batches?: ItemBatch[];
  parties?: Party[];
  invoices?: SalesInvoice[];
  tenant?: Tenant;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) return { error: 'Supabase client not initialized.' };

  try {
    const [itemsRes, batchesRes, partiesRes, invoicesRes, tenantRes] = await Promise.all([
      client.from('items').select('*'),
      client.from('item_batches').select('*'),
      client.from('parties').select('*'),
      client.from('sales_invoices').select('*'),
      client.from('tenants').select('*').limit(1).maybeSingle(),
    ]);

    return {
      items: itemsRes.data || undefined,
      batches: batchesRes.data || undefined,
      parties: partiesRes.data || undefined,
      invoices: invoicesRes.data || undefined,
      tenant: tenantRes.data || undefined,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { error: errorMsg };
  }
}

export async function pushAllDataToSupabase(data: {
  tenant: Tenant;
  parties: Party[];
  items: Item[];
  batches: ItemBatch[];
  invoices: SalesInvoice[];
}): Promise<{ ok: boolean; message: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, message: 'Supabase is not configured.' };

  try {
    // 1. Upsert Tenant
    if (data.tenant) {
      await client.from('tenants').upsert([data.tenant]);
    }

    // 2. Upsert Parties
    if (data.parties.length > 0) {
      await client.from('parties').upsert(data.parties);
    }

    // 3. Upsert Items
    if (data.items.length > 0) {
      await client.from('items').upsert(data.items);
    }

    // 4. Upsert Batches
    if (data.batches.length > 0) {
      await client.from('item_batches').upsert(data.batches);
    }

    // 5. Upsert Invoices
    if (data.invoices.length > 0) {
      // Invoices table expects invoices without items array if items are in sales_invoice_items
      const formattedInvoices = data.invoices.map(({ items: _, ...rest }) => rest);
      await client.from('sales_invoices').upsert(formattedInvoices);
    }

    return { ok: true, message: 'All local records successfully synchronized with Enterprise Cloud!' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Push failed: ${errorMsg}` };
  }
}
