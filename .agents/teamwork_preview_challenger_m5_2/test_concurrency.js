/**
 * Concurrency, Schema Constraints & Database Persistence Stress Harness
 * Agent: Challenger 2 (Database & Concurrency Challenger)
 */

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

// 1. Load environment from project root .env.local
const PROJECT_ROOT = path.resolve(__dirname, "../..");

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
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
const TEST_PREFIX = "__CHALLENGER2_";

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

async function safeFetch(url, options = {}, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Connection: "close",
          ...(options.headers || {}),
        },
      });
      return res;
    } catch (err) {
      const isReset =
        err.code === "ECONNRESET" ||
        err?.cause?.code === "ECONNRESET" ||
        err.message?.includes("fetch failed");
      if (isReset && i < retries) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
}

async function isServerReady(url) {
  try {
    const res = await safeFetch(url, { method: "OPTIONS" }, 1);
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

  console.log(`[Test Setup] No active server at ${BASE_URL}. Spawning Next.js server...`);
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  spawnedServer = spawn(npxCmd, ["next", "dev", "-p", "3000"], {
    cwd: PROJECT_ROOT,
    stdio: "ignore",
    shell: true,
  });

  const startTime = Date.now();
  const timeoutMs = 60000;
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await isServerReady(ENDPOINT)) {
      console.log(`[Test Setup] Next.js dev server successfully booted.`);
      return;
    }
  }

  throw new Error(`Timeout waiting for Next.js dev server on ${BASE_URL}`);
}

async function cleanTestRecords() {
  console.log(`[DB Teardown] Purging ${TEST_PREFIX} test records from Supabase...`);
  try {
    const { data: testLeads, error: findErr } = await supabase
      .from("leads")
      .select("id")
      .ilike("name", `%${TEST_PREFIX}%`);

    if (testLeads && testLeads.length > 0) {
      const leadIds = testLeads.map((l) => l.id);

      // 1. Delete associated automation logs
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

      // 2. Delete leads
      const { error: delErr } = await supabase.from("leads").delete().in("id", leadIds);
      if (delErr) {
        console.warn("[DB Teardown] Lead deletion error:", delErr);
      } else {
        console.log(`[DB Teardown] Successfully removed ${testLeads.length} test lead(s).`);
      }
    } else {
      console.log(`[DB Teardown] No lingering test records found.`);
    }
  } catch (err) {
    console.warn(`[DB Teardown] Non-fatal cleanup exception:`, err.message);
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runHarness() {
  console.log("===============================================================");
  console.log("⚡ CHALLENGER 2: DATABASE & CONCURRENCY EMPIRICAL TEST SUITE ⚡");
  console.log("===============================================================\n");

  await ensureServerRunning();
  await cleanTestRecords();

  const report = {
    timestamp: new Date().toISOString(),
    burstTest: null,
    heavyBurstTest: null,
    dedupSequentialTest: null,
    dedupConcurrentTest: null,
    schemaConstraintTest: null,
    notesEncodingTest: null,
  };

  try {
    // ----------------------------------------------------------------
    // 1. BURST CONCURRENCY TEST (10 Simultaneous Submissions)
    // ----------------------------------------------------------------
    console.log("\n--- [SUITE 1] 10 Simultaneous Burst Submissions ---");
    const burstCount = 10;
    const burstPayloads = [];

    for (let i = 1; i <= burstCount; i++) {
      const isGo = i % 2 === 1;
      burstPayloads.push({
        name: `${TEST_PREFIX}BurstUser_${i}`,
        phone: `+9198765400${i.toString().padStart(2, "0")}`,
        email: `burst_${i}@example.com`,
        service_interest: isGo
          ? `Safar Go - Flight booking, transit baggage, spices & boxes inquiry #${i}`
          : `Safar Home - Elderly parent hospital visit and medicine delivery #${i}`,
        source: "website",
      });
    }

    const t0 = Date.now();
    const burstPromises = burstPayloads.map((payload) =>
      safeFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        const body = await res.json();
        return { status: res.status, ok: res.ok, body, payload };
      })
    );

    const burstResults = await Promise.all(burstPromises);
    const burstDurationMs = Date.now() - t0;
    console.log(`10 concurrent requests resolved in ${burstDurationMs}ms (avg ${(burstDurationMs / 10).toFixed(1)}ms per request)`);

    // Verify HTTP status & payload correctness
    let allOk = true;
    const insertedLeadIds = [];

    for (let i = 0; i < burstResults.length; i++) {
      const r = burstResults[i];
      if (r.status !== 200 || !r.body.success) {
        allOk = false;
        console.error(`Request ${i + 1} failed: Status ${r.status}`, r.body);
      } else {
        insertedLeadIds.push(r.body.lead.id);
      }
    }
    assert(allOk, `All 10 concurrent requests returned HTTP 200 OK`);
    assert(insertedLeadIds.length === 10, `All 10 requests returned valid lead IDs`);

    // Verify all 10 are in Supabase leads table
    console.log("[Verifying Database Persistence for Burst Leads]");
    const { data: dbLeads, error: dbLeadsErr } = await supabase
      .from("leads")
      .select("*")
      .in("id", insertedLeadIds);

    assert(!dbLeadsErr, `Supabase leads query succeeded without error`);
    assert(dbLeads && dbLeads.length === 10, `Exactly 10 records found in Supabase 'leads' table (no dropped records)`);

    // Verify notes, category, schema attributes on each
    for (const lead of dbLeads) {
      assert(lead.status === "new", `Lead ${lead.id} status is 'new'`);
      assert(lead.source === "website", `Lead ${lead.id} source is 'website'`);
      assert(lead.account_id !== null, `Lead ${lead.id} has non-null account_id`);
      assert(lead.notes.includes("Category: safar_"), `Lead ${lead.id} notes contains category`);
      assert(lead.notes.includes("Safar"), `Lead ${lead.id} notes contains FAQ preview text`);
    }

    // Verify automation_logs for all 10
    console.log("[Verifying Automation Logs Persistence for Burst Leads]");
    const { data: autoLogs, error: autoErr } = await supabase
      .from("automation_logs")
      .select("id, steps_executed, status, trigger_event");

    assert(!autoErr, `Supabase automation_logs query succeeded`);

    let matchedLogsCount = 0;
    for (const leadId of insertedLeadIds) {
      const matched = autoLogs.find((l) => JSON.stringify(l.steps_executed || []).includes(leadId));
      if (matched && matched.status === "success" && matched.trigger_event === "lead_captured") {
        matchedLogsCount++;
      }
    }
    assert(
      matchedLogsCount === 10,
      `All 10 leads have a corresponding 'success' record in 'automation_logs' (found ${matchedLogsCount}/10)`
    );

    report.burstTest = {
      count: 10,
      durationMs: burstDurationMs,
      avgLatencyMs: Number((burstDurationMs / 10).toFixed(1)),
      allPassed: true,
      dbRecordsVerified: 10,
      automationLogsVerified: 10,
    };

    // ----------------------------------------------------------------
    // 2. HEAVY BURST CONCURRENCY (20 Simultaneous Submissions)
    // ----------------------------------------------------------------
    console.log("\n--- [SUITE 2] Stress Burst (20 Simultaneous Submissions) ---");
    const heavyCount = 20;
    const heavyPayloads = [];
    for (let i = 1; i <= heavyCount; i++) {
      heavyPayloads.push({
        name: `${TEST_PREFIX}Heavy_${i}`,
        phone: `+9198765300${i.toString().padStart(2, "0")}`,
        email: `heavy_${i}@example.com`,
        service_interest: i % 2 === 0 ? "Safar Go flights" : "Safar Home doctor care",
        source: "website",
      });
    }

    const tHeavy = Date.now();
    const heavyResults = await Promise.all(
      heavyPayloads.map((payload) =>
        safeFetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(async (res) => ({ status: res.status, ok: res.ok, body: await res.json() }))
      )
    );
    const heavyDurationMs = Date.now() - tHeavy;
    console.log(`20 concurrent requests resolved in ${heavyDurationMs}ms (avg ${(heavyDurationMs / 20).toFixed(1)}ms per request)`);

    const heavyOkCount = heavyResults.filter((r) => r.status === 200 && r.body.success).length;
    assert(heavyOkCount === heavyCount, `All 20 heavy burst requests returned HTTP 200 OK (${heavyOkCount}/${heavyCount})`);

    const heavyLeadIds = heavyResults.map((r) => r.body.lead.id);
    const { data: dbHeavyLeads } = await supabase.from("leads").select("id").in("id", heavyLeadIds);
    assert(dbHeavyLeads && dbHeavyLeads.length === 20, `Supabase confirmed all 20 leads persisted with zero lockouts`);

    report.heavyBurstTest = {
      count: 20,
      durationMs: heavyDurationMs,
      avgLatencyMs: Number((heavyDurationMs / 20).toFixed(1)),
      passed: heavyOkCount === 20,
    };

    // ----------------------------------------------------------------
    // 3. IDEMPOTENCY / DEDUPLICATION INVESTIGATION
    // ----------------------------------------------------------------
    console.log("\n--- [SUITE 3] Deduplication & Idempotency Behavior ---");

    // 3a. Sequential Duplicate Submission
    console.log("[Test 3a] Sequential duplicate submissions with identical phone (+919876599999)");
    const dupPhone = "+919876599999";
    const sub1 = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${TEST_PREFIX}DupUser_First`,
        phone: dupPhone,
        service_interest: "Safar Go - Dubai Packing",
      }),
    });
    const dataSub1 = await sub1.json();

    const sub2 = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${TEST_PREFIX}DupUser_Second`,
        phone: dupPhone,
        service_interest: "Safar Home - Doctor Escort",
      }),
    });
    const dataSub2 = await sub2.json();

    assert(dataSub1.success && dataSub2.success, "Both sequential submissions succeeded with 200 OK");
    console.log(`  Lead 1 ID: ${dataSub1.lead.id}, Lead 2 ID: ${dataSub2.lead.id}`);

    // Query DB for this phone
    const { data: dupLeadsInDb } = await supabase
      .from("leads")
      .select("id, name, service_interest, notes, created_at")
      .eq("phone", dupPhone);

    console.log(`  Total leads in DB for phone ${dupPhone}: ${dupLeadsInDb?.length}`);
    const isMultiLead = dupLeadsInDb && dupLeadsInDb.length === 2;
    console.log(
      `  [Observation] Ingestion model: ${
        isMultiLead
          ? "APPEND-LOG / MULTI-CAPTURE (Every submission generates an independent unqualified lead record)"
          : "UPSERT / DE-DUPED (Overwrites or updates existing lead record)"
      }`
    );

    report.dedupSequentialTest = {
      phone: dupPhone,
      submissionsCount: 2,
      recordsInDb: dupLeadsInDb?.length,
      behavior: isMultiLead ? "append_every_lead" : "upsert_dedup",
    };

    // 3b. Concurrent Duplicate Submission (Race condition on identical phone)
    console.log("[Test 3b] Concurrent duplicate submissions with identical phone (+919876588888)");
    const racePhone = "+919876588888";
    const racePromises = [1, 2, 3, 4, 5].map((idx) =>
      safeFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${TEST_PREFIX}RaceUser_${idx}`,
          phone: racePhone,
          service_interest: `Inquiry simultaneous #${idx}`,
        }),
      }).then(async (res) => ({ status: res.status, body: await res.json() }))
    );

    const raceResults = await Promise.all(racePromises);
    const raceAllOk = raceResults.every((r) => r.status === 200 && r.body.success);
    assert(raceAllOk, `All 5 concurrent requests with identical phone completed HTTP 200 without DB locks or crashes`);

    const { data: raceDbRows } = await supabase
      .from("leads")
      .select("id, name")
      .eq("phone", racePhone);

    console.log(`  Concurrent duplicate rows stored in DB: ${raceDbRows?.length} of 5`);
    report.dedupConcurrentTest = {
      phone: racePhone,
      requestsSent: 5,
      successfulResponses: raceResults.filter((r) => r.status === 200).length,
      dbRowsCreated: raceDbRows?.length,
    };

    // ----------------------------------------------------------------
    // 4. SCHEMA CONSTRAINTS & EDGE CASES
    // ----------------------------------------------------------------
    console.log("\n--- [SUITE 4] Schema Constraints & Edge Cases ---");

    // 4a. Source check constraint
    console.log("[Test 4a] Testing source normalization against DB check constraint");
    const resBadSource = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${TEST_PREFIX}SourceCheck`,
        phone: "+919876577777",
        source: "invalid_hacker_source",
        service_interest: "Testing DB source constraint",
      }),
    });
    assert(resBadSource.status === 200, "API handles unknown source without 500 error");
    const dataBadSource = await resBadSource.json();
    const { data: dbSourceLead } = await supabase
      .from("leads")
      .select("source")
      .eq("id", dataBadSource.lead.id)
      .single();
    assert(
      dbSourceLead.source === "website",
      `Unknown source correctly normalized to 'website' to prevent DB CHECK constraint violation (stored: '${dbSourceLead.source}')`
    );

    // 4b. Phone normalization with domestic trunk 0
    console.log("[Test 4b] Testing domestic 0-trunk phone normalization (09876566666)");
    const resTrunk = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${TEST_PREFIX}TrunkCheck`,
        phone: "09876566666",
        service_interest: "Testing phone normalization",
      }),
    });
    assert(resTrunk.status === 200, "0-trunk phone processed with 200 OK");
    const dataTrunk = await resTrunk.json();
    assert(dataTrunk.lead.phone === "+919876566666", `Phone formatted to standard international E.164: '${dataTrunk.lead.phone}'`);

    // 4c. Extreme length input
    console.log("[Test 4c] Testing very long input string in service_interest");
    const longText = "Safar Go flight and luggage assistance ".repeat(50);
    const resLong = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${TEST_PREFIX}LongInput`,
        phone: "+919876555555",
        service_interest: longText,
      }),
    });
    assert(resLong.status === 200, "Large payload processed successfully without truncation crash");

    // 4d. Missing Name validation
    console.log("[Test 4d] Missing name validation (should return 400)");
    const resNoName = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+919876544444" }),
    });
    assert(resNoName.status === 400, `Missing name returns HTTP 400 (received ${resNoName.status})`);

    // 4e. Missing Phone validation
    console.log("[Test 4e] Missing phone validation (should return 400)");
    const resNoPhone = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${TEST_PREFIX}NoPhone` }),
    });
    assert(resNoPhone.status === 400, `Missing phone returns HTTP 400 (received ${resNoPhone.status})`);

    // 4f. Invalid Phone string
    console.log("[Test 4f] Invalid phone format validation (should return 400)");
    const resBadPhone = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${TEST_PREFIX}BadPhone`, phone: "abc12345" }),
    });
    assert(resBadPhone.status === 400, `Invalid phone format returns HTTP 400 (received ${resBadPhone.status})`);

    report.schemaConstraintTest = { allPassed: true };

    // ----------------------------------------------------------------
    // 5. NOTES ENCODING & DOMAIN KNOWLEDGE VERIFICATION
    // ----------------------------------------------------------------
    console.log("\n--- [SUITE 5] Notes Field Encoding & FAQ Preview Verification ---");
    const testGoNotesRes = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${TEST_PREFIX}NotesGoCheck`,
        phone: "+919876533333",
        service_interest: "Safar Go - Dubai flight tickets, baggage packaging, prohibited foods and khus khus seeds rules",
      }),
    });
    const testGoNotesData = await testGoNotesRes.json();
    const { data: dbNotesGo } = await supabase
      .from("leads")
      .select("notes, status, service_interest")
      .eq("id", testGoNotesData.lead.id)
      .single();

    assert(
      dbNotesGo.notes.startsWith("Category: safar_go"),
      "Notes field starts with strictly encoded 'Category: safar_go'"
    );
    assert(
      dbNotesGo.notes.includes("Safar Go"),
      "Notes field contains tailored Safar Go FAQ preview"
    );

    const testHomeNotesRes = await safeFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${TEST_PREFIX}NotesHomeCheck`,
        phone: "+919876522222",
        service_interest: "Safar Home - Elderly father cardiac checkup, monthly medicines in Bangalore",
      }),
    });
    const testHomeNotesData = await testHomeNotesRes.json();
    const { data: dbNotesHome } = await supabase
      .from("leads")
      .select("notes, status, service_interest")
      .eq("id", testHomeNotesData.lead.id)
      .single();

    assert(
      dbNotesHome.notes.startsWith("Category: safar_home"),
      "Notes field starts with strictly encoded 'Category: safar_home'"
    );
    assert(
      dbNotesHome.notes.includes("Safar Home"),
      "Notes field contains tailored Safar Home FAQ preview"
    );

    report.notesEncodingTest = {
      safarGoVerified: true,
      safarHomeVerified: true,
    };

    console.log("\n===============================================================");
    console.log("🏆 ALL CONCURRENCY, DATABASE & SCHEMA STRESS TESTS PASSED!");
    console.log("===============================================================\n");
  } finally {
    // Teardown: purge test records
    await cleanTestRecords();

    if (spawnedServer && spawnedServer.pid) {
      console.log(`[Cleanup] Terminating spawned server (PID: ${spawnedServer.pid})...`);
      killProcessTree(spawnedServer.pid);
    }
  }

  return report;
}

runHarness()
  .then((report) => {
    fs.writeFileSync(
      path.join(__dirname, "test_results.json"),
      JSON.stringify(report, null, 2)
    );
    console.log("[Report] Test execution results saved to test_results.json");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ STRESS HARNESS FAILED:", err);
    process.exit(1);
  });
