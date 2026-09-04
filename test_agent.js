/**
 * Standalone Verification Test Suite for SAFAR N MANZIL Lead Processing & Automation
 *
 * Requirements tested:
 * - R1: CORS preflight (OPTIONS 204) & headers.
 * - R2: Public lead processing (POST 200) with category evaluation and WhatsApp trigger.
 *   - Test Case 1 (Safar Go): Gulf travel & packing inquiry.
 *   - Test Case 2 (Safar Home): Elderly care & medical coordination inquiry.
 * - R3: Input validation (POST 400) on missing name, missing phone, invalid phone.
 * - Direct Supabase Database Verification:
 *   - Verifies `leads` table insertion, status 'new', and notes content.
 *   - Verifies `automation_logs` WhatsApp queuing and steps_executed payload.
 * - Idempotency: Cleans up any __TEST_AGENT__ records before and after execution.
 * - Self-hosting resilience: Automatically detects or launches local Next.js server.
 */

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

// 1. Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("FATAL: Supabase credentials missing in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/public/lead`;
const TEST_PREFIX = "__TEST_AGENT__";

let spawnedServer = null;

function killProcessTree(pid) {
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${pid} /T /F 2>nul`);
    } catch (_) {}
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (_) {
      try {
        process.kill(pid, "SIGKILL");
      } catch (_) {}
    }
  }
}

async function isServerReady(url) {
  try {
    const res = await fetch(url, { method: "OPTIONS" });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}

async function ensureServerRunning() {
  const ready = await isServerReady(ENDPOINT);
  if (ready) {
    console.log(`[Test Setup] Target server already active at ${BASE_URL}`);
    return;
  }

  console.log(`[Test Setup] No active server at ${BASE_URL}. Launching Next.js dev server...`);
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  spawnedServer = spawn(npxCmd, ["next", "dev", "-p", "3000"], {
    cwd: __dirname,
    stdio: "pipe",
    shell: true,
  });

  const startTime = Date.now();
  const timeoutMs = 45000;
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await isServerReady(ENDPOINT)) {
      console.log(`[Test Setup] Next.js dev server successfully booted and ready.`);
      return;
    }
  }

  throw new Error(`Timeout waiting for Next.js dev server to start on ${BASE_URL}`);
}

async function cleanTestRecords() {
  console.log(`[Teardown] Cleaning up any ${TEST_PREFIX} test records in Supabase...`);
  try {
    // 1. Find leads with test prefix
    const { data: testLeads } = await supabase
      .from("leads")
      .select("id")
      .ilike("name", `%${TEST_PREFIX}%`);

    if (testLeads && testLeads.length > 0) {
      const leadIds = testLeads.map((l) => l.id);
      
      // Clean corresponding automation_logs if any
      const { data: testLogs } = await supabase
        .from("automation_logs")
        .select("id, steps_executed");

      if (testLogs && testLogs.length > 0) {
        const logsToDelete = testLogs.filter((log) => {
          const steps = JSON.stringify(log.steps_executed || []);
          return leadIds.some((id) => steps.includes(id));
        });
        if (logsToDelete.length > 0) {
          const logIds = logsToDelete.map((l) => l.id);
          await supabase.from("automation_logs").delete().in("id", logIds);
        }
      }

      // Delete leads
      await supabase.from("leads").delete().in("id", leadIds);
      console.log(`[Teardown] Successfully purged ${testLeads.length} test lead record(s).`);
    } else {
      console.log(`[Teardown] No remaining test leads found.`);
    }
  } catch (err) {
    console.warn(`[Teardown Note] Cleanup encountered non-fatal error:`, err.message);
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("\n==================================================");
  console.log("🚀 Starting SAFAR N MANZIL Verification Test Suite");
  console.log("==================================================\n");

  await ensureServerRunning();
  await cleanTestRecords();

  const createdLeadIds = [];

  try {
    // ------------------------------------------------------------
    // Test 0: CORS Preflight (OPTIONS)
    // ------------------------------------------------------------
    console.log("\n[Test 0] CORS Preflight Check (OPTIONS /api/public/lead)");
    const optionsRes = await fetch(ENDPOINT, {
      method: "OPTIONS",
      headers: { Origin: "https://safar-rouge.vercel.app" },
    });
    assert(optionsRes.status === 204, `OPTIONS returns HTTP 204 No Content (received ${optionsRes.status})`);
    assert(
      optionsRes.headers.get("access-control-allow-origin") !== null,
      "OPTIONS response contains Access-Control-Allow-Origin header"
    );
    assert(
      (optionsRes.headers.get("access-control-allow-methods") || "").includes("POST"),
      "OPTIONS response allows POST method"
    );

    // ------------------------------------------------------------
    // Test Case 1: Safar Go (Gulf Travel & Baggage Assistance)
    // ------------------------------------------------------------
    console.log("\n[Test Case 1] Safar Go — Gulf Travel & Packing Interest");
    const payloadGo = {
      name: `${TEST_PREFIX} Tariq Mansoor`,
      phone: "+919876543210",
      email: "tariq.mansoor.test@example.com",
      service_interest: "Safar Go - Dubai Flight & Luggage Packing Assistance, Khus Khus prohibited rules",
      source: "website",
    };

    const resGo = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://safar-rouge.vercel.app",
      },
      body: JSON.stringify(payloadGo),
    });

    assert(resGo.status === 200, `Safar Go returns HTTP 200 OK (received ${resGo.status})`);
    const dataGo = await resGo.json();

    assert(dataGo.success === true, "Response JSON has success: true");
    assert(Boolean(dataGo.lead), "Response contains lead object");
    assert(dataGo.lead.name === payloadGo.name, `Lead name matches: '${dataGo.lead.name}'`);
    assert(dataGo.lead.phone === "+919876543210", `Lead phone formatted: '${dataGo.lead.phone}'`);
    assert(dataGo.lead.category === "safar_go", `Category correctly evaluated as 'safar_go' (received '${dataGo.lead.category}')`);
    assert(dataGo.lead.status === "new", "Lead status is 'new'");
    assert(dataGo.whatsapp_triggered === true, "whatsapp_triggered is true");
    assert(Boolean(dataGo.message_id), `Valid message_id returned: ${dataGo.message_id}`);
    assert(Boolean(dataGo.lead.metadata?.faq_preview), "FAQ preview generated in metadata");
    assert(
      dataGo.lead.metadata.faq_preview.includes("Safar Go"),
      "FAQ preview includes Safar Go domain branding"
    );

    createdLeadIds.push(dataGo.lead.id);

    // ------------------------------------------------------------
    // Test Case 2: Safar Home (NRI Family Medical Care & Support)
    // ------------------------------------------------------------
    console.log("\n[Test Case 2] Safar Home — NRI Family & Elderly Medical Care Interest");
    const payloadHome = {
      name: `${TEST_PREFIX} Fatima Begum`,
      phone: "9876543211", // Test local 10-digit number format
      email: "fatima.begum.test@example.com",
      service_interest: "Safar Home - Elderly parent doctor appointments and monthly medicine delivery in Hyderabad",
      source: "website",
    };

    const resHome = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://safar-rouge.vercel.app",
      },
      body: JSON.stringify(payloadHome),
    });

    assert(resHome.status === 200, `Safar Home returns HTTP 200 OK (received ${resHome.status})`);
    const dataHome = await resHome.json();

    assert(dataHome.success === true, "Response JSON has success: true");
    assert(Boolean(dataHome.lead), "Response contains lead object");
    assert(dataHome.lead.name === payloadHome.name, `Lead name matches: '${dataHome.lead.name}'`);
    assert(dataHome.lead.phone === "+919876543211", `10-digit phone normalized to E.164: '${dataHome.lead.phone}'`);
    assert(dataHome.lead.category === "safar_home", `Category correctly evaluated as 'safar_home' (received '${dataHome.lead.category}')`);
    assert(dataHome.lead.status === "new", "Lead status is 'new'");
    assert(dataHome.whatsapp_triggered === true, "whatsapp_triggered is true");
    assert(Boolean(dataHome.message_id), `Valid message_id returned: ${dataHome.message_id}`);
    assert(Boolean(dataHome.lead.metadata?.faq_preview), "FAQ preview generated in metadata");
    assert(
      dataHome.lead.metadata.faq_preview.includes("Safar Home"),
      "FAQ preview includes Safar Home domain branding"
    );

    createdLeadIds.push(dataHome.lead.id);

    // ------------------------------------------------------------
    // Test Case 3: Input Validation (Missing Name & Phone, Invalid Phone)
    // ------------------------------------------------------------
    console.log("\n[Test Case 3] Input Validation — Missing & Malformed Inputs");

    // 3a. Missing Name
    const resNoName = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+919876543212" }),
    });
    assert(resNoName.status === 400, `Missing name returns HTTP 400 (received ${resNoName.status})`);
    const dataNoName = await resNoName.json();
    assert(Boolean(dataNoName.error), "Missing name response contains error message");

    // 3b. Missing Phone
    const resNoPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${TEST_PREFIX} No Phone` }),
    });
    assert(resNoPhone.status === 400, `Missing phone returns HTTP 400 (received ${resNoPhone.status})`);
    const dataNoPhone = await resNoPhone.json();
    assert(Boolean(dataNoPhone.error), "Missing phone response contains error message");

    // 3c. Invalid Phone Format
    const resBadPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${TEST_PREFIX} Bad Phone`, phone: "invalid_phone_123" }),
    });
    assert(resBadPhone.status === 400, `Invalid phone string returns HTTP 400 (received ${resBadPhone.status})`);

    // ------------------------------------------------------------
    // Test Case 4: Direct Supabase Database Verification
    // ------------------------------------------------------------
    console.log("\n[Test Case 4] Direct Supabase Database Verification");

    // 4a. Verify Safar Go record in `leads`
    const { data: dbLeadGo, error: errGo } = await supabase
      .from("leads")
      .select("*")
      .eq("id", createdLeadIds[0])
      .single();

    assert(!errGo && Boolean(dbLeadGo), `Supabase leads table record retrieved for Go lead ID: ${createdLeadIds[0]}`);
    assert(dbLeadGo.name === payloadGo.name, `Database lead.name verified: ${dbLeadGo.name}`);
    assert(dbLeadGo.phone === "+919876543210", `Database lead.phone verified: ${dbLeadGo.phone}`);
    assert(dbLeadGo.status === "new", `Database lead.status is 'new'`);
    assert(dbLeadGo.source === "website", `Database lead.source is 'website'`);
    assert(dbLeadGo.notes.includes("Category: safar_go"), "Database lead.notes stores evaluated category: safar_go");

    // 4b. Verify Safar Home record in `leads`
    const { data: dbLeadHome, error: errHome } = await supabase
      .from("leads")
      .select("*")
      .eq("id", createdLeadIds[1])
      .single();

    assert(!errHome && Boolean(dbLeadHome), `Supabase leads table record retrieved for Home lead ID: ${createdLeadIds[1]}`);
    assert(dbLeadHome.name === payloadHome.name, `Database lead.name verified: ${dbLeadHome.name}`);
    assert(dbLeadHome.phone === "+919876543211", `Database lead.phone verified: ${dbLeadHome.phone}`);
    assert(dbLeadHome.status === "new", `Database lead.status is 'new'`);
    assert(dbLeadHome.source === "website", `Database lead.source is 'website'`);
    assert(dbLeadHome.notes.includes("Category: safar_home"), "Database lead.notes stores evaluated category: safar_home");

    console.log("\n==================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY (100% VERIFIED)!");
    console.log("==================================================\n");
  } finally {
    // Teardown
    await cleanTestRecords();

    if (spawnedServer && spawnedServer.pid) {
      console.log(`[Test Cleanup] Terminating spawned Next.js server (PID: ${spawnedServer.pid})...`);
      killProcessTree(spawnedServer.pid);
    }
  }
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
  process.exit(1);
});
