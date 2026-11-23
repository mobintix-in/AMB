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
import { supabase, isSupabaseConfigured } from './supabase';

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
  const [parties, setParties] = useState<Party[]>(initialParties);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [batches, setBatches] = useState<ItemBatch[]>(initialBatches);
  const [invoices, setInvoices] = useState<SalesInvoice[]>(initialSalesInvoices);
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(initialUsers[0]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setTenant(getStored(STORAGE_KEYS.TENANT, initialTenant));
    setParties(getStored(STORAGE_KEYS.PARTIES, initialParties));
    setItems(getStored(STORAGE_KEYS.ITEMS, initialItems));
    setBatches(getStored(STORAGE_KEYS.BATCHES, initialBatches));
    setInvoices(getStored(STORAGE_KEYS.INVOICES, initialSalesInvoices));
    setUsers(getStored(STORAGE_KEYS.USERS, initialUsers));
    setCurrentUser(getStored(STORAGE_KEYS.CURRENT_USER, initialUsers[0]));
    setIsLoaded(true);
  }, []);

  // Save changes to localStorage
  const persistTenant = (t: Tenant) => {
    setTenant(t);
    setStored(STORAGE_KEYS.TENANT, t);
  };

  const persistParties = (newParties: Party[]) => {
    setParties(newParties);
    setStored(STORAGE_KEYS.PARTIES, newParties);
  };

  const persistItems = (newItems: Item[]) => {
    setItems(newItems);
    setStored(STORAGE_KEYS.ITEMS, newItems);
  };

  const persistBatches = (newBatches: ItemBatch[]) => {
    setBatches(newBatches);
    setStored(STORAGE_KEYS.BATCHES, newBatches);
  };

  const persistInvoices = (newInvoices: SalesInvoice[]) => {
    setInvoices(newInvoices);
    setStored(STORAGE_KEYS.INVOICES, newInvoices);
  };

  // Sync with Supabase if configured
  const syncWithSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsSyncing(true);
    try {
      // Fetch remote items
      const { data: remoteItems } = await supabase.from('items').select('*');
      if (remoteItems && remoteItems.length > 0) {
        setItems(remoteItems);
        setStored(STORAGE_KEYS.ITEMS, remoteItems);
      }

      // Fetch remote batches
      const { data: remoteBatches } = await supabase.from('item_batches').select('*');
      if (remoteBatches && remoteBatches.length > 0) {
        setBatches(remoteBatches);
        setStored(STORAGE_KEYS.BATCHES, remoteBatches);
      }
    } catch (err) {
      console.error('Supabase sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

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

  const registerWithPhone = useCallback((data: {
    phone: string;
    name: string;
    storeName: string;
    drugLicenseNo: string;
    gstin?: string;
    role?: UserRole;
  }): { success: boolean; user: UserProfile } => {
    const cleanPhone = data.phone.replace(/[^0-9]/g, '').slice(-10);
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      phone: cleanPhone,
      name: data.name,
      role: data.role || 'ADMIN',
      store_name: data.storeName || tenant.name,
      drug_license_no: data.drugLicenseNo || tenant.drug_license_no,
      gstin: data.gstin || '',
      is_verified: true,
      created_at: new Date().toISOString(),
    };

    const updatedUsers = [...users.filter((u) => u.phone.slice(-10) !== cleanPhone), newUser];
    setUsers(updatedUsers);
    setStored(STORAGE_KEYS.USERS, updatedUsers);

    if (data.storeName) {
      const updatedTenant: Tenant = {
        ...tenant,
        name: data.storeName,
        drug_license_no: data.drugLicenseNo || tenant.drug_license_no,
        gstin: data.gstin || tenant.gstin,
      };
      setTenant(updatedTenant);
      setStored(STORAGE_KEYS.TENANT, updatedTenant);
    }

    setCurrentUser(newUser);
    setStored(STORAGE_KEYS.CURRENT_USER, newUser);
    sounds.playSave();
    return { success: true, user: newUser };
  }, [users, tenant]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
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

  // ─── DELETE operations ───────────────────────────────────────────────────────

  const deleteItem = useCallback((itemId: string) => {
    // Remove item AND all its batches
    persistItems(items.filter((i) => i.id !== itemId));
    persistBatches(batches.filter((b) => b.item_id !== itemId));
    sounds.playScan();
  }, [items, batches]);

  const deleteBatch = useCallback((batchId: string) => {
    persistBatches(batches.filter((b) => b.id !== batchId));
    sounds.playScan();
  }, [batches]);

  const deleteParty = useCallback((partyId: string) => {
    persistParties(parties.filter((p) => p.id !== partyId));
    sounds.playScan();
  }, [parties]);

  const deleteInvoice = useCallback((invoiceId: string) => {
    persistInvoices(invoices.filter((i) => i.id !== invoiceId));
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
    registerWithPhone,
    logout,
    switchUser,
    getStats,
    resetToDemoData,
    clearAllData,
    syncWithSupabase,
    setTenant: persistTenant,
  };
}
