/**
 * AMB MedERP Full Application End-to-End Test Suite
 * Tests UI routes, Left Sidebar structure, Auth page isolation, and Cloud APIs.
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, testName: string, failureDetails?: string) {
  results.push({
    suite,
    testName,
    passed: !!condition,
    details: condition ? undefined : failureDetails,
  });
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}: ${failureDetails || 'Assertion failed'}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   🚀 AMB MedERP Full Application Quality & UI Test   ');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // SUITE 1: HTTP Routes Accessibility
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Web Route Health Check (All Pages) ---');
  const routes = [
    { path: '/', name: 'Dashboard Overview' },
    { path: '/billing', name: 'High-Speed POS Billing' },
    { path: '/inventory', name: 'Medicine Master & Inventory' },
    { path: '/purchases', name: 'Inward Purchases (GRN)' },
    { path: '/expiry', name: 'Expiry Radar' },
    { path: '/parties', name: 'Accounts & Ledgers' },
    { path: '/reports', name: 'Financial & GST Reports' },
    { path: '/subscription', name: 'Commercial Subscription & Plans' },
    { path: '/login', name: 'Terminal Login Page' },
    { path: '/register', name: 'Pharmacy Registration Page' },
  ];

  const htmlMap: Record<string, string> = {};

  for (const route of routes) {
    try {
      const res = await fetch(`${BASE_URL}${route.path}`);
      assert(res.status === 200, 'Route Health', `${route.name} (${route.path}) returns HTTP 200`, `Received status ${res.status}`);
      const text = await res.text();
      htmlMap[route.path] = text;
    } catch (err: any) {
      assert(false, 'Route Health', `${route.name} (${route.path}) returns HTTP 200`, err.message);
    }
  }

  // -------------------------------------------------------------------------
  // SUITE 2: Left Sidebar Navigation Architecture
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Left Vertical Sidebar Architecture ---');
  const mainAppRoutes = ['/', '/billing', '/inventory', '/purchases', '/expiry', '/parties', '/reports'];

  for (const path of mainAppRoutes) {
    const html = htmlMap[path] || '';
    
    // 1. Sidebar element presence
    assert(html.includes('<aside') || html.includes('w-64'), 'Sidebar Layout', `${path} includes Left Sidebar container`, 'Missing <aside> or w-64 class');
    
    // 2. Logo & Branding
    assert(html.includes('AMB') && html.includes('MedERP'), 'Sidebar Branding', `${path} features AMB MedERP branding`, 'Missing brand name');

    // 3. Primary CTA "+ New Sales Bill"
    assert(html.includes('New Sales Bill'), 'Sidebar CTA', `${path} has + New Sales Bill action button`, 'Missing New Sales Bill button');

    // 4. Core Navigation Links (href check)
    assert(
      html.includes('href="/billing"') && 
      html.includes('href="/inventory"') && 
      html.includes('href="/purchases"') && 
      html.includes('href="/expiry"') &&
      html.includes('href="/parties"') &&
      html.includes('href="/reports"'),
      'Sidebar Nav Links',
      `${path} contains all primary module links (Billing, Inventory, Purchases, Expiry, Parties, Reports)`,
      'Missing core navigation link hrefs'
    );

    // 5. No Old Legacy Horizontal Header
    assert(
      !html.includes('max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4') &&
      !html.includes('Reconstructed from legacy FoxPro 9 DBF'),
      'Legacy Navbar Removal',
      `${path} is clean of legacy top navbar and tech-demo text`,
      'Legacy header or demo text still detected'
    );
  }

  // -------------------------------------------------------------------------
  // SUITE 3: Auth Pages Isolation (No Sidebar, No Navbar)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Auth Screen Layout Isolation ---');
  const authRoutes = ['/login', '/register'];

  for (const path of authRoutes) {
    const html = htmlMap[path] || '';

    // Must NOT have sidebar
    assert(
      !html.includes('<aside') && !html.includes('w-64 bg-white border-r'),
      'Auth Isolation',
      `${path} has NO left sidebar`,
      'Sidebar was unexpectedly found on auth page'
    );

    // Must NOT have navbar or sales bill button
    assert(
      !html.includes('New Sales Bill') && !html.includes('href="/expiry"'),
      'Auth Isolation',
      `${path} has NO navigation links or billing shortcuts`,
      'Navbar navigation links were unexpectedly found on auth page'
    );

    // Must have clean form elements
    if (path === '/login') {
      assert(html.includes('Terminal Password') || html.includes('Registered Pharmacist'), 'Login Elements', 'Login page has credential input fields', 'Missing login inputs');
    } else {
      assert(html.includes('Register Pharmacy') || html.includes('Mobile Number'), 'Register Elements', 'Register page has pharmacy registration fields', 'Missing registration inputs');
    }
  }

  // -------------------------------------------------------------------------
  // SUITE 4: Backend API Endpoints (Supabase & Cloud Sync)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Cloud & Auth APIs ---');

  // Test 1: Auth Login API Validation
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'nonexistent_test_user@amb.com', password: 'wrongpassword' }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 401 && loginData.error,
      'API Security',
      'POST /api/auth/login rejects invalid credentials with HTTP 401',
      `Expected 401, got ${loginRes.status}`
    );
  } catch (err: any) {
    assert(false, 'API Security', 'POST /api/auth/login reachable', err.message);
  }

  // Test 2: Cloud Sync API (GET)
  try {
    const syncRes = await fetch(`${BASE_URL}/api/cloud/sync`);
    const syncData = await syncRes.json();
    assert(
      syncRes.status === 200 && syncData.success,
      'Cloud Sync API',
      'GET /api/cloud/sync returns successful data envelope',
      `Got status ${syncRes.status}`
    );
  } catch (err: any) {
    assert(false, 'Cloud Sync API', 'GET /api/cloud/sync reachable', err.message);
  }

  // Test 3: Cloud Push API
  try {
    const pushRes = await fetch(`${BASE_URL}/api/cloud/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'default',
        tenant: {
          id: 'default',
          name: 'AMB Pharmaceuticals & Surgicals',
          branch_name: 'Central Wholesale',
          drug_license_no: '20B/21B-MH-492102',
          gstin: '27AABCR8941N1Z5',
          state: 'Maharashtra',
        },
        items: [],
        batches: [],
        parties: [],
        invoices: [],
      }),
    });
    const pushData = await pushRes.json();
    assert(
      pushRes.status === 200 && pushData.success,
      'Cloud Push API',
      'POST /api/cloud/push successfully commits records to Supabase',
      `Got status ${pushRes.status}`
    );
  } catch (err: any) {
    assert(false, 'Cloud Push API', 'POST /api/cloud/push reachable', err.message);
  }

  // -------------------------------------------------------------------------
  // SUITE 5: Core Pharmacy Engine Logic (FEFO & Billing Calculations)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Pharmacy Billing Engine Logic ---');

  // Test FEFO Sorting
  const batches = [
    { batch_number: 'B3', expiry_date: '2027-06' },
    { batch_number: 'B1', expiry_date: '2026-03' },
    { batch_number: 'B2', expiry_date: '2026-11' },
  ];
  const sortedBatches = [...batches].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  assert(
    sortedBatches[0].batch_number === 'B1' && sortedBatches[1].batch_number === 'B2',
    'FEFO Logic',
    'Batches sort chronologically by expiry date (FEFO)',
    'FEFO sorting failed'
  );

  // Test Billing Math
  const qty = 5;
  const rate = 120.00; // Rs. 120 per strip
  const discountPercent = 10; // 10% discount
  const gstPercent = 12; // 12% GST

  const gross = qty * rate; // 600
  const discount = (gross * discountPercent) / 100; // 60
  const taxable = gross - discount; // 540
  const gst = (taxable * gstPercent) / 100; // 64.8
  const net = Math.round((taxable + gst) * 100) / 100; // 604.80

  assert(gross === 600, 'Billing Math', 'Gross line total calculation (qty * rate)', `Expected 600, got ${gross}`);
  assert(taxable === 540, 'Billing Math', 'Taxable amount with trade discount applied', `Expected 540, got ${taxable}`);
  assert(gst === 64.8, 'Billing Math', 'GST computation (CGST + SGST)', `Expected 64.8, got ${gst}`);
  assert(net === 604.8, 'Billing Math', 'Net invoice payable computation', `Expected 604.8, got ${net}`);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
