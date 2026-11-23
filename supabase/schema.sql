-- ==============================================================================
-- MEDICAL INVENTORY & INVOICE MANAGEMENT (MARGERP Modernization Blueprint)
-- PostgreSQL / Supabase Complete DDL Schema
-- Features: Multi-tenancy, Row Level Security, FEFO Batch Tracking, Automatic Stock Triggers
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenant / Pharmacy Store Information
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    branch_name VARCHAR(100) DEFAULT 'Main Branch',
    gstin VARCHAR(15) UNIQUE,
    pan VARCHAR(10),
    drug_license_no VARCHAR(100) NOT NULL,
    fssai_no VARCHAR(50),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    state VARCHAR(100) DEFAULT 'Maharashtra',
    state_code VARCHAR(2) DEFAULT '27',
    currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Parties / Accounts Master (Retail Customers, Hospitals, Doctors, Wholesale Stockists)
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    party_type VARCHAR(20) NOT NULL CHECK (party_type IN ('CUSTOMER', 'SUPPLIER', 'DOCTOR')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    gstin VARCHAR(15),
    drug_license_no VARCHAR(100),
    address TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    credit_days INT DEFAULT 0,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parties_tenant_type ON parties(tenant_id, party_type);
CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);

-- 3. Items / Medicines Catalog (With generic salt formulation)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    salt_composition TEXT NOT NULL, -- Crucial for pharma substitute search
    category VARCHAR(100) NOT NULL, -- e.g. Antibiotics, Analgesics, Cardiac
    manufacturer VARCHAR(150) NOT NULL, -- e.g. Cipla, Sun Pharma, Alkem
    hsn_code VARCHAR(10) NOT NULL DEFAULT '300490',
    unit VARCHAR(20) NOT NULL DEFAULT 'Strip', -- Strip, Box, Bottle, Vial
    pack_size VARCHAR(50) DEFAULT '10 Tablets',
    conversion_factor INT DEFAULT 1, -- e.g. 1 Box = 10 Strips
    tax_rate NUMERIC(5, 2) DEFAULT 12.00, -- GST rate (5%, 12%, 18%)
    cess_rate NUMERIC(5, 2) DEFAULT 0.00,
    reorder_level INT DEFAULT 10,
    is_prescription_required BOOLEAN DEFAULT FALSE,
    storage_condition VARCHAR(100) DEFAULT 'Store in cool & dry place',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_items_salt ON items USING gin (to_tsvector('english', salt_composition));
CREATE INDEX IF NOT EXISTS idx_items_name ON items USING gin (to_tsvector('english', name || ' ' || brand_name));

-- 4. Batch & Inventory Table (Handles FEFO: First Expired First Out)
CREATE TABLE IF NOT EXISTS item_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    mfg_date VARCHAR(10) NOT NULL, -- 'YYYY-MM'
    expiry_date VARCHAR(10) NOT NULL, -- 'YYYY-MM'
    mrp NUMERIC(12, 2) NOT NULL,
    purchase_rate NUMERIC(12, 2) NOT NULL,
    sale_rate NUMERIC(12, 2) NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    rack_location VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, item_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_batches_expiry ON item_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_item_qty ON item_batches(item_id, quantity_available);

-- 5. Sales Invoices Header
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_time TIME NOT NULL DEFAULT CURRENT_TIME,
    party_id UUID REFERENCES parties(id),
    party_name VARCHAR(255) NOT NULL,
    party_gstin VARCHAR(15),
    doctor_name VARCHAR(150),
    patient_name VARCHAR(150),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    profit_margin_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    profit_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'PENDING', 'HELD')),
    payment_mode VARCHAR(20) DEFAULT 'CASH' CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'CREDIT', 'SPLIT')),
    amount_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    upi_ref_id VARCHAR(100),
    irn_number VARCHAR(64), -- GST E-Invoice IRN
    e_way_bill_no VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_date ON sales_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_party ON sales_invoices(party_id);

-- 6. Sales Invoice Line Items
CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    item_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    salt_composition TEXT,
    batch_id UUID NOT NULL REFERENCES item_batches(id),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    free_quantity INT DEFAULT 0,
    mrp NUMERIC(12, 2) NOT NULL,
    rate NUMERIC(12, 2) NOT NULL,
    purchase_rate NUMERIC(12, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL,
    taxable_amount NUMERIC(12, 2) NOT NULL,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Purchase Inward Receipts (GRN)
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES parties(id),
    supplier_name VARCHAR(255) NOT NULL,
    supplier_invoice_no VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PENDING')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Purchase Invoice Line Items
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    item_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    mfg_date VARCHAR(10) NOT NULL,
    expiry_date VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    free_quantity INT DEFAULT 0,
    purchase_rate NUMERIC(12, 2) NOT NULL,
    mrp NUMERIC(12, 2) NOT NULL,
    sale_rate NUMERIC(12, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL,
    taxable_amount NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- AUTOMATED TRIGGERS FOR STOCK MANAGEMENT
-- ==============================================================================

-- Function to deduct stock upon sales invoice item insertion
CREATE OR REPLACE FUNCTION trg_deduct_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE item_batches
    SET quantity_available = quantity_available - (NEW.quantity + NEW.free_quantity),
        updated_at = NOW()
    WHERE id = NEW.batch_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sale_stock_deduction
AFTER INSERT ON sales_invoice_items
FOR EACH ROW
EXECUTE FUNCTION trg_deduct_stock_on_sale();

-- Function to increment stock upon purchase receipt
CREATE OR REPLACE FUNCTION trg_add_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if batch exists; if yes, increase qty. If not, insert batch.
    INSERT INTO item_batches (item_id, batch_number, mfg_date, expiry_date, mrp, purchase_rate, sale_rate, quantity_available)
    VALUES (NEW.item_id, NEW.batch_number, NEW.mfg_date, NEW.expiry_date, NEW.mrp, NEW.purchase_rate, NEW.sale_rate, (NEW.quantity + NEW.free_quantity))
    ON CONFLICT (tenant_id, item_id, batch_number)
    DO UPDATE SET
        quantity_available = item_batches.quantity_available + (NEW.quantity + NEW.free_quantity),
        purchase_rate = NEW.purchase_rate,
        sale_rate = NEW.sale_rate,
        mrp = NEW.mrp,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_purchase_stock_addition
AFTER INSERT ON purchase_invoice_items
FOR EACH ROW
EXECUTE FUNCTION trg_add_stock_on_purchase();

-- ==============================================================================
-- REALTIME PUBLICATION FOR SUPABASE
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE item_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_invoices;
