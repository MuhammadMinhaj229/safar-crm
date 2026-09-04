/**
 * Adversarial Stress Test Suite — Challenger 1
 * Project: SAFAR N MANZIL CRM AI Backend Worker
 * Endpoint: /api/public/lead
 *
 * Exhaustively stress-tests:
 * 1. Boundary inputs (empty strings, whitespace-only, 1500+ char strings, Unicode & Emojis).
 * 2. Malformed phones (letters, invalid lengths, trunk zeros, various international country codes).
 * 3. Ambiguous & irrelevant service interests (competing keywords, tie-breaks, zero-match gibberish, fallbacks).
 * 4. Null, undefined, whitespace, and invalid optional fields (CHECK constraint safety).
 * 5. Request body syntax errors (malformed JSON).
 * 6. Direct Supabase database state verification & idempotent cleanup.
 */

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

// Resolve paths
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const ENV_PATH = path.join(PROJECT_ROOT, ".env.local");

// Load .env.local
function loadEnv() {
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, "utf-8").split("\n");
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
const CHALLENGER_PREFIX = "__ADV_TEST_CHALLENGER__";

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
    console.log(`[Setup] Target server active at ${BASE_URL}`);
    return;
  }

  console.log(`[Setup] No active server at ${BASE_URL}. Launching Next.js dev server...`);
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  spawnedServer = spawn(npxCmd, ["next", "dev", "-p", "3000"], {
    cwd: PROJECT_ROOT,
    stdio: "pipe",
    shell: true,
  });

  const startTime = Date.now();
  const timeoutMs = 45000;
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await isServerReady(ENDPOINT)) {
      console.log(`[Setup] Next.js dev server successfully booted and ready.`);
      return;
    }
  }

  throw new Error(`Timeout waiting for Next.js dev server to start on ${BASE_URL}`);
}

async function cleanTestRecords() {
  console.log(`[Teardown] Cleaning up any ${CHALLENGER_PREFIX} test records in Supabase...`);
  try {
    const { data: testLeads } = await supabase
      .from("leads")
      .select("id")
      .ilike("name", `%${CHALLENGER_PREFIX}%`);

    if (testLeads && testLeads.length > 0) {
      const leadIds = testLeads.map((l) => l.id);

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

      await supabase.from("leads").delete().in("id", leadIds);
      console.log(`[Teardown] Successfully purged ${testLeads.length} test lead record(s).`);
    } else {
      console.log(`[Teardown] Clean state: 0 test records present.`);
    }
  } catch (err) {
    console.warn(`[Teardown Note] Cleanup error:`, err.message);
  }
}

let passedCount = 0;
let totalCount = 0;
const failures = [];

function assert(condition, message, details = "") {
  totalCount++;
  if (!condition) {
    const errMsg = `FAILED: ${message} ${details ? "(" + details + ")" : ""}`;
    console.error(`  ❌ ${errMsg}`);
    failures.push(errMsg);
    throw new Error(errMsg);
  }
  passedCount++;
  console.log(`  ✓ ${message}`);
}

async function runAdversarialTests() {
  console.log("================================================================");
  console.log("🔥 STARTING ADVERSARIAL STRESS TEST SUITE (CHALLENGER 1)");
  console.log("================================================================\n");

  await ensureServerRunning();
  await cleanTestRecords();

  const createdLeadIds = [];

  try {
    // ================================================================
    // GROUP 1: BOUNDARY INPUTS & DATA LIMITS
    // ================================================================
    console.log("\n--- GROUP 1: Boundary Inputs & Extreme Sizes ---");

    // 1.1 Empty string name
    console.log("[1.1] Empty string name");
    const resEmptyName = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", phone: "+919876543210" }),
    });
    assert(resEmptyName.status === 400, "Empty string name rejected with HTTP 400", `status: ${resEmptyName.status}`);

    // 1.2 Whitespace-only name
    console.log("[1.2] Whitespace-only name");
    const resWhitespaceName = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   \t\n   ", phone: "+919876543210" }),
    });
    assert(resWhitespaceName.status === 400, "Whitespace-only name rejected with HTTP 400", `status: ${resWhitespaceName.status}`);

    // 1.3 Non-string name (number)
    console.log("[1.3] Non-string name (number)");
    const resNumericName = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 123456, phone: "+919876543210" }),
    });
    assert(resNumericName.status === 400, "Non-string numeric name rejected with HTTP 400", `status: ${resNumericName.status}`);

    // 1.4 Very long text in name (1,200 characters)
    console.log("[1.4] Extremely long name (1,200 chars)");
    const longName = `${CHALLENGER_PREFIX}_LONGNAME_` + "A".repeat(1180);
    const resLongName = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: longName,
        phone: "+919876543210",
        service_interest: "Safar Go Gulf Travel",
      }),
    });
    assert(resLongName.status === 200, "1,200-char name handled with HTTP 200", `status: ${resLongName.status}`);
    const dataLongName = await resLongName.json();
    assert(dataLongName.lead?.name === longName, "Long name persisted without truncation in response");
    createdLeadIds.push(dataLongName.lead.id);

    // 1.5 Very long service_interest (2,500 characters)
    console.log("[1.5] Extremely long service_interest (2,500 chars)");
    const longInterest = "Safar Home elderly care medical coordination " + "routine doctor checkups ".repeat(100);
    const resLongInterest = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Long Interest User`,
        phone: "+919876543210",
        service_interest: longInterest,
      }),
    });
    assert(resLongInterest.status === 200, "2,500-char service_interest handled with HTTP 200", `status: ${resLongInterest.status}`);
    const dataLongInterest = await resLongInterest.json();
    assert(dataLongInterest.lead?.category === "safar_home", "Correctly categorized as safar_home despite massive text");
    createdLeadIds.push(dataLongInterest.lead.id);

    // 1.6 Unicode & Emojis in Name & Service Interest
    console.log("[1.6] Unicode & Emojis in Name and Service Interest");
    const unicodePayload = {
      name: `${CHALLENGER_PREFIX} محمد المنهاج 🌟 Sheikh Al-Maktoum ✈️`,
      phone: "+971501234567",
      email: "sheikh.test@safar.ae",
      service_interest: "حجز تذاكر طيران إلى دبي ✈️🌴📦 Safar Go luggage packing and customs",
      source: "website",
    };
    const resUnicode = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unicodePayload),
    });
    assert(resUnicode.status === 200, "Unicode & Emojis payload returns HTTP 200", `status: ${resUnicode.status}`);
    const dataUnicode = await resUnicode.json();
    assert(dataUnicode.lead?.name === unicodePayload.name, "Unicode name preserved with complete fidelity");
    assert(dataUnicode.lead?.category === "safar_go", "Categorized as safar_go matching Dubai & packing keywords");
    createdLeadIds.push(dataUnicode.lead.id);

    // ================================================================
    // GROUP 2: MALFORMED PHONES, LETTERS & COUNTRY CODES
    // ================================================================
    console.log("\n--- GROUP 2: Malformed Phone Numbers, Formats & Country Codes ---");

    // 2.1 Empty phone
    console.log("[2.1] Empty phone string");
    const resEmptyPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${CHALLENGER_PREFIX} Test`, phone: "" }),
    });
    assert(resEmptyPhone.status === 400, "Empty phone string rejected with HTTP 400");

    // 2.2 Whitespace-only phone
    console.log("[2.2] Whitespace-only phone");
    const resWhitespacePhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${CHALLENGER_PREFIX} Test`, phone: "   " }),
    });
    assert(resWhitespacePhone.status === 400, "Whitespace phone string rejected with HTTP 400");

    // 2.3 Letters only in phone
    console.log("[2.3] Letters only in phone");
    const resLettersPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${CHALLENGER_PREFIX} Test`, phone: "call-me-please" }),
    });
    assert(resLettersPhone.status === 400, "Letters-only phone rejected with HTTP 400");

    // 2.4 Too short (< 7 digits)
    console.log("[2.4] Too short phone (5 digits)");
    const resShortPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${CHALLENGER_PREFIX} Test`, phone: "+91123" }),
    });
    assert(resShortPhone.status === 400, "Short phone (+91123) rejected with HTTP 400");

    // 2.5 Too long (> 15 digits)
    console.log("[2.5] Too long phone (19 digits)");
    const resLongPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${CHALLENGER_PREFIX} Test`, phone: "+9112345678901234567" }),
    });
    assert(resLongPhone.status === 400, "Too long phone (19 digits) rejected with HTTP 400");

    // 2.6 Starting with zero and too short
    console.log("[2.6] Leading zero with too few digits (012345)");
    const resZeroShortPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${CHALLENGER_PREFIX} Test`, phone: "012345" }),
    });
    assert(resZeroShortPhone.status === 400, "Leading zero short phone rejected with HTTP 400");

    // 2.7 Domestic trunk 0 normalization (09876543210 -> +919876543210)
    console.log("[2.7] Domestic trunk 0 normalization (09876543210)");
    const resTrunkPhone = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Trunk Zero User`,
        phone: "09876543210",
        service_interest: "Safar Go Flight",
      }),
    });
    assert(resTrunkPhone.status === 200, "Trunk 0 phone accepted with HTTP 200");
    const dataTrunkPhone = await resTrunkPhone.json();
    assert(dataTrunkPhone.lead?.phone === "+919876543210", `Trunk 0 correctly normalized to +919876543210 (received ${dataTrunkPhone.lead?.phone})`);
    createdLeadIds.push(dataTrunkPhone.lead.id);

    // 2.8 International Country Codes: Saudi Arabia (+966)
    console.log("[2.8] Saudi Arabia Country Code (+966501234567)");
    const resKSA = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} KSA Traveler`,
        phone: "+966 50 123 4567",
        service_interest: "Riyadh baggage allowance and khus khus prohibited items",
      }),
    });
    assert(resKSA.status === 200, "Saudi phone (+966) accepted with HTTP 200");
    const dataKSA = await resKSA.json();
    assert(dataKSA.lead?.phone === "+966501234567", `Formatted to +966501234567: ${dataKSA.lead?.phone}`);
    assert(dataKSA.lead?.category === "safar_go", "Categorized as safar_go matching Riyadh & baggage");
    createdLeadIds.push(dataKSA.lead.id);

    // 2.9 International Country Codes: United Kingdom (+44)
    console.log("[2.9] UK Country Code (+447911123456)");
    const resUK = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} London NRI`,
        phone: "+44 (7911) 123-456",
        service_interest: "Safar Home elderly care in Kerala",
      }),
    });
    assert(resUK.status === 200, "UK phone (+44) accepted with HTTP 200");
    const dataUK = await resUK.json();
    assert(dataUK.lead?.phone === "+447911123456", `Formatted to +447911123456: ${dataUK.lead?.phone}`);
    assert(dataUK.lead?.category === "safar_home", "Categorized as safar_home");
    createdLeadIds.push(dataUK.lead.id);

    // 2.10 International Country Codes: United States (+1)
    console.log("[2.10] US Country Code (+14155552671)");
    const resUS = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} US NRI`,
        phone: "+1 415-555-2671",
        service_interest: "Doctor appointments for parents back home",
      }),
    });
    assert(resUS.status === 200, "US phone (+1) accepted with HTTP 200");
    const dataUS = await resUS.json();
    assert(dataUS.lead?.phone === "+14155552671", `Formatted to +14155552671: ${dataUS.lead?.phone}`);
    assert(dataUS.lead?.category === "safar_home", "Categorized as safar_home matching doctor & parents");
    createdLeadIds.push(dataUS.lead.id);

    // ================================================================
    // GROUP 3: AMBIGUOUS & IRRELEVANT SERVICE INTERESTS & FALLBACKS
    // ================================================================
    console.log("\n--- GROUP 3: Ambiguous, Competing & Irrelevant Service Interests ---");

    // 3.1 Competing keywords where Home dominates
    console.log("[3.1] Competing keywords (Home dominates: elderly parents medical care > flight)");
    const resHomeDom = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Competing Home Dominant`,
        phone: "+919876543210",
        service_interest: "I need a flight ticket to Dubai but urgently require elderly parent doctor appointments and monthly medicines in Mumbai",
      }),
    });
    assert(resHomeDom.status === 200, "Competing Home-dominant request accepted with HTTP 200");
    const dataHomeDom = await resHomeDom.json();
    assert(dataHomeDom.lead?.category === "safar_home", `Category is 'safar_home' (received: ${dataHomeDom.lead?.category})`);
    createdLeadIds.push(dataHomeDom.lead.id);

    // 3.2 Competing keywords where Go dominates
    console.log("[3.2] Competing keywords (Go dominates: Safar Go flight baggage packing > family at home)");
    const resGoDom = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Competing Go Dominant`,
        phone: "+919876543210",
        service_interest: "Safar Go - Dubai flight booking, approved carton boxes and luggage scales for Gulf travel, leaving family at home",
      }),
    });
    assert(resGoDom.status === 200, "Competing Go-dominant request accepted with HTTP 200");
    const dataGoDom = await resGoDom.json();
    assert(dataGoDom.lead?.category === "safar_go", `Category is 'safar_go' (received: ${dataGoDom.lead?.category})`);
    createdLeadIds.push(dataGoDom.lead.id);

    // 3.3 Exact score tie-breaker
    // "flight" (go: 4) + "dubai" (go: 5) = 9
    // "doctor" (home: 5) + "family" (home: 4) = 9
    console.log("[3.3] Exact score tie-breaker (Go 9 vs Home 9 -> defaults to safar_go)");
    const resTie = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Tie Breaker User`,
        phone: "+919876543210",
        service_interest: "flight dubai doctor family",
      }),
    });
    assert(resTie.status === 200, "Tie-breaker request returns HTTP 200");
    const dataTie = await resTie.json();
    assert(dataTie.lead?.category === "safar_go", `Tie resolves deterministically to 'safar_go' (received: ${dataTie.lead?.category})`);
    createdLeadIds.push(dataTie.lead.id);

    // 3.4 Completely irrelevant gibberish (zero keywords matched)
    console.log("[3.4] Completely irrelevant text (zero keyword matches -> default fallback)");
    const resGibberish = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Irrelevant User`,
        phone: "+919876543210",
        service_interest: "Quantum computing semiconductor fabrication and crypto trading algorithms",
      }),
    });
    assert(resGibberish.status === 200, "Irrelevant service interest returns HTTP 200");
    const dataGibberish = await resGibberish.json();
    assert(dataGibberish.lead?.category === "safar_go", `Unmatched text defaults safely to 'safar_go' (received: ${dataGibberish.lead?.category})`);
    assert(Boolean(dataGibberish.lead?.metadata?.faq_preview), "FAQ preview generated without error");
    createdLeadIds.push(dataGibberish.lead.id);

    // 3.5 Specific test prompt scenario: "Need plumbing in London"
    console.log("[3.5] Test scenario: 'Need plumbing in London' (matches Safar Home keyword 'plumbing')");
    const resPlumbing = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} London Plumbing User`,
        phone: "+919876543210",
        service_interest: "Need plumbing in London",
      }),
    });
    assert(resPlumbing.status === 200, "'Need plumbing in London' returns HTTP 200");
    const dataPlumbing = await resPlumbing.json();
    assert(dataPlumbing.lead?.category === "safar_home", `Classified as 'safar_home' via plumbing keyword (received: ${dataPlumbing.lead?.category})`);
    createdLeadIds.push(dataPlumbing.lead.id);

    // ================================================================
    // GROUP 4: NULL, UNDEFINED & OPTIONAL FIELDS
    // ================================================================
    console.log("\n--- GROUP 4: Null, Undefined & Optional Fields ---");

    // 4.1 Minimal payload: only name & phone (all optional fields omitted)
    console.log("[4.1] Minimal payload (only name & phone)");
    const resMinimal = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Minimal User`,
        phone: "+919876543210",
      }),
    });
    assert(resMinimal.status === 200, "Minimal payload accepted with HTTP 200");
    const dataMinimal = await resMinimal.json();
    assert(dataMinimal.lead?.category === "safar_go", "Omitted interest defaults to safar_go");
    assert(dataMinimal.lead?.metadata?.source === "website", "Omitted source defaults to 'website'");
    createdLeadIds.push(dataMinimal.lead.id);

    // 4.2 Explicit null values for optional fields
    console.log("[4.2] Explicit null values (email: null, service_interest: null, source: null)");
    const resNulls = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Explicit Nulls User`,
        phone: "+919876543210",
        email: null,
        service_interest: null,
        source: null,
      }),
    });
    assert(resNulls.status === 200, "Explicit nulls payload returns HTTP 200");
    const dataNulls = await resNulls.json();
    assert(dataNulls.lead?.category === "safar_go", "Null service interest defaults to safar_go");
    createdLeadIds.push(dataNulls.lead.id);

    // 4.3 Whitespace-only optional fields (should be sanitized to null/empty)
    console.log("[4.3] Whitespace-only optional fields (email: '  ', service_interest: '  ')");
    const resWhitespaceOptional = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Whitespace Optional User`,
        phone: "+919876543210",
        email: "   ",
        service_interest: "   ",
      }),
    });
    assert(resWhitespaceOptional.status === 200, "Whitespace optional fields returns HTTP 200");
    const dataWhitespaceOptional = await resWhitespaceOptional.json();
    assert(dataWhitespaceOptional.lead?.category === "safar_go", "Whitespace interest falls back to safar_go");
    createdLeadIds.push(dataWhitespaceOptional.lead.id);

    // 4.4 Invalid source string (CHECK constraint safety)
    console.log("[4.4] Invalid source string ('tv_advertisement' -> coerced to 'website')");
    const resInvalidSource = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} Invalid Source User`,
        phone: "+919876543210",
        source: "tv_advertisement_unsupported",
      }),
    });
    assert(resInvalidSource.status === 200, "Invalid source does not crash DB check constraint, returns HTTP 200");
    const dataInvalidSource = await resInvalidSource.json();
    assert(dataInvalidSource.lead?.metadata?.source === "website", "Invalid source coerced to valid 'website'");
    createdLeadIds.push(dataInvalidSource.lead.id);

    // 4.5 Valid alternative sources ('whatsapp' and 'manual')
    console.log("[4.5] Valid alternative source 'whatsapp'");
    const resWhatsappSource = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CHALLENGER_PREFIX} WhatsApp Source User`,
        phone: "+919876543210",
        source: "whatsapp",
      }),
    });
    assert(resWhatsappSource.status === 200, "WhatsApp source returns HTTP 200");
    const dataWhatsappSource = await resWhatsappSource.json();
    assert(dataWhatsappSource.lead?.metadata?.source === "whatsapp", "Source 'whatsapp' preserved");
    createdLeadIds.push(dataWhatsappSource.lead.id);

    // ================================================================
    // GROUP 5: PAYLOAD SYNTAX & BODY RESILIENCE
    // ================================================================
    console.log("\n--- GROUP 5: Payload Syntax & Malformed Request Bodies ---");

    // 5.1 Invalid JSON syntax
    console.log("[5.1] Malformed JSON syntax in request body");
    const resBadJson = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ name: broken json without quotes }",
    });
    assert(resBadJson.status === 400, "Malformed JSON syntax returns HTTP 400");
    const dataBadJson = await resBadJson.json();
    assert(dataBadJson.error?.includes("Invalid JSON payload"), `Expected JSON parse error message: ${dataBadJson.error}`);

    // 5.2 Empty JSON body `{}`
    console.log("[5.2] Empty JSON object `{}`");
    const resEmptyObj = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert(resEmptyObj.status === 400, "Empty JSON object returns HTTP 400 ('Name is required.')");

    // ================================================================
    // GROUP 6: DIRECT SUPABASE VERIFICATION & CLEANUP AUDIT
    // ================================================================
    console.log("\n--- GROUP 6: Direct Supabase Database Audit ---");

    console.log(`[6.1] Querying Supabase for all created test lead IDs (${createdLeadIds.length} total)...`);
    const { data: dbLeads, error: dbErr } = await supabase
      .from("leads")
      .select("*")
      .in("id", createdLeadIds);

    assert(!dbErr && Boolean(dbLeads), "Retrieved test leads successfully from Supabase");
    assert(dbLeads.length === createdLeadIds.length, `All ${createdLeadIds.length} leads persisted in Supabase database`);

    // Verify Unicode fidelity in DB
    const unicodeLead = dbLeads.find((l) => l.name.includes("محمد المنهاج"));
    assert(Boolean(unicodeLead), "Found Unicode lead in Supabase database");
    assert(unicodeLead.name.includes("🌟 Sheikh Al-Maktoum ✈️"), "Unicode and emojis preserved verbatim in Postgres");
    assert(unicodeLead.phone === "+971501234567", `UAE phone stored accurately: ${unicodeLead.phone}`);

    // Verify Long Name fidelity in DB
    const longLead = dbLeads.find((l) => l.name.startsWith(`${CHALLENGER_PREFIX}_LONGNAME_`));
    assert(Boolean(longLead), "Found 1,200-char name lead in Supabase");
    assert(longLead.name.length === longName.length, `Database stored full ${longLead.name.length} chars without truncation`);

    // Verify Source Check Constraint safety in DB
    const coercedSourceLead = dbLeads.find((l) => l.name.includes("Invalid Source User"));
    assert(Boolean(coercedSourceLead), "Found invalid source lead in Supabase");
    assert(coercedSourceLead.source === "website", `Invalid source safely constrained to '${coercedSourceLead.source}' in DB`);

    // Verify Automation Logs
    console.log("[6.2] Verifying WhatsApp automation logs in Supabase...");
    const { data: autoLogs, error: autoErr } = await supabase
      .from("automation_logs")
      .select("*")
      .eq("trigger_event", "lead_captured")
      .order("created_at", { ascending: false })
      .limit(50);

    assert(!autoErr && Boolean(autoLogs), "Queried automation_logs from Supabase");

    const matchedLogs = autoLogs.filter((log) => {
      const s = JSON.stringify(log.steps_executed || []);
      return createdLeadIds.some((id) => s.includes(id));
    });
    assert(matchedLogs.length > 0, `Found ${matchedLogs.length} automation log entries linked to adversarial test leads`);

    console.log("\n================================================================");
    console.log(`🎉 ADVERSARIAL STRESS TEST COMPLETED: ${passedCount}/${totalCount} ASSERTIONS PASSED!`);
    console.log("================================================================\n");
  } finally {
    // Teardown audit
    console.log("\n[Teardown Audit] Performing post-test cleanup & verifying 0 residual test records...");
    await cleanTestRecords();

    // Verify 0 test leads remain
    const { data: remainingLeads } = await supabase
      .from("leads")
      .select("id")
      .ilike("name", `%${CHALLENGER_PREFIX}%`);

    assert(!remainingLeads || remainingLeads.length === 0, "Post-test cleanup verified: 0 test records remain in database");

    if (spawnedServer && spawnedServer.pid) {
      console.log(`[Teardown] Terminating spawned Next.js server (PID: ${spawnedServer.pid})...`);
      killProcessTree(spawnedServer.pid);
    }
  }
}

runAdversarialTests().catch((err) => {
  console.error("\n❌ ADVERSARIAL SUITE ENCOUNTERED UNHANDLED ERROR:", err);
  process.exit(1);
});
