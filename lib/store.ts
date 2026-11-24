'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Tenant, Party, Item, ItemBatch, SalesInvoice, 
  SalesInvoiceItem, SubstituteMedicine, UserProfile, UserRole 
} from '@/types/erp';
import { 
  initialTenant, initialParties, initialItems, 
  initialBatches, initialSalesInvoices, initialUsers 
} from './mock-data';
import { sounds } from './audio';
import { 
  getSupabase, 
  isSupabaseConfigured, 
  fetchAllSupabaseData, 
  supabaseSignIn, 
  supabaseSignUp,
  pushAllDataToSupabase 
} from './supabase';

const STORAGE_KEYS = {
  TENANT: 'amb_erp_tenant',
  PARTIES: 'amb_erp_parties',
  ITEMS: 'amb_erp_items',
  BATCHES: 'amb_erp_batches',
  INVOICES: 'amb_erp_invoices',
  USERS: 'amb_erp_users',
  CURRENT_USER: 'amb_erp_current_user',
};

// Safe localStorage helper
function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

export function useERPStore() {
  const [tenant, setTenant] = useState<Tenant>(initialTenant);
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [batches, setBatches] = useState<ItemBatch[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 1. Hydrate from localStorage first
    const storedTenant = getStored(STORAGE_KEYS.TENANT, initialTenant);
    const storedParties = getStored(STORAGE_KEYS.PARTIES, initialParties);
    const storedItems = getStored(STORAGE_KEYS.ITEMS, initialItems);
    const storedBatches = getStored(STORAGE_KEYS.BATCHES, initialBatches);
    const storedInvoices = getStored(STORAGE_KEYS.INVOICES, initialSalesInvoices);
    const storedUsers = getStored(STORAGE_KEYS.USERS, []);
    const storedCurrentUser = getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);

    setTenant(storedTenant);
    setParties(storedParties);
    setItems(storedItems);
    setBatches(storedBatches);
    setInvoices(storedInvoices);
    setUsers(storedUsers);

    if (storedCurrentUser && storedCurrentUser.phone === '9820144552' && storedCurrentUser.name === 'Rajesh Sharma') {
      setCurrentUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } else {
      setCurrentUser(storedCurrentUser);
    }
    setIsLoaded(true);

    // 2. Fetch live database records from Enterprise Cloud immediately
    if (typeof window !== 'undefined') {
      fetch('/api/cloud/sync')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            if (json.data.items && json.data.items.length > 0) {
              setItems(json.data.items);
              setStored(STORAGE_KEYS.ITEMS, json.data.items);
            }
            if (json.data.batches && json.data.batches.length > 0) {
              setBatches(json.data.batches);
              setStored(STORAGE_KEYS.BATCHES, json.data.batches);
            }
            if (json.data.parties && json.data.parties.length > 0) {
              setParties(json.data.parties);
              setStored(STORAGE_KEYS.PARTIES, json.data.parties);
            }
            if (json.data.invoices && json.data.invoices.length > 0) {
              setInvoices(json.data.invoices);
              setStored(STORAGE_KEYS.INVOICES, json.data.invoices);
            }
            if (json.data.tenant) {
              setTenant(json.data.tenant);
              setStored(STORAGE_KEYS.TENANT, json.data.tenant);
            }
          }
        })
        .catch((e) => {
          console.warn('Initial Enterprise Cloud sync skipped:', e);
        });
    }
  }, []);

  // Helper to trigger background synchronization to Enterprise Cloud
  const triggerCloudPush = (data: {
    tenant?: Tenant;
    parties?: Party[];
    items?: Item[];
    batches?: ItemBatch[];
    invoices?: SalesInvoice[];
  }) => {
    if (typeof window === 'undefined') return;
    fetch('/api/cloud/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((err) => {
      console.warn('Background Enterprise Cloud push failed:', err);
    });
  };

  // Save changes to localStorage & trigger cloud backup
  const persistTenant = (t: Tenant) => {
    setTenant(t);
    setStored(STORAGE_KEYS.TENANT, t);
    triggerCloudPush({ tenant: t, parties, items, batches, invoices });
  };

  const persistParties = (newParties: Party[]) => {
    setParties(newParties);
    setStored(STORAGE_KEYS.PARTIES, newParties);
    triggerCloudPush({ tenant, parties: newParties, items, batches, invoices });
  };

  const persistItems = (newItems: Item[]) => {
    setItems(newItems);
    setStored(STORAGE_KEYS.ITEMS, newItems);
    triggerCloudPush({ tenant, parties, items: newItems, batches, invoices });
  };

  const persistBatches = (newBatches: ItemBatch[]) => {
    setBatches(newBatches);
    setStored(STORAGE_KEYS.BATCHES, newBatches);
    triggerCloudPush({ tenant, parties, items, batches: newBatches, invoices });
  };

  const persistInvoices = (newInvoices: SalesInvoice[]) => {
    setInvoices(newInvoices);
    setStored(STORAGE_KEYS.INVOICES, newInvoices);
    triggerCloudPush({ tenant, parties, items, batches, invoices: newInvoices });
  };

  // Sync with Supabase on-demand
  const syncWithSupabase = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/cloud/sync');
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.items && json.data.items.length > 0) {
          setItems(json.data.items);
          setStored(STORAGE_KEYS.ITEMS, json.data.items);
        }
        if (json.data.batches && json.data.batches.length > 0) {
          setBatches(json.data.batches);
          setStored(STORAGE_KEYS.BATCHES, json.data.batches);
        }
        if (json.data.parties && json.data.parties.length > 0) {
          setParties(json.data.parties);
          setStored(STORAGE_KEYS.PARTIES, json.data.parties);
        }
        if (json.data.invoices && json.data.invoices.length > 0) {
          setInvoices(json.data.invoices);
          setStored(STORAGE_KEYS.INVOICES, json.data.invoices);
        }
        if (json.data.tenant) {
          setTenant(json.data.tenant);
          setStored(STORAGE_KEYS.TENANT, json.data.tenant);
        }
        return { success: true, message: 'All records successfully synchronized from Enterprise Cloud!' };
      }
      return { success: false, message: json.error || 'Enterprise cloud returned empty record set' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Push all local data into Supabase tables via server-side endpoint
  const pushToSupabase = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/cloud/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant,
          parties,
          items,
          batches,
          invoices,
        }),
      });
      const json = await res.json();
      return { ok: json.success, message: json.message || json.error };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: msg };
    } finally {
      setIsSyncing(false);
    }
  }, [tenant, parties, items, batches, invoices]);

  // Search items by brand name, salt/molecule composition, or item code
  const searchItems = useCallback((query: string): (Item & { batches: ItemBatch[]; totalStock: number })[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    return items
      .filter((itm) => {
        return (
          itm.name.toLowerCase().includes(q) ||
          itm.brand_name.toLowerCase().includes(q) ||
          itm.item_code.toLowerCase().includes(q) ||
          itm.salt_composition.toLowerCase().includes(q) ||
          itm.manufacturer.toLowerCase().includes(q)
        );
      })
      .map((itm) => {
        const itemBatches = batches.filter((b) => b.item_id === itm.id);
        const totalStock = itemBatches.reduce((acc, b) => acc + b.quantity_available, 0);
        return {
          ...itm,
          batches: itemBatches,
          totalStock,
        };
      });
  }, [items, batches]);

  // Smart Substitute Finder: Find other medicines with the exact or matching generic salt
  const findSubstitutes = useCallback((itemId: string): SubstituteMedicine[] => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return [];

    const targetSalt = targetItem.salt_composition.toLowerCase().trim();

    return items
      .filter((itm) => {
        // match salt composition
        const itmSalt = itm.salt_composition.toLowerCase().trim();
        return (
          itmSalt === targetSalt ||
          (targetSalt.length > 5 && itmSalt.includes(targetSalt.slice(0, 15)))
        );
      })
      .map((itm) => {
        const itemBatches = batches.filter((b) => b.item_id === itm.id && b.quantity_available > 0);
        const totalStock = itemBatches.reduce((acc, b) => acc + b.quantity_available, 0);
        const prices = itemBatches.map((b) => b.sale_rate);
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;

        return {
          item: itm,
          batches: itemBatches,
          totalStock,
          minPrice,
          maxPrice,
          isSameBrand: itm.id === targetItem.id,
        };
      })
      .sort((a, b) => b.totalStock - a.totalStock);
  }, [items, batches]);

  // Create Sales Invoice & deduct stock automatically
  const createSalesInvoice = useCallback((invoiceData: Omit<SalesInvoice, 'id' | 'created_at'>): SalesInvoice => {
    const newInvoice: SalesInvoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    // Deduct stock from item_batches
    const updatedBatches = batches.map((batch) => {
      const soldItem = invoiceData.items.find((i) => i.batch_id === batch.id);
      if (soldItem) {
        const totalDeduction = soldItem.quantity + (soldItem.free_quantity || 0);
        return {
          ...batch,
          quantity_available: Math.max(0, batch.quantity_available - totalDeduction),
        };
      }
      return batch;
    });

    // If payment mode is CREDIT or payment status is PENDING, increase party's balance
    let updatedParties = parties;
    if (invoiceData.party_id && (invoiceData.payment_mode === 'CREDIT' || invoiceData.payment_status === 'PENDING')) {
      updatedParties = parties.map((p) => {
        if (p.id === invoiceData.party_id) {
          return {
            ...p,
            current_balance: p.current_balance + invoiceData.total_amount,
          };
        }
        return p;
      });
      persistParties(updatedParties);
    }

    const updatedInvoices = [newInvoice, ...invoices];
    persistBatches(updatedBatches);
    persistInvoices(updatedInvoices);

    // Sync invoice to Supabase in background
    const client = getSupabase();
    if (client) {
      const { items: _, ...invoiceRecord } = newInvoice;
      client.from('sales_invoices').insert([invoiceRecord]).then();
    }

    sounds.playSave();
    return newInvoice;
  }, [batches, invoices, parties]);

  // Inward Purchase entry
  const addPurchaseBill = useCallback((supplierId: string, invoiceNo: string, lines: {
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
  }[]) => {
    const newBatches = [...batches];

    lines.forEach((line) => {
      const existingBatchIndex = newBatches.findIndex(
        (b) => b.item_id === line.item_id && b.batch_number.toUpperCase() === line.batch_number.toUpperCase()
      );

      const totalQty = line.quantity + (line.free_quantity || 0);

      if (existingBatchIndex >= 0) {
        newBatches[existingBatchIndex] = {
          ...newBatches[existingBatchIndex],
          quantity_available: newBatches[existingBatchIndex].quantity_available + totalQty,
          purchase_rate: line.purchase_rate,
          sale_rate: line.sale_rate,
          mrp: line.mrp,
        };
      } else {
        newBatches.push({
          id: `bat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          item_id: line.item_id,
          batch_number: line.batch_number.toUpperCase(),
          mfg_date: line.mfg_date,
          expiry_date: line.expiry_date,
          mrp: line.mrp,
          purchase_rate: line.purchase_rate,
          sale_rate: line.sale_rate,
          quantity_available: totalQty,
          created_at: new Date().toISOString(),
        });
      }
    });

    persistBatches(newBatches);
    sounds.playSave();
  }, [batches]);

  // Add new medicine / item
  const addItem = useCallback((itemData: Omit<Item, 'id' | 'created_at'>) => {
    const newItem: Item = {
      ...itemData,
      id: `itm-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    persistItems([...items, newItem]);
    const client = getSupabase();
    if (client) client.from('items').insert([newItem]).then();
    sounds.playScan();
    return newItem;
  }, [items]);

  // Add new batch directly
  const addBatch = useCallback((batchData: Omit<ItemBatch, 'id' | 'created_at'>) => {
    const newBatch: ItemBatch = {
      ...batchData,
      id: `bat-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    persistBatches([...batches, newBatch]);
    const client = getSupabase();
    if (client) client.from('item_batches').insert([newBatch]).then();
    sounds.playScan();
    return newBatch;
  }, [batches]);

  // Add new party
  const addParty = useCallback((partyData: Omit<Party, 'id' | 'created_at'>) => {
    const newParty: Party = {
      ...partyData,
      id: `pty-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    persistParties([...parties, newParty]);
    const client = getSupabase();
    if (client) client.from('parties').insert([newParty]).then();
    sounds.playSave();
    return newParty;
  }, [parties]);

  // Dashboard & KPI Analytics calculations
  const getStats = useCallback(() => {
    // Check if on client or prerender
    const currentYear = 2026;
    const currentMonth = 11;

    const todayInvoices = invoices;

    const totalRevenueToday = todayInvoices.reduce((sum, i) => sum + i.total_amount, 0);
    const totalProfitToday = todayInvoices.reduce((sum, i) => sum + i.profit_margin_amount, 0);
    const totalInvoicesCount = todayInvoices.length;

    // Outstanding customer receivables
    const totalReceivables = parties
      .filter((p) => p.party_type === 'CUSTOMER')
      .reduce((sum, p) => sum + p.current_balance, 0);

    let nearExpiryCount = 0;
    let expiredCount = 0;
    let nearExpiryValuation = 0;

    batches.forEach((b) => {
      if (b.quantity_available <= 0) return;
      const [yearStr, monthStr] = b.expiry_date.split('-');
      const expYear = parseInt(yearStr, 10);
      const expMonth = parseInt(monthStr, 10);

      const monthsDiff = (expYear - currentYear) * 12 + (expMonth - currentMonth);

      if (monthsDiff < 0) {
        expiredCount += 1;
      } else if (monthsDiff <= 3) {
        nearExpiryCount += 1;
        nearExpiryValuation += b.quantity_available * b.purchase_rate;
      }
    });

    // Low stock items count
    let lowStockCount = 0;
    items.forEach((itm) => {
      const itmStock = batches
        .filter((b) => b.item_id === itm.id)
        .reduce((sum, b) => sum + b.quantity_available, 0);
      if (itmStock <= itm.reorder_level) {
        lowStockCount += 1;
      }
    });

    return {
      totalRevenueToday,
      totalProfitToday,
      totalInvoicesCount,
      totalReceivables,
      nearExpiryCount,
      expiredCount,
      nearExpiryValuation,
      lowStockCount,
      totalItemsCount: items.length,
      totalBatchesCount: batches.length,
    };
  }, [invoices, parties, batches, items]);

  // User Authentication & Session (Phone Number / Mobile Login)
  const loginWithPhone = useCallback((phoneNumber: string, otpOrPin?: string): { success: boolean; user: UserProfile; isNew?: boolean } => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '').slice(-10);
    let matchedUser = users.find((u) => u.phone.slice(-10) === cleanPhone);

    if (!matchedUser) {
      matchedUser = {
        id: `usr-${Date.now()}`,
        phone: cleanPhone,
        name: `Pharmacist (${cleanPhone.slice(-4)})`,
        role: 'PHARMACIST',
        store_name: tenant.name || 'AMB MedERP Store',
        drug_license_no: tenant.drug_license_no,
        gstin: tenant.gstin,
        is_verified: true,
        created_at: new Date().toISOString(),
      };
      const updatedUsers = [...users, matchedUser];
      setUsers(updatedUsers);
      setStored(STORAGE_KEYS.USERS, updatedUsers);
    }

    setCurrentUser(matchedUser);
    setStored(STORAGE_KEYS.CURRENT_USER, matchedUser);
    sounds.playSave();
    return { success: true, user: matchedUser };
  }, [users, tenant]);

  const registerWithPhone = useCallback(async (data: {
    phone: string;
    name: string;
    storeName: string;
    drugLicenseNo: string;
    gstin?: string;
    role?: UserRole;
    pin?: string;
    email?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    const cleanPhone = data.phone.replace(/[^0-9]/g, '').slice(-10);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          phone: cleanPhone,
          email: data.email,
          password: data.pin || '1234',
          storeName: data.storeName,
          drugLicenseNo: data.drugLicenseNo,
          gstin: data.gstin,
          role: data.role || 'ADMIN',
        }),
      });

      const json = await res.json();
      if (!json.success) {
        return { success: false, error: json.error || 'Registration failed' };
      }

      const registeredUser = json.user as UserProfile;
      const registeredTenant = json.tenant as Tenant;

      const updatedUsers = [...users.filter((u) => u.phone.slice(-10) !== cleanPhone), registeredUser];
      setUsers(updatedUsers);
      setStored(STORAGE_KEYS.USERS, updatedUsers);

      if (registeredTenant) {
        setTenant(registeredTenant);
        setStored(STORAGE_KEYS.TENANT, registeredTenant);
      }

      setCurrentUser(registeredUser);
      setStored(STORAGE_KEYS.CURRENT_USER, registeredUser);
      sounds.playSave();

      triggerCloudPush({
        tenant: registeredTenant || tenant,
        parties,
        items,
        batches,
        invoices,
      });

      return { success: true, user: registeredUser };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, [users, tenant, parties, items, batches, invoices]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    const client = getSupabase();
    if (client) {
      client.auth.signOut().then();
    }
  }, []);

  const switchUser = useCallback((userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      setStored(STORAGE_KEYS.CURRENT_USER, target);
      sounds.playScan();
    }
  }, [users]);

  // ─── Direct Enterprise Cloud & Terminal Auth operations ────────────────────────

  const loginWithSupabase = useCallback(async (emailOrPhone: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: emailOrPhone, password }),
      });

      const json = await res.json();
      if (!json.success) {
        return { success: false, error: json.error || 'Authentication failed' };
      }

      const loggedInUser = json.user as UserProfile;
      setCurrentUser(loggedInUser);
      setStored(STORAGE_KEYS.CURRENT_USER, loggedInUser);

      if (json.tenant) {
        setTenant(json.tenant);
        setStored(STORAGE_KEYS.TENANT, json.tenant);
      }

      const cleanPhone = loggedInUser.phone.slice(-10);
      const updatedUsers = [...users.filter((u) => u.phone.slice(-10) !== cleanPhone), loggedInUser];
      setUsers(updatedUsers);
      setStored(STORAGE_KEYS.USERS, updatedUsers);

      sounds.playSave();
      return { success: true, user: loggedInUser };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, [users]);

  // ─── DELETE operations ───────────────────────────────────────────────────────

  const deleteItem = useCallback((itemId: string) => {
    // Remove item AND all its batches
    persistItems(items.filter((i) => i.id !== itemId));
    persistBatches(batches.filter((b) => b.item_id !== itemId));
    const client = getSupabase();
    if (client) {
      client.from('item_batches').delete().eq('item_id', itemId).then();
      client.from('items').delete().eq('id', itemId).then();
    }
    sounds.playScan();
  }, [items, batches]);

  const deleteBatch = useCallback((batchId: string) => {
    persistBatches(batches.filter((b) => b.id !== batchId));
    const client = getSupabase();
    if (client) client.from('item_batches').delete().eq('id', batchId).then();
    sounds.playScan();
  }, [batches]);

  const deleteParty = useCallback((partyId: string) => {
    persistParties(parties.filter((p) => p.id !== partyId));
    const client = getSupabase();
    if (client) client.from('parties').delete().eq('id', partyId).then();
    sounds.playScan();
  }, [parties]);

  const deleteInvoice = useCallback((invoiceId: string) => {
    persistInvoices(invoices.filter((i) => i.id !== invoiceId));
    const client = getSupabase();
    if (client) client.from('sales_invoices').delete().eq('id', invoiceId).then();
    sounds.playScan();
  }, [invoices]);

  const deleteUser = useCallback((userId: string) => {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    setStored(STORAGE_KEYS.USERS, updated);
    sounds.playScan();
  }, [users]);

  // Clear / Wipe all transactional data for fresh clean slate
  const clearAllData = useCallback(() => {
    setParties([]);
    setItems([]);
    setBatches([]);
    setInvoices([]);
    setStored(STORAGE_KEYS.PARTIES, []);
    setStored(STORAGE_KEYS.ITEMS, []);
    setStored(STORAGE_KEYS.BATCHES, []);
    setStored(STORAGE_KEYS.INVOICES, []);
    sounds.playScan();
  }, []);

  // Reset to initial demo data
  const resetToDemoData = () => {
    setTenant(initialTenant);
    setParties(initialParties);
    setItems(initialItems);
    setBatches(initialBatches);
    setInvoices(initialSalesInvoices);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setStored(STORAGE_KEYS.TENANT, initialTenant);
    setStored(STORAGE_KEYS.PARTIES, initialParties);
    setStored(STORAGE_KEYS.ITEMS, initialItems);
    setStored(STORAGE_KEYS.BATCHES, initialBatches);
    setStored(STORAGE_KEYS.INVOICES, initialSalesInvoices);
    setStored(STORAGE_KEYS.USERS, initialUsers);
    setStored(STORAGE_KEYS.CURRENT_USER, initialUsers[0]);
    sounds.playSave();
  };

  return {
    tenant,
    parties,
    items,
    batches,
    invoices,
    users,
    currentUser,
    isLoaded,
    isSyncing,
    searchItems,
    findSubstitutes,
    createSalesInvoice,
    addPurchaseBill,
    addItem,
    addBatch,
    addParty,
    deleteItem,
    deleteBatch,
    deleteParty,
    deleteInvoice,
    deleteUser,
    loginWithPhone,
    loginWithSupabase,
    registerWithPhone,
    logout,
    switchUser,
    getStats,
    resetToDemoData,
    clearAllData,
    syncWithSupabase,
    pushToSupabase,
    setTenant: persistTenant,
  };
}
