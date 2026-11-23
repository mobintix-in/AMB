'use client';

import { useState } from 'react';
import { X, Copy, Check, Database, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SupabaseModalProps {
  onClose: () => void;
}

export function SupabaseModal({ onClose }: SupabaseModalProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'overview' | 'schema' | 'env'>('overview');

  const sqlSchemaSnippet = `-- Run this in your Supabase SQL Editor:
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants Master
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    branch_name VARCHAR(100) DEFAULT 'Main Branch',
    gstin VARCHAR(15) UNIQUE,
    drug_license_no VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    state VARCHAR(100) DEFAULT 'Maharashtra',
    state_code VARCHAR(2) DEFAULT '27',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parties / Customers & Suppliers
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    party_type VARCHAR(20) NOT NULL CHECK (party_type IN ('CUSTOMER', 'SUPPLIER', 'DOCTOR')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gstin VARCHAR(15),
    drug_license_no VARCHAR(100),
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    credit_days INT DEFAULT 0,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medicine Catalog with generic salt composition
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    salt_composition TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(150) NOT NULL,
    hsn_code VARCHAR(10) NOT NULL DEFAULT '300490',
    unit VARCHAR(50) NOT NULL DEFAULT 'Strip',
    pack_size VARCHAR(50) NOT NULL DEFAULT '10 Tablets',
    tax_rate NUMERIC(5, 2) DEFAULT 12.00,
    reorder_level INT DEFAULT 10,
    is_prescription_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Batches with FEFO Expiry
CREATE TABLE IF NOT EXISTS item_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    mfg_date VARCHAR(7) NOT NULL,
    expiry_date VARCHAR(7) NOT NULL,
    mrp NUMERIC(12, 2) NOT NULL,
    purchase_rate NUMERIC(12, 2) NOT NULL,
    sale_rate NUMERIC(12, 2) NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    rack_location VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Stock Deduction Trigger on Sales Bill
CREATE OR REPLACE FUNCTION deduct_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE item_batches
    SET quantity_available = quantity_available - NEW.quantity - COALESCE(NEW.free_quantity, 0)
    WHERE id = NEW.batch_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_deduct_stock_on_sale
AFTER INSERT ON sales_invoice_items
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_sale();`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Supabase Cloud Database & Architecture</h2>
              <p className="text-xs text-slate-500">PostgreSQL Schema, Realtime Synced Triggers, and Multi-tenancy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator Bar */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-xs font-medium text-slate-700">
              {isSupabaseConfigured ? 'Supabase Connected & Synced' : 'Running in Offline-First Mode (Browser LocalStorage)'}
            </span>
          </div>

          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setTab('overview')}
              className={`px-3 py-1 rounded transition-colors ${tab === 'overview' ? 'bg-sky-600 text-white font-medium shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              Architecture
            </button>
            <button
              onClick={() => setTab('schema')}
              className={`px-3 py-1 rounded transition-colors ${tab === 'schema' ? 'bg-sky-600 text-white font-medium shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              SQL DDL Script
            </button>
            <button
              onClick={() => setTab('env')}
              className={`px-3 py-1 rounded transition-colors ${tab === 'env' ? 'bg-sky-600 text-white font-medium shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              Env Setup
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs uppercase tracking-wide">
                    <Zap className="w-4 h-4" />
                    Hybrid Offline-First Design
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A medical billing counter cannot stop if the internet drops. The application operates instantly with local reactive state and automatically reconciles with Supabase PostgreSQL once network connectivity is verified.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4" />
                    ACID & FEFO Compliance
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Replaces legacy MARGERP FoxPro <code className="text-slate-800 font-mono bg-slate-200 px-1 py-0.5 rounded">.dbf</code> files that corrupt on crashes. Automated PostgreSQL triggers guarantee atomic stock deductions and enforce First Expired First Out rules.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <h4 className="font-semibold text-slate-900 text-xs mb-2">Relational Tables Included:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-sky-50 p-2 rounded border border-sky-200 text-sky-800">tenants</div>
                  <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-800">items (salts)</div>
                  <div className="bg-indigo-50 p-2 rounded border border-indigo-200 text-indigo-800">item_batches</div>
                  <div className="bg-pink-50 p-2 rounded border border-pink-200 text-pink-800">parties (ledgers)</div>
                  <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-800">sales_invoices</div>
                  <div className="bg-teal-50 p-2 rounded border border-teal-200 text-teal-800">invoice_items</div>
                  <div className="bg-purple-50 p-2 rounded border border-purple-200 text-purple-800">purchase_bills</div>
                  <div className="bg-rose-50 p-2 rounded border border-rose-200 text-rose-800">stock_triggers</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Complete SQL schema file saved at: <code className="text-sky-700 font-mono bg-sky-50 px-1 py-0.5 rounded border border-sky-200">supabase/schema.sql</code></span>
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 max-h-72 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre">
                {sqlSchemaSnippet}
              </div>
            </div>
          )}

          {tab === 'env' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                To connect your live Supabase project, create or edit <code className="text-sky-700 font-mono bg-sky-50 px-1 py-0.5 rounded border border-sky-200">.env.local</code> in the root directory:
              </p>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 space-y-1">
                <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</div>
              </div>
              <p className="text-xs text-slate-500">
                Get these keys from your Supabase Dashboard &gt; Project Settings &gt; API.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-sky-700 inline-flex items-center gap-1 transition-colors font-medium"
          >
            <span>Supabase Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
