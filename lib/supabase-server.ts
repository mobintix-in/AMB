import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Item, ItemBatch, Party, SalesInvoice, SalesInvoiceItem, SubscriptionInfo, SubscriptionTier, Tenant, UserProfile, UserRole } from '@/types/erp';

export interface SupabasePackageDto {
  id: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  interval: string;
  terminals: string;
  status: string;
  popular: boolean;
  features: string[];
}

function isExpiryDatePast(expiresAt: string): boolean {
  const clean = (expiresAt || '').trim();
  if (!clean || clean === '—' || clean.toLowerCase() === 'lifetime') return false;
  const parsed = new Date(clean);
  if (isNaN(parsed.getTime())) return false;
  parsed.setHours(23, 59, 59, 999);
  return parsed.getTime() < Date.now();
}

export function mapUserMetadataToSubscription(
  meta: Record<string, any> | undefined,
  packages: SupabasePackageDto[] = []
): SubscriptionInfo {
  const rawPlan = typeof meta?.plan === 'string' ? meta.plan.trim() : '';
  const rawStatus = typeof meta?.status === 'string' ? meta.status.trim() : '';
  const expiresAt = typeof meta?.expires_at === 'string' && meta.expires_at.trim()
    ? meta.expires_at.trim()
    : '2028-10-29';

  const dateExpired = rawPlan ? isExpiryDatePast(expiresAt) : false;

  if (rawStatus === 'No plan' || rawStatus === 'Expired' || (!rawPlan && rawStatus !== 'Active') || dateExpired) {
    const upperExpiredPlan = rawPlan.toUpperCase();
    let expiredTier: SubscriptionTier = 'STARTER';
    if (upperExpiredPlan.includes('ENT')) expiredTier = 'ENTERPRISE';
    else if (upperExpiredPlan.includes('PRO')) expiredTier = 'PROFESSIONAL';

    return {
      tier: expiredTier,
      planName: dateExpired && rawPlan ? `${rawPlan} (Expired)` : 'No Plan (Inactive)',
      priceMonthly: 0,
      status: 'EXPIRED',
      validUntil: dateExpired ? expiresAt : '—',
      licenseKey: meta?.utr_ref ? String(meta.utr_ref) : 'NONE',
      isPaid: false,
    };
  }

  if (rawStatus === 'Pending') {
    const upperPendingPlan = rawPlan.toUpperCase();
    let pendingTier: SubscriptionTier = 'STARTER';
    if (upperPendingPlan.includes('ENT')) pendingTier = 'ENTERPRISE';
    else if (upperPendingPlan.includes('PRO')) pendingTier = 'PROFESSIONAL';

    const matchedPendingPkg = packages.find(
      (p) =>
        p.name.toLowerCase() === rawPlan.toLowerCase() ||
        p.code.toLowerCase() === rawPlan.toLowerCase()
    );

    return {
      tier: pendingTier,
      planName: matchedPendingPkg?.name || rawPlan || 'Pending Approval',
      priceMonthly: matchedPendingPkg?.monthlyPrice ?? 0,
      status: 'TRIAL',
      validUntil: 'Pending Admin Verification',
      licenseKey: meta?.utr_ref ? String(meta.utr_ref) : 'PENDING',
      isPaid: false,
    };
  }

  const matchedPkg = packages.find(
    (p) =>
      p.name.toLowerCase() === rawPlan.toLowerCase() ||
      p.code.toLowerCase() === rawPlan.toLowerCase()
  );

  const upperPlan = (matchedPkg?.code || rawPlan).toUpperCase();
  let tier: SubscriptionTier = 'STARTER';
  if (upperPlan.includes('ENT') || upperPlan.includes('LIFETIME')) {
    tier = 'ENTERPRISE';
  } else if (upperPlan.includes('PRO') || upperPlan.includes('YEAR')) {
    tier = 'PROFESSIONAL';
  }

  return {
    tier,
    planName: matchedPkg?.name || rawPlan || packages[0]?.name || 'AMB MedERP',
    priceMonthly: matchedPkg?.monthlyPrice ?? (tier === 'ENTERPRISE' ? 3999 : tier === 'PROFESSIONAL' ? 1999 : 999),
    status: rawStatus === 'Pending' ? 'TRIAL' : 'ACTIVE',
    validUntil: expiresAt,
    licenseKey: meta?.utr_ref ? String(meta.utr_ref) : `AMB-${tier.slice(0, 3)}-SUPABASE`,
    isPaid: rawStatus !== 'Pending',
  };
}

// Resilient fetch for Windows/Node undici idle socket drops to Supabase
async function retryingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status >= 502 && res.status <= 504 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

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
      global: {
        fetch: retryingFetch,
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
    const errors: string[] = [];
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
      if (tErr) errors.push(`tenants: ${tErr.message}`);
    }

    // 2. Upsert Parties
    if (data.parties && data.parties.length > 0) {
      const formattedParties = data.parties.map((p) => ({
        id: toUuid(p.id),
        tenant_id: p.tenant_id ? toUuid(p.tenant_id) : tenantId,
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
      if (pErr) errors.push(`parties: ${pErr.message}`);
    }

    // 3. Upsert Items
    if (data.items && data.items.length > 0) {
      const formattedItems = data.items.map((i) => ({
        id: toUuid(i.id),
        tenant_id: i.tenant_id ? toUuid(i.tenant_id) : tenantId,
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
      if (iErr) errors.push(`items: ${iErr.message}`);
    }

    // 4. Upsert Batches
    if (data.batches && data.batches.length > 0) {
      const formattedBatches = data.batches.map((b) => ({
        id: toUuid(b.id),
        item_id: toUuid(b.item_id),
        tenant_id: b.tenant_id ? toUuid(b.tenant_id) : tenantId,
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
      if (bErr) errors.push(`item_batches: ${bErr.message}`);
    }

    // 5. Upsert Sales Invoices & Line Items
    if (data.invoices && data.invoices.length > 0) {
      const formattedInvoices = data.invoices.map((inv) => ({
        id: toUuid(inv.id),
        tenant_id: inv.tenant_id ? toUuid(inv.tenant_id) : tenantId,
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
      if (invErr) errors.push(`sales_invoices: ${invErr.message}`);

      const invoiceItems = data.invoices.flatMap((inv) =>
        (Array.isArray(inv.items) ? inv.items : []).map((line) => ({
          id: toUuid(line.id || `${inv.id}-${line.batch_id}-${line.item_id}`),
          invoice_id: toUuid(inv.id),
          item_id: toUuid(line.item_id),
          item_name: line.item_name,
          brand_name: line.brand_name || null,
          salt_composition: line.salt_composition || null,
          batch_id: toUuid(line.batch_id),
          batch_number: line.batch_number,
          expiry_date: line.expiry_date,
          quantity: line.quantity,
          free_quantity: line.free_quantity || 0,
          mrp: line.mrp,
          rate: line.rate,
          purchase_rate: line.purchase_rate,
          discount_percent: line.discount_percent || 0,
          tax_rate: line.tax_rate,
          taxable_amount: line.taxable_amount,
          cgst_amount: line.cgst_amount || 0,
          sgst_amount: line.sgst_amount || 0,
          igst_amount: line.igst_amount || 0,
          total_amount: line.total_amount,
        }))
      );

      if (invoiceItems.length > 0) {
        const { error: lineErr } = await client.from('sales_invoice_items').upsert(invoiceItems);
        if (lineErr) errors.push(`sales_invoice_items: ${lineErr.message}`);
      }
    }

    if (errors.length > 0) {
      return { ok: false, message: `Supabase sync errors: ${errors.join('; ')}` };
    }

    return { ok: true, message: 'All operational records successfully synchronized with Enterprise Cloud!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Sync failed: ${msg}` };
  }
}

export async function deleteOperationalRecordFromSupabase(params: {
  table: 'items' | 'item_batches' | 'parties' | 'sales_invoices';
  id: string;
}): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { ok: false, message: 'Supabase Admin service is not configured.' };
  }

  try {
    const recordId = toUuid(params.id);

    if (params.table === 'items') {
      await client.from('item_batches').delete().eq('item_id', recordId);
      const { error } = await client.from('items').delete().eq('id', recordId);
      if (error) return { ok: false, message: error.message };
    } else if (params.table === 'sales_invoices') {
      await client.from('sales_invoice_items').delete().eq('invoice_id', recordId);
      const { error } = await client.from('sales_invoices').delete().eq('id', recordId);
      if (error) return { ok: false, message: error.message };
    } else {
      const { error } = await client.from(params.table).delete().eq('id', recordId);
      if (error) return { ok: false, message: error.message };
    }

    return { ok: true, message: `Deleted from ${params.table}.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

export async function fetchPackagesFromSupabase(): Promise<SupabasePackageDto[]> {
  const client = getSupabaseAdmin();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('packages')
      .select('*')
      .order('monthly_price', { ascending: true });

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description || '',
      monthlyPrice: Number(p.monthly_price ?? p.monthlyPrice ?? 999),
      yearlyPrice: Number(p.yearly_price ?? p.yearlyPrice ?? 3999),
      interval: p.interval || 'Yearly',
      terminals: p.terminals || '1 Counter Terminal',
      status: p.status || 'Active',
      popular: Boolean(p.is_popular ?? p.popular),
      features: Array.isArray(p.features) ? p.features : [],
    }));
  } catch {
    return [];
  }
}

export async function fetchMerchantPaymentConfig(): Promise<{ upiId: string; payeeName: string }> {
  const fallbackUpi = (process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || '9409862204@kotakbank').trim();
  const fallbackName = (process.env.NEXT_PUBLIC_MERCHANT_NAME || 'Mobintix Infotech').trim();
  const client = getSupabaseAdmin();
  if (!client) return { upiId: fallbackUpi, payeeName: fallbackName };

  try {
    const { data } = await client.auth.admin.listUsers();
    const users = data?.users || [];
    const configured = users.find((u) => u.user_metadata?.merchant_upi_id);
    if (configured) {
      return {
        upiId: String(configured.user_metadata.merchant_upi_id).trim() || fallbackUpi,
        payeeName: String(configured.user_metadata.merchant_payee_name || fallbackName).trim(),
      };
    }
  } catch {
    // Fallback cleanly
  }
  return { upiId: fallbackUpi, payeeName: fallbackName };
}

export async function submitUpiPaymentForVerification(params: {
  userId?: string;
  email?: string;
  plan: string;
  plan_duration: string;
  amount: number;
  utr_ref?: string;
  utr_note?: string;
}): Promise<{ ok: boolean; subscription?: SubscriptionInfo; message: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { ok: false, message: 'Supabase Admin is not configured.' };
  }

  const cleanUtr =
    (params.utr_ref || '').trim() || `UPI-REQ-${Date.now().toString().slice(-6)}`;

  try {
    const packages = await fetchPackagesFromSupabase();
    let targetUser: any = null;

    if (params.userId) {
      const { data } = await client.auth.admin.getUserById(params.userId);
      targetUser = data?.user || null;
    }

    if (!targetUser) {
      const { data: userList } = await client.auth.admin.listUsers();
      const users = userList?.users || [];
      if (params.email) {
        targetUser = users.find((u) => u.email?.toLowerCase() === params.email!.toLowerCase()) || null;
      }
      if (!targetUser && users.length === 1) {
        targetUser = users[0];
      }
    }

    if (!targetUser) {
      return { ok: false, message: 'User account not found in Supabase Auth.' };
    }

    const currentMeta = targetUser.user_metadata || {};
    const updatedMeta = {
      ...currentMeta,
      plan: params.plan,
      status: 'Pending',
      plan_duration: params.plan_duration || '1 month',
      utr_ref: cleanUtr,
      utr_note: params.utr_note?.trim() || `UPI ₹${params.amount} (${params.plan_duration}) • Verified OK, Awaiting Admin`,
      expires_at: null,
    };

    const { error } = await client.auth.admin.updateUserById(targetUser.id, {
      user_metadata: updatedMeta,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      subscription: mapUserMetadataToSubscription(updatedMeta, packages),
      message: 'Verified OK! Payment request submitted for manual verification in Admin Panel.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

export async function updateUserSubscriptionInSupabase(params: {
  userId?: string;
  email?: string;
  plan: string;
  plan_duration?: string;
  expires_at?: string;
}): Promise<{ ok: boolean; subscription?: SubscriptionInfo; message: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { ok: false, message: 'Supabase Admin is not configured.' };
  }

  try {
    const packages = await fetchPackagesFromSupabase();
    let targetUser: any = null;

    if (params.userId) {
      const { data } = await client.auth.admin.getUserById(params.userId);
      targetUser = data?.user || null;
    }

    if (!targetUser) {
      const { data: userList } = await client.auth.admin.listUsers();
      const users = userList?.users || [];
      if (params.email) {
        targetUser = users.find((u) => u.email?.toLowerCase() === params.email!.toLowerCase()) || null;
      }
      if (!targetUser && users.length === 1) {
        targetUser = users[0];
      }
    }

    if (!targetUser) {
      return { ok: false, message: 'User not found in Supabase Auth.' };
    }

    const currentMeta = targetUser.user_metadata || {};
    const updatedMeta = {
      ...currentMeta,
      plan: params.plan,
      status: 'Active',
      plan_duration: params.plan_duration || currentMeta.plan_duration || '1 month',
      expires_at: params.expires_at || currentMeta.expires_at || '29 Oct 2028',
    };

    const { error } = await client.auth.admin.updateUserById(targetUser.id, {
      user_metadata: updatedMeta,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      subscription: mapUserMetadataToSubscription(updatedMeta, packages),
      message: `Subscription updated to ${params.plan} in Supabase.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

export function mergeTenantProfile(tenant: Tenant | null, meta?: Record<string, any>): Tenant | null {
  if (!tenant) return null;
  if (!meta) return tenant;
  return {
    ...tenant,
    logo_url: meta.logo_url ?? tenant.logo_url ?? '',
    bank_account_name: meta.bank_account_name ?? tenant.bank_account_name ?? '',
    bank_name: meta.bank_name ?? tenant.bank_name ?? '',
    bank_account_no: meta.bank_account_no ?? tenant.bank_account_no ?? '',
    bank_ifsc: meta.bank_ifsc ?? tenant.bank_ifsc ?? '',
    upi_id: meta.upi_id ?? tenant.upi_id ?? '',
    invoice_terms: meta.invoice_terms ?? tenant.invoice_terms ?? '',
    invoice_notes: meta.invoice_notes ?? tenant.invoice_notes ?? '',
  };
}

export async function saveUserAndBusinessProfileInSupabase(params: {
  userId?: string;
  currentEmail?: string;
  account: {
    name: string;
    email?: string;
    phone: string;
  };
  business: Tenant;
}): Promise<{ ok: boolean; user?: UserProfile; tenant?: Tenant; message: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { ok: false, message: 'Supabase Admin is not configured.' };
  }

  try {
    let targetUser: any = null;
    if (params.userId) {
      const { data } = await client.auth.admin.getUserById(params.userId);
      targetUser = data?.user || null;
    }
    if (!targetUser) {
      const { data: userList } = await client.auth.admin.listUsers();
      const users = userList?.users || [];
      const lookupEmail = (params.currentEmail || params.account.email || '').trim().toLowerCase();
      if (lookupEmail) {
        targetUser = users.find((u) => u.email?.toLowerCase() === lookupEmail) || null;
      }
      if (!targetUser && users.length === 1) {
        targetUser = users[0];
      }
    }

    if (!targetUser) {
      return { ok: false, message: 'Signed-in user not found in Supabase Auth.' };
    }

    const prevMeta = targetUser.user_metadata || {};
    const cleanName = params.account.name.trim() || prevMeta.name || 'Store Operator';
    const cleanPhone = params.account.phone.trim() || prevMeta.phone || '';
    const cleanEmail = (params.account.email || targetUser.email || '').trim().toLowerCase();

    const updatedMeta = {
      ...prevMeta,
      name: cleanName,
      phone: cleanPhone,
      store_name: params.business.name.trim() || prevMeta.store_name || cleanName,
      company: params.business.trade_name?.trim() || params.business.name.trim() || prevMeta.company,
      drug_license_no: params.business.drug_license_no?.trim() || '',
      gstin: params.business.gstin?.trim().toUpperCase() || '',
      logo_url: params.business.logo_url ?? prevMeta.logo_url ?? '',
      bank_account_name: params.business.bank_account_name?.trim() ?? '',
      bank_name: params.business.bank_name?.trim() ?? '',
      bank_account_no: params.business.bank_account_no?.trim() ?? '',
      bank_ifsc: params.business.bank_ifsc?.trim().toUpperCase() ?? '',
      upi_id: params.business.upi_id?.trim() ?? '',
      invoice_terms: params.business.invoice_terms ?? '',
      invoice_notes: params.business.invoice_notes ?? '',
    };

    const authUpdatePayload: { user_metadata: Record<string, any>; email?: string } = {
      user_metadata: updatedMeta,
    };
    if (cleanEmail && cleanEmail !== (targetUser.email || '').toLowerCase()) {
      authUpdatePayload.email = cleanEmail;
    }

    const { data: updatedAuth, error: authErr } = await client.auth.admin.updateUserById(
      targetUser.id,
      authUpdatePayload
    );
    if (authErr) {
      return { ok: false, message: authErr.message };
    }

    const tenantId = toUuid(params.business.id || `tenant-${cleanPhone.slice(-10) || targetUser.id}`);
    const tenantRow = {
      id: tenantId,
      name: params.business.name.trim() || cleanName,
      trade_name: params.business.trade_name?.trim() || null,
      branch_name: params.business.branch_name?.trim() || 'Main Branch',
      gstin: params.business.gstin?.trim().toUpperCase() || null,
      drug_license_no: params.business.drug_license_no?.trim() || '20B/21B-PENDING',
      fssai_no: params.business.fssai_no?.trim() || null,
      phone: cleanPhone || params.business.phone || '0000000000',
      email: cleanEmail || params.business.email || null,
      address: params.business.address?.trim() || 'Address not set',
      state: params.business.state?.trim() || 'Maharashtra',
      state_code: params.business.state_code?.trim() || '27',
      currency: params.business.currency || 'INR',
      updated_at: new Date().toISOString(),
    };

    const { error: tErr } = await client.from('tenants').upsert(tenantRow);
    if (tErr) {
      return { ok: false, message: `Tenant save error: ${tErr.message}` };
    }

    const savedUser: UserProfile = {
      id: updatedAuth.user.id,
      email: updatedAuth.user.email || cleanEmail || undefined,
      phone: cleanPhone,
      name: cleanName,
      role: ((updatedMeta.role as string)?.toUpperCase() as UserRole) || 'ADMIN',
      store_name: tenantRow.name,
      drug_license_no: tenantRow.drug_license_no,
      gstin: tenantRow.gstin || '',
      is_verified: true,
      logo_url: updatedMeta.logo_url || '',
      created_at: updatedAuth.user.created_at,
    };

    const savedTenant: Tenant = {
      ...params.business,
      id: tenantId,
      name: tenantRow.name,
      trade_name: tenantRow.trade_name || '',
      branch_name: tenantRow.branch_name,
      gstin: tenantRow.gstin || '',
      drug_license_no: tenantRow.drug_license_no,
      fssai_no: tenantRow.fssai_no || '',
      phone: tenantRow.phone,
      email: tenantRow.email || '',
      address: tenantRow.address,
      state: tenantRow.state,
      state_code: tenantRow.state_code,
      currency: tenantRow.currency,
      logo_url: updatedMeta.logo_url || '',
      bank_account_name: updatedMeta.bank_account_name,
      bank_name: updatedMeta.bank_name,
      bank_account_no: updatedMeta.bank_account_no,
      bank_ifsc: updatedMeta.bank_ifsc,
      upi_id: updatedMeta.upi_id,
      invoice_terms: updatedMeta.invoice_terms,
      invoice_notes: updatedMeta.invoice_notes,
    };

    return {
      ok: true,
      user: savedUser,
      tenant: savedTenant,
      message: 'Profile & business settings saved to Supabase.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

// ─── Cloud Sync: Pull Operational Data from Supabase ──────────────────────────

export async function fetchOperationalDataFromSupabase(params?: {
  userId?: string;
  email?: string;
  tenantId?: string;
}): Promise<{
  ok: boolean;
  message: string;
  data?: {
    tenant?: Tenant | null;
    user?: UserProfile | null;
    subscription?: SubscriptionInfo | null;
    packages?: SupabasePackageDto[];
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
    const [packages, userListRes, tenantsRes] = await Promise.all([
      fetchPackagesFromSupabase(),
      client.auth.admin.listUsers(),
      client.from('tenants').select('*').order('created_at', { ascending: false }),
    ]);

    const rawUsers = userListRes.data?.users || [];
    let matchedAuthUser: any = null;
    if (params?.userId) {
      matchedAuthUser = rawUsers.find((u) => u.id === params.userId) || null;
    }
    if (!matchedAuthUser && params?.email) {
      matchedAuthUser = rawUsers.find((u) => u.email?.toLowerCase() === params.email!.toLowerCase()) || null;
    }
    if (!matchedAuthUser && rawUsers.length === 1) {
      matchedAuthUser = rawUsers[0];
    }

    let userProfile: UserProfile | null = null;
    let subscription: SubscriptionInfo | null = null;

    if (matchedAuthUser) {
      const meta = matchedAuthUser.user_metadata || {};
      userProfile = {
        id: matchedAuthUser.id,
        email: matchedAuthUser.email || undefined,
        phone: meta.phone || '',
        name: meta.name || matchedAuthUser.email?.split('@')[0] || 'Store Operator',
        role: ((meta.role as string)?.toUpperCase() as UserRole) || 'ADMIN',
        store_name: meta.store_name || meta.company || 'AMB MedERP Store',
        drug_license_no: meta.drug_license_no || '',
        gstin: meta.gstin || '',
        is_verified: true,
        logo_url: meta.logo_url || '',
        created_at: matchedAuthUser.created_at,
      };
      subscription = mapUserMetadataToSubscription(meta, packages);
    }

    const allTenants = (tenantsRes.data as Tenant[]) || [];
    let tenant: Tenant | null = null;
    if (matchedAuthUser) {
      const expectedTenantId = toUuid(`tenant-${matchedAuthUser.id}`);
      tenant = allTenants.find((t) => t.id === expectedTenantId) || null;
    }
    if (!tenant && params?.tenantId) {
      const targetUuid = toUuid(params.tenantId);
      tenant = allTenants.find((t) => t.id === targetUuid || t.id === params.tenantId) || null;
    }
    if (!tenant && userProfile?.email) {
      tenant = allTenants.find((t) => t.email?.toLowerCase() === userProfile!.email!.toLowerCase()) || null;
    }
    if (!tenant && userProfile?.phone) {
      tenant = allTenants.find((t) => t.phone?.slice(-10) === userProfile!.phone.slice(-10)) || null;
    }
    if (!tenant && matchedAuthUser) {
      tenant = {
        id: toUuid(`tenant-${matchedAuthUser.id}`),
        name: userProfile?.store_name || 'AMB MedERP Store',
        trade_name: userProfile?.store_name || 'AMB MedERP Store',
        branch_name: 'Main Pharmacy Branch',
        gstin: userProfile?.gstin || '',
        drug_license_no: userProfile?.drug_license_no || '',
        phone: userProfile?.phone || '',
        email: matchedAuthUser.email?.endsWith('@amb-med.in') ? '' : matchedAuthUser.email || '',
        address: '',
        state: 'Maharashtra',
        state_code: '27',
        currency: 'INR',
      };
    }

    tenant = mergeTenantProfile(tenant, matchedAuthUser?.user_metadata);

    const scopedTenantId = tenant?.id;
    const itemsQ = scopedTenantId ? client.from('items').select('*').eq('tenant_id', scopedTenantId) : client.from('items').select('*');
    const batchesQ = scopedTenantId ? client.from('item_batches').select('*').eq('tenant_id', scopedTenantId) : client.from('item_batches').select('*');
    const partiesQ = scopedTenantId ? client.from('parties').select('*').eq('tenant_id', scopedTenantId) : client.from('parties').select('*');
    const invoicesQ = scopedTenantId ? client.from('sales_invoices').select('*').eq('tenant_id', scopedTenantId).order('created_at', { ascending: false }) : client.from('sales_invoices').select('*').order('created_at', { ascending: false });

    const [iRes, bRes, pRes, invRes, lineRes] = await Promise.all([
      itemsQ,
      batchesQ,
      partiesQ,
      invoicesQ,
      client.from('sales_invoice_items').select('*'),
    ]);

    const items = (iRes.data as Item[]) || [];
    const batches = (bRes.data as ItemBatch[]) || [];
    const parties = (pRes.data as Party[]) || [];
    const rawInvoices = (invRes.data as any[]) || [];
    const allLines = (lineRes.data as SalesInvoiceItem[]) || [];

    const invoices: SalesInvoice[] = rawInvoices.map((inv) => ({
      ...inv,
      items: allLines.filter((l) => l.invoice_id === inv.id),
    }));

    return {
      ok: true,
      message: 'Successfully retrieved records from Enterprise Cloud.',
      data: { tenant, user: userProfile, subscription, packages, items, batches, parties, invoices },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to fetch data: ${msg}` };
  }
}

// ─── User Authentication via Supabase Admin ───────────────────────────────────

export function normalizeAuthPassword(pwd?: string): string {
  const trimmed = pwd?.trim() || '';
  if (!trimmed) return 'amb_1234_pin';
  if (trimmed.length < 6) {
    // Supabase Auth requires minimum 6 characters. If user provides a 4- or 5-digit PIN,
    // pad it deterministically so Supabase accepts it without throwing 'Password should be at least 6 characters'.
    return `amb_${trimmed}_pin`;
  }
  return trimmed;
}

export async function adminRegisterUser(data: {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  storeName: string;
  drugLicenseNo: string;
  gstin?: string;
  role?: UserRole;
}): Promise<{ success: boolean; user?: UserProfile; tenant?: Tenant; subscription?: SubscriptionInfo; error?: string }> {
  const client = getSupabaseAdmin();
  if (!client) {
    return { success: false, error: 'Enterprise cloud service is unavailable.' };
  }

  const cleanPhone = data.phone.replace(/[^0-9]/g, '').slice(-10);
  if (cleanPhone.length < 10) {
    return { success: false, error: 'Please provide a valid 10-digit mobile number.' };
  }
  if (!data.name?.trim() || !data.storeName?.trim()) {
    return { success: false, error: 'Pharmacist name and medical store name are required.' };
  }
  if (!data.drugLicenseNo?.trim()) {
    return { success: false, error: 'Drug License No. (D.L. 20B/21B) is mandatory.' };
  }

  const providedEmail = data.email?.trim().toLowerCase() || '';
  const email = providedEmail || `${cleanPhone}@amb-med.in`;
  const password = normalizeAuthPassword(data.password);

  const metadata = {
    name: data.name.trim(),
    phone: cleanPhone,
    store_name: data.storeName.trim(),
    drug_license_no: data.drugLicenseNo.trim(),
    gstin: data.gstin?.trim().toUpperCase() || '',
    role: data.role || 'ADMIN',
    status: 'No plan',
    plan: null,
  };

  try {
    // 1. Check if user already exists in Supabase Auth
    const { data: userList } = await client.auth.admin.listUsers();
    const existing = userList?.users.find(
      (u) =>
        u.email?.toLowerCase() === email ||
        (u.user_metadata?.phone && u.user_metadata.phone.slice(-10) === cleanPhone)
    );

    if (existing) {
      return {
        success: false,
        error: 'An account with this email or mobile number is already registered. Please sign in instead.',
      };
    }

    // Create new confirmed user with No plan (admin assigns package in Admin Console)
    const { data: created, error: cErr } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (cErr || !created.user) {
      return { success: false, error: cErr?.message || 'Failed to create user in Supabase Auth.' };
    }
    const authUser = created.user;

    // 2. Upsert isolated Tenant keyed by Auth user id
    const tenantId = toUuid(`tenant-${authUser.id}`);
    const newTenant: Tenant = {
      id: tenantId,
      name: data.storeName.trim(),
      trade_name: data.storeName.trim(),
      branch_name: 'Main Pharmacy Branch',
      gstin: data.gstin?.trim().toUpperCase() || '',
      drug_license_no: data.drugLicenseNo.trim(),
      phone: cleanPhone,
      email: providedEmail,
      address: '',
      state: 'Maharashtra',
      state_code: '27',
      currency: 'INR',
    };

    const { error: tErr } = await client.from('tenants').upsert({
      id: tenantId,
      name: newTenant.name,
      trade_name: newTenant.trade_name,
      branch_name: newTenant.branch_name,
      gstin: newTenant.gstin || null,
      drug_license_no: newTenant.drug_license_no,
      phone: newTenant.phone,
      email: newTenant.email || null,
      address: newTenant.address || null,
      state: newTenant.state,
      state_code: newTenant.state_code,
      currency: newTenant.currency,
    });
    if (tErr) {
      console.warn('Tenant row upsert warning during registration:', tErr.message);
    }

    const profile: UserProfile = {
      id: authUser.id,
      email: providedEmail || undefined,
      phone: cleanPhone,
      name: data.name.trim(),
      role: data.role || 'ADMIN',
      store_name: data.storeName.trim(),
      drug_license_no: data.drugLicenseNo.trim(),
      gstin: data.gstin?.trim().toUpperCase() || '',
      is_verified: true,
      created_at: authUser.created_at || new Date().toISOString(),
    };

    const subscription = mapUserMetadataToSubscription(metadata, []);

    return { success: true, user: profile, tenant: newTenant, subscription };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Registration error: ${msg}` };
  }
}

export async function adminLoginUser(
  identifier: string,
  password?: string
): Promise<{ success: boolean; user?: UserProfile; tenant?: Tenant; subscription?: SubscriptionInfo; error?: string }> {
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
      
      const candidatePasswords = [
        userPassword,
        normalizeAuthPassword(userPassword),
      ].filter((p, idx, arr) => arr.indexOf(p) === idx && p.length >= 6);

      let signedIn = false;
      for (const p of candidatePasswords) {
        const { error: signErr } = await anonClient.auth.signInWithPassword({
          email: matchedUser.email,
          password: p,
        });
        if (!signErr) {
          signedIn = true;
          break;
        }
      }

      if (!signedIn) {
        // If password failed
        return {
          success: false,
          error: 'Incorrect terminal password or security PIN. Please try again.',
        };
      }
    }

    // 3. Build user profile, subscription, and tenant
    const meta = matchedUser.user_metadata || {};
    const profile: UserProfile = {
      id: matchedUser.id,
      email: matchedUser.email || undefined,
      phone: meta.phone || cleanPhone || '',
      name: meta.name || matchedUser.email?.split('@')[0] || 'Store Operator',
      role: ((meta.role as string)?.toUpperCase() as UserRole) || 'ADMIN',
      store_name: meta.store_name || meta.company || 'AMB MedERP Store',
      drug_license_no: meta.drug_license_no || '',
      gstin: meta.gstin || '',
      is_verified: true,
      logo_url: meta.logo_url || '',
      created_at: matchedUser.created_at,
    };

    const packages = await fetchPackagesFromSupabase();
    const subscription = mapUserMetadataToSubscription(meta, packages);

    // 4. Fetch associated tenant for this user
    const expectedTenantId = toUuid(`tenant-${matchedUser.id}`);
    const { data: tenants } = await client.from('tenants').select('*');
    const tenantList = (tenants as Tenant[]) || [];
    const matchedTenant =
      tenantList.find((t) => t.id === expectedTenantId) ||
      tenantList.find((t) => matchedUser.email && t.email?.toLowerCase() === matchedUser.email.toLowerCase()) ||
      tenantList.find((t) => profile.phone && t.phone?.slice(-10) === profile.phone.slice(-10)) ||
      {
        id: expectedTenantId,
        name: profile.store_name || 'AMB MedERP Store',
        trade_name: profile.store_name || 'AMB MedERP Store',
        branch_name: 'Main Pharmacy Branch',
        gstin: profile.gstin || '',
        drug_license_no: profile.drug_license_no || '',
        phone: profile.phone || '',
        email: matchedUser.email?.endsWith('@amb-med.in') ? '' : matchedUser.email || '',
        address: '',
        state: 'Maharashtra',
        state_code: '27',
        currency: 'INR',
      };
    const tenant = mergeTenantProfile(matchedTenant, meta) || undefined;

    return { success: true, user: profile, tenant, subscription };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Authentication error: ${msg}` };
  }
}
