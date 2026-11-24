export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'DOCTOR';

export interface Tenant {
  id: string;
  name: string;
  trade_name: string;
  branch_name: string;
  gstin: string;
  drug_license_no: string;
  fssai_no?: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  state_code: string;
  currency: string;
}

export interface Party {
  id: string;
  tenant_id?: string;
  party_type: PartyType;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  drug_license_no?: string;
  address?: string;
  credit_limit: number;
  credit_days: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  tenant_id?: string;
  item_code: string;
  name: string;
  brand_name: string;
  salt_composition: string; // e.g. "Amoxicillin 500mg + Clavulanic Acid 125mg"
  category: string; // Antibiotic, Analgesic, PPI, Cardiac, Diabetic, etc.
  manufacturer: string; // Alkem, Cipla, Sun Pharma, Abbott, etc.
  hsn_code: string; // e.g. "300490"
  unit: string; // Strip, Bottle, Box, Vial, Tube
  pack_size: string; // "10 Tablets", "100ml Syrup"
  conversion_factor: number; // e.g. 1 Box = 10 Strips
  tax_rate: number; // GST % (5, 12, 18)
  cess_rate: number;
  reorder_level: number;
  is_prescription_required: boolean; // Schedule H / H1
  storage_condition?: string; // "Store below 25°C", "2-8°C Refrigerated"
  created_at: string;
}

export interface ItemBatch {
  id: string;
  tenant_id?: string;
  item_id: string;
  batch_number: string;
  mfg_date: string; // YYYY-MM
  expiry_date: string; // YYYY-MM
  mrp: number;
  purchase_rate: number;
  sale_rate: number;
  quantity_available: number;
  rack_location?: string;
  created_at: string;
}

export interface SalesInvoiceItem {
  id: string;
  invoice_id?: string;
  item_id: string;
  item_name: string;
  brand_name: string;
  salt_composition: string;
  batch_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  free_quantity: number; // BOGO scheme quantity e.g. 10+1 free
  mrp: number;
  rate: number;
  purchase_rate: number; // for live margin calculations
  discount_percent: number;
  tax_rate: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'HELD';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT';

export interface SalesInvoice {
  id: string;
  tenant_id?: string;
  invoice_number: string;
  invoice_date: string;
  invoice_time: string;
  party_id: string;
  party_name: string;
  party_gstin?: string;
  doctor_name?: string;
  patient_name?: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  total_amount: number;
  total_cost: number;
  profit_margin_amount: number;
  profit_margin_percent: number;
  payment_status: PaymentStatus;
  payment_mode: PaymentMode;
  amount_received: number;
  upi_ref_id?: string;
  irn_number?: string;
  e_way_bill_no?: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  item_id: string;
  item_name: string;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  quantity: number;
  free_quantity: number;
  purchase_rate: number;
  mrp: number;
  sale_rate: number;
  tax_rate: number;
  taxable_amount: number;
  total_amount: number;
}

export interface PurchaseInvoice {
  id: string;
  tenant_id?: string;
  supplier_id: string;
  supplier_name: string;
  supplier_invoice_no: string;
  invoice_date: string;
  items: PurchaseInvoiceItem[];
  subtotal: number;
  tax_amount: number;
  round_off: number;
  total_amount: number;
  payment_status: 'PAID' | 'PENDING';
  created_at: string;
}

export interface SubstituteMedicine {
  item: Item;
  batches: ItemBatch[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  isSameBrand: boolean;
}

export type UserRole = 'ADMIN' | 'PHARMACIST' | 'CASHIER';

export type SubscriptionTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  planName: string;
  priceMonthly: number;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED';
  validUntil: string;
  licenseKey: string;
  isPaid: boolean;
}

export interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: UserRole;
  store_name: string;
  drug_license_no?: string;
  gstin?: string;
  is_verified: boolean;
  avatar_url?: string;
  created_at: string;
}

