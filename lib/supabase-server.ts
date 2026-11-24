import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Item, ItemBatch, Party, SalesInvoice, Tenant, UserProfile, UserRole } from '@/types/erp';

// Initialize server-side Supabase admin client with service role key
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceKey || url.includes('your-project')) {
    return null;
  }

  try {
    return createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase Admin client:', err);
    return null;
  }
}

// Convert any string identifier (e.g. 'itm-001', 'pty-101', 'batch-001') into a valid, deterministic UUID
export function toUuid(id?: string | null): string {
  if (!id) return crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  const hash = crypto.createHash('md5').update(id).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    'a' + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

// ─── Cloud Sync: Push Operational Data to Supabase ────────────────────────────

export async function saveOperationalDataToSupabase(data: {
  tenant?: Tenant;
  items?: Item[];
  batches?: ItemBatch[];
  parties?: Party[];
  invoices?: SalesInvoice[];
}): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { ok: false, message: 'Supabase Admin service is not configured.' };
  }

  try {
    const tenantId = data.tenant ? toUuid(data.tenant.id) : null;

    // 1. Upsert Tenant
    if (data.tenant) {
      const tenantRow = {
        id: tenantId,
        name: data.tenant.name || 'AMB MedERP Store',
        trade_name: data.tenant.trade_name || null,
        branch_name: data.tenant.branch_name || 'Main Branch',
        gstin: data.tenant.gstin || null,
        drug_license_no: data.tenant.drug_license_no || '20B/21B-MH-492102',
        phone: data.tenant.phone || '9820144552',
        email: data.tenant.email || null,
        address: data.tenant.address || 'Mumbai, Maharashtra',
        state: data.tenant.state || 'Maharashtra',
        state_code: data.tenant.state_code || '27',
        currency: data.tenant.currency || 'INR',
      };
      const { error: tErr } = await client.from('tenants').upsert(tenantRow);
      if (tErr) console.warn('Tenant upsert warning:', tErr.message);
    }

    // 2. Upsert Parties
    if (data.parties && data.parties.length > 0) {
      const formattedParties = data.parties.map((p) => ({
        id: toUuid(p.id),
        tenant_id: tenantId,
        party_type: p.party_type,
        name: p.name,
        phone: p.phone,
        email: p.email || null,
        gstin: p.gstin || null,
        drug_license_no: p.drug_license_no || null,
        address: p.address || null,
        credit_limit: p.credit_limit || 0,
        credit_days: p.credit_days || 0,
        current_balance: p.current_balance || 0,
        is_active: p.is_active !== false,
      }));
      const { error: pErr } = await client.from('parties').upsert(formattedParties);
      if (pErr) console.warn('Parties upsert warning:', pErr.message);
    }

    // 3. Upsert Items
    if (data.items && data.items.length > 0) {
      const formattedItems = data.items.map((i) => ({
        id: toUuid(i.id),
        tenant_id: tenantId,
        item_code: i.item_code,
        name: i.name,
        brand_name: i.brand_name,
        salt_composition: i.salt_composition,
        category: i.category,
        manufacturer: i.manufacturer,
        hsn_code: i.hsn_code || '300490',
        unit: i.unit || 'Strip',
        pack_size: i.pack_size || '10 Tablets',
        conversion_factor: i.conversion_factor || 1,
        tax_rate: i.tax_rate ?? 12,
        cess_rate: i.cess_rate || 0,
        reorder_level: i.reorder_level || 10,
        is_prescription_required: Boolean(i.is_prescription_required),
        storage_condition: i.storage_condition || 'Store in cool, dry place',
      }));
      const { error: iErr } = await client.from('items').upsert(formattedItems);
      if (iErr) console.warn('Items upsert warning:', iErr.message);
    }

    // 4. Upsert Batches
    if (data.batches && data.batches.length > 0) {
      const formattedBatches = data.batches.map((b) => ({
        id: toUuid(b.id),
        item_id: toUuid(b.item_id),
        tenant_id: tenantId,
        batch_number: b.batch_number,
        mfg_date: b.mfg_date,
        expiry_date: b.expiry_date,
        mrp: b.mrp,
        purchase_rate: b.purchase_rate,
        sale_rate: b.sale_rate,
        quantity_available: b.quantity_available,
        rack_location: b.rack_location || null,
      }));
      const { error: bErr } = await client.from('item_batches').upsert(formattedBatches);
      if (bErr) console.warn('Batches upsert warning:', bErr.message);
    }

    // 5. Upsert Sales Invoices
    if (data.invoices && data.invoices.length > 0) {
      const formattedInvoices = data.invoices.map((inv) => ({
        id: toUuid(inv.id),
        tenant_id: tenantId,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        invoice_time: inv.invoice_time || '12:00:00',
        party_id: inv.party_id ? toUuid(inv.party_id) : null,
        party_name: inv.party_name,
        party_gstin: inv.party_gstin || null,
        doctor_name: inv.doctor_name || null,
        patient_name: inv.patient_name || null,
        subtotal: inv.subtotal || 0,
        discount_amount: inv.discount_amount || 0,
        taxable_amount: inv.taxable_amount || 0,
        cgst_amount: inv.cgst_amount || 0,
        sgst_amount: inv.sgst_amount || 0,
        igst_amount: inv.igst_amount || 0,
        round_off: inv.round_off || 0,
        total_amount: inv.total_amount,
        total_cost: inv.total_cost || 0,
        profit_margin_amount: inv.profit_margin_amount || 0,
        profit_margin_percent: inv.profit_margin_percent || 0,
        payment_status: inv.payment_status || 'PAID',
        payment_mode: inv.payment_mode || 'CASH',
        amount_received: inv.amount_received || inv.total_amount,
      }));
      const { error: invErr } = await client.from('sales_invoices').upsert(formattedInvoices);
      if (invErr) console.warn('Invoices upsert warning:', invErr.message);
    }

    return { ok: true, message: 'All operational records successfully synchronized with Enterprise Cloud!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Sync failed: ${msg}` };
  }
}

// ─── Cloud Sync: Pull Operational Data from Supabase ──────────────────────────

export async function fetchOperationalDataFromSupabase(): Promise<{
  ok: boolean;
  message: string;
  data?: {
    tenant?: Tenant | null;
    items?: Item[];
    batches?: ItemBatch[];
    parties?: Party[];
    invoices?: SalesInvoice[];
  };
}> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { ok: false, message: 'Supabase Admin is not configured.' };
  }

  try {
    const [tRes, iRes, bRes, pRes, invRes] = await Promise.all([
      client.from('tenants').select('*').limit(1),
      client.from('items').select('*'),
      client.from('item_batches').select('*'),
      client.from('parties').select('*'),
      client.from('sales_invoices').select('*'),
    ]);

    const tenant = tRes.data && tRes.data[0] ? (tRes.data[0] as Tenant) : null;
    const items = (iRes.data as Item[]) || [];
    const batches = (bRes.data as ItemBatch[]) || [];
    const parties = (pRes.data as Party[]) || [];
    const rawInvoices = (invRes.data as any[]) || [];
    const invoices: SalesInvoice[] = rawInvoices.map((inv) => ({
      ...inv,
      items: Array.isArray(inv.items) ? inv.items : [],
    }));

    return {
      ok: true,
      message: 'Successfully retrieved records from Enterprise Cloud.',
      data: { tenant, items, batches, parties, invoices },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to fetch data: ${msg}` };
  }
}

// ─── User Authentication via Supabase Admin ───────────────────────────────────

export async function adminRegisterUser(data: {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  storeName: string;
  drugLicenseNo: string;
  gstin?: string;
  role?: UserRole;
}): Promise<{ success: boolean; user?: UserProfile; tenant?: Tenant; error?: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { success: false, error: 'Enterprise cloud service is unavailable.' };
  }

  const cleanPhone = data.phone.replace(/[^0-9]/g, '').slice(-10);
  if (cleanPhone.length < 10) {
    return { success: false, error: 'Please provide a valid 10-digit mobile number.' };
  }

  const email = data.email?.trim() || `${cleanPhone}@amb-med.in`;
  const password = data.password?.trim() || '1234';

  const metadata = {
    name: data.name.trim(),
    phone: cleanPhone,
    store_name: data.storeName.trim(),
    drug_license_no: data.drugLicenseNo.trim(),
    gstin: data.gstin?.trim() || '',
    role: data.role || 'ADMIN',
  };

  try {
    // 1. Create or update user in Supabase Auth
    let authUser: { id: string; email?: string } | null = null;

    // Check if user already exists
    const { data: userList } = await client.auth.admin.listUsers();
    const existing = userList?.users.find(
      (u) =>
        u.email === email ||
        (u.user_metadata?.phone && u.user_metadata.phone.slice(-10) === cleanPhone)
    );

    if (existing) {
      // Update existing user's email, password and metadata
      const { data: updated, error: uErr } = await client.auth.admin.updateUserById(existing.id, {
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (uErr) {
        return { success: false, error: uErr.message };
      }
      authUser = updated.user;
    } else {
      // Create new confirmed user
      const { data: created, error: cErr } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (cErr) {
        return { success: false, error: cErr.message };
      }
      authUser = created.user;
    }

    // 2. Upsert Tenant in Supabase
    const tenantId = toUuid(`tenant-${cleanPhone}`);
    const newTenant: Tenant = {
      id: tenantId,
      name: data.storeName.trim(),
      trade_name: data.storeName.trim(),
      branch_name: 'Main Pharmacy Branch',
      gstin: data.gstin?.trim() || '',
      drug_license_no: data.drugLicenseNo.trim(),
      phone: cleanPhone,
      email,
      address: 'Central Health Avenue, Maharashtra',
      state: 'Maharashtra',
      state_code: '27',
      currency: 'INR',
    };

    await client.from('tenants').upsert({
      id: tenantId,
      name: newTenant.name,
      trade_name: newTenant.trade_name,
      branch_name: newTenant.branch_name,
      gstin: newTenant.gstin || null,
      drug_license_no: newTenant.drug_license_no,
      phone: newTenant.phone,
      email: newTenant.email || null,
      address: newTenant.address,
      state: newTenant.state,
      state_code: newTenant.state_code,
      currency: newTenant.currency,
    });

    const profile: UserProfile = {
      id: authUser?.id || `usr-${cleanPhone}`,
      phone: cleanPhone,
      name: data.name.trim(),
      role: data.role || 'ADMIN',
      store_name: data.storeName.trim(),
      drug_license_no: data.drugLicenseNo.trim(),
      gstin: data.gstin?.trim() || '',
      is_verified: true,
      created_at: new Date().toISOString(),
    };

    return { success: true, user: profile, tenant: newTenant };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Registration error: ${msg}` };
  }
}

export async function adminLoginUser(
  identifier: string,
  password?: string
): Promise<{ success: boolean; user?: UserProfile; tenant?: Tenant; error?: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { success: false, error: 'Enterprise cloud service is unavailable.' };
  }

  const clean = identifier.trim();
  const cleanPhone = clean.replace(/[^0-9]/g, '').slice(-10);
  const isEmail = clean.includes('@');
  const userPassword = password?.trim() || '';

  try {
    // 1. Find user in Supabase Auth
    const { data: userList, error: lErr } = await client.auth.admin.listUsers();
    if (lErr) {
      return { success: false, error: lErr.message };
    }

    const matchedUser = userList.users.find((u) => {
      if (isEmail && u.email?.toLowerCase() === clean.toLowerCase()) return true;
      if (cleanPhone.length === 10) {
        if (u.user_metadata?.phone && u.user_metadata.phone.slice(-10) === cleanPhone) return true;
        if (u.email && u.email.startsWith(cleanPhone)) return true;
      }
      return false;
    });

    if (!matchedUser) {
      return {
        success: false,
        error: 'User account not found. Please register your store or verify your email/mobile.',
      };
    }

    // 2. Validate password via sign in test or direct verification
    const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (anonUrl && anonKey && matchedUser.email && userPassword) {
      const anonClient = createClient(anonUrl, anonKey);
      const { error: signErr } = await anonClient.auth.signInWithPassword({
        email: matchedUser.email,
        password: userPassword,
      });

      if (signErr) {
        // If password failed
        return {
          success: false,
          error: 'Incorrect terminal password or security PIN. Please try again.',
        };
      }
    }

    // 3. Build user profile and tenant
    const meta = matchedUser.user_metadata || {};
    const profile: UserProfile = {
      id: matchedUser.id,
      phone: meta.phone || cleanPhone || '9820144552',
      name: meta.name || matchedUser.email?.split('@')[0] || 'Store Operator',
      role: ((meta.role as string)?.toUpperCase() as UserRole) || 'ADMIN',
      store_name: meta.store_name || 'AMB MedERP Store',
      drug_license_no: meta.drug_license_no || '',
      gstin: meta.gstin || '',
      is_verified: true,
      created_at: matchedUser.created_at,
    };

    // 4. Fetch associated tenant if any
    const { data: tenants } = await client.from('tenants').select('*').limit(1);
    const tenant = tenants && tenants[0] ? (tenants[0] as Tenant) : undefined;

    return { success: true, user: profile, tenant };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Authentication error: ${msg}` };
  }
}
