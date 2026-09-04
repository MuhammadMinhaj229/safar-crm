# Handoff Report: WhatsApp Automation & Test Harness Investigation

**Author**: Explorer 3 (WhatsApp & Test Harness Explorer)  
**Date**: 2026-09-04T00:14:00+05:30  
**Working Directory**: `C:\Users\User\.gemini\antigravity\scratch\wacrm-inspection\.agents\teamwork_preview_explorer_m1_3`  
**Handoff Type**: Hard (Investigation complete)

---

## 1. Observation

### 1.1 `whatsapp_simulator.js` Analysis & Discrepancies
Direct inspection of `C:\Users\User\.gemini\antigravity\scratch\wacrm-inspection\whatsapp_simulator.js`:
- **Line 56-65**:
  ```javascript
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhooks/whatsapp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  ```
- **Discrepancy 1: Endpoint Path Mismatch**:
  - `whatsapp_simulator.js` targets `/api/webhooks/whatsapp`.
  - Next.js App Router defines the webhook handler at `src/app/api/whatsapp/webhook/route.ts` (URL: `/api/whatsapp/webhook`).
  - `next.config.ts` has no rewrite rule mapping `/api/webhooks/whatsapp` to `/api/whatsapp/webhook`. Any request to `/api/webhooks/whatsapp` returns an immediate HTTP 404 Not Found.
- **Discrepancy 2: Missing Meta Webhook Signature**:
  - `src/app/api/whatsapp/webhook/route.ts` (lines 186-195):
    ```typescript
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    if (!verifyMetaWebhookSignature(rawBody, signature)) {
      console.warn('[webhook] rejected request with invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    ```
  - `src/lib/whatsapp/webhook-signature.ts` (lines 25-33):
    ```typescript
    const secret = process.env.META_APP_SECRET
    if (!secret) {
      console.error('[webhook] META_APP_SECRET is not set — rejecting request...')
      return false
    }
    ```
  - `whatsapp_simulator.js` sends no `x-hub-signature-256` header. Even if the path were fixed, the request is rejected with HTTP 401.
- **Discrepancy 3: Hardcoded Unmatched Phone Number ID**:
  - `whatsapp_simulator.js` (line 25): `phone_number_id: "1244537102079968"`.
  - In `src/app/api/whatsapp/webhook/route.ts` (lines 266-283), incoming events execute:
    ```typescript
    const { data: configRows, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('phone_number_id', phoneNumberId)
    if (!configRows || configRows.length === 0) {
      console.error('No config found for phone_number_id:', phoneNumberId)
      continue
    }
    ```
  - Without a matching record in `whatsapp_config`, inbound messages are dropped.

### 1.2 WhatsApp Integration & Outbound Message Pipeline
- **Outbound Message Sender** (`src/lib/whatsapp/send-message.ts` lines 471-487):
  ```typescript
  const { data: messageRecord, error: msgError } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'agent',
      content_type: messageType,
      content_text: persistedText,
      media_url: mediaUrl || null,
      template_name: templateName || null,
      interactive_payload: messageType === 'interactive' ? interactivePayload : null,
      message_id: waMessageId,
      status: 'sent',
      reply_to_message_id: replyToMessageId || null,
    })
    .select()
    .single();
  ```
- **Automations Engine Sender** (`src/lib/automations/meta-send.ts` lines 224-232):
  ```typescript
  const { error: msgErr } = await db.from('messages').insert({
    conversation_id: input.conversationId,
    sender_type: 'bot',
    content_type,
    content_text,
    template_name,
    message_id: waMessageId,
    status: 'sent',
  })
  ```
- **Meta API Transport** (`src/lib/whatsapp/meta-api.ts` lines 232-259):
  - Sends POST request to `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`.
  - In local development/testing without live Meta credentials, attempting live Meta sends results in network failure or 401/400 from Meta.

### 1.3 Database Queuing and Logging Schema
- **`messages` Table** (`supabase/migrations/001_initial_schema.sql`, `010_flows.sql`, `035_interactive_messages.sql`):
  - `id`: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  - `conversation_id`: UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
  - `sender_type`: TEXT CHECK (sender_type IN ('customer', 'agent', 'bot'))
  - `content_type`: TEXT CHECK (content_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'template', 'interactive'))
  - `content_text`: TEXT
  - `media_url`: TEXT
  - `template_name`: TEXT
  - `interactive_payload`: JSONB
  - `message_id`: TEXT (WAMID or synthetic ID)
  - `status`: TEXT CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed'))
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **`automation_logs` Table** (`supabase/migrations/006_automations.sql`, `017_account_sharing.sql`):
  - `id`: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  - `automation_id`: UUID REFERENCES automations(id) ON DELETE CASCADE
  - `account_id`: UUID NOT NULL REFERENCES accounts(id)
  - `user_id`: UUID NOT NULL REFERENCES auth.users(id)
  - `contact_id`: UUID REFERENCES contacts(id) ON DELETE SET NULL
  - `trigger_event`: TEXT NOT NULL
  - `steps_executed`: JSONB DEFAULT '[]'::jsonb
  - `status`: TEXT CHECK (status IN ('success', 'partial', 'failed'))
  - `error_message`: TEXT
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **`automation_pending_executions` Table** (`supabase/migrations/006_automations.sql`, `017_account_sharing.sql`):
  - `id`: UUID PRIMARY KEY
  - `automation_id`: UUID REFERENCES automations(id)
  - `account_id`: UUID REFERENCES accounts(id)
  - `contact_id`: UUID REFERENCES contacts(id)
  - `status`: TEXT CHECK (status IN ('pending', 'running', 'done', 'failed'))
  - `run_at`: TIMESTAMPTZ (scheduled execution time)
  - `context`: JSONB (accumulated runtime variables)
- **`leads` Table** (`supabase/migrations/044_safar_leads_table.sql`):
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `account_id`: UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
  - `name`: TEXT NOT NULL
  - `phone`: TEXT
  - `email`: TEXT
  - `service_interest`: TEXT
  - `notes`: TEXT
  - `source`: TEXT CHECK (source IN ('website', 'whatsapp', 'manual'))
  - `status`: TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
  - `created_at`: TIMESTAMPTZ DEFAULT now()
  - `updated_at`: TIMESTAMPTZ DEFAULT now()

### 1.4 Existing Lead API Route State
Direct inspection of `src/app/api/public/lead/route.ts`:
- **Line 39-49**:
  ```typescript
  const accountId = process.env.SAFAR_ACCOUNT_ID;
  if (!accountId) {
    console.error("SAFAR_ACCOUNT_ID env var is not set.");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500, headers: { "Access-Control-Allow-Origin": origin } }
    );
  }
  ```
- **Line 51-61**:
  ```typescript
  const { error } = await supabase.from("leads").insert([
    {
      account_id: accountId,
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() ?? null,
      service_interest: service_interest?.trim() ?? null,
      source,
      status: "new",
    },
  ]);
  ```
- **Line 74-84**:
  ```typescript
  return NextResponse.json(
    { success: true, message: "Thank you! We'll be in touch soon." },
    { status: 201, headers: { ... } }
  );
  ```
- **Status in relation to Project Scope**:
  - Currently returns status 201 with `{ success: true, message: ... }`.
  - Does NOT yet perform `safar_go` vs `safar_home` categorization.
  - Does NOT yet return lead details or category in the JSON response.
  - Does NOT yet trigger WhatsApp message queuing/logging.

### 1.5 Environment & Runtime Configuration
- **File**: `.env.local`
  - Configured:
    - `NEXT_PUBLIC_SUPABASE_URL`: `"https://uzpnvylarbfttzhjqduj.supabase.co"`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: valid JWT anon key
    - `SUPABASE_SERVICE_ROLE_KEY`: valid JWT service_role key
    - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: `"safar123"`
    - `META_ACCESS_TOKEN`: `""` (empty)
    - `NODE_ENV`: `"development"`
  - Missing variables:
    1. `SAFAR_ACCOUNT_ID`: Not present in `.env.local`. Causes `/api/public/lead` to fail with HTTP 500.
    2. `META_APP_SECRET`: Not present in `.env.local`. Causes `/api/whatsapp/webhook` to reject all incoming webhooks.
    3. `ENCRYPTION_KEY`: Not present in `.env.local`. Causes `src/lib/whatsapp/encryption.ts` to fail if access token encryption/decryption is invoked.
- **Dependencies (`package.json`)**:
  - Runtime: Node `>= 20.0.0`
  - Supabase client: `@supabase/supabase-js: ^2.107.0`
  - Framework: Next.js `16.2.12`
  - Testing: `vitest: ^4.1.10`

---

## 2. Logic Chain

1. **Simulator Incompatibility**:
   - `whatsapp_simulator.js` targets `/api/webhooks/whatsapp`.
   - Because Next.js has no such route and `next.config.ts` has no rewrite for it, calling `node whatsapp_simulator.js` results in HTTP 404.
   - Furthermore, `src/app/api/whatsapp/webhook/route.ts` requires `x-hub-signature-256` signed by `process.env.META_APP_SECRET`. Since `whatsapp_simulator.js` does not sign payloads, any request directly hitting the webhook will be rejected with HTTP 401.
   - Therefore, `whatsapp_simulator.js` cannot be used as-is for testing without either a proxy/rewrite or an updated test harness that attaches HMAC signatures and hits `/api/whatsapp/webhook`.
2. **WhatsApp Message Queuing Model**:
   - Outbound automation messages in the CRM ecosystem are recorded directly into `messages` table with `sender_type: 'bot'` and `status: 'sent'`.
   - A companion record in `conversations` updates `last_message_text` and `last_message_at`.
   - Automation step execution is recorded into `automation_logs` with JSON details in `steps_executed`.
   - Future or delayed messages are stored in `automation_pending_executions` with `status = 'pending'`.
   - For SAFAR lead captures via the API, the backend worker must record the lead in `leads` and log the initial tailored WhatsApp message in `messages` (and/or `automation_logs`).
3. **Lead API & Missing Configuration**:
   - In `src/app/api/public/lead/route.ts`, the code explicitly requires `process.env.SAFAR_ACCOUNT_ID`.
   - Because `SAFAR_ACCOUNT_ID` is missing from `.env.local`, any POST request to `/api/public/lead` returns HTTP 500 `"Server configuration error."`.
   - In Milestone M2/M3, an account ID from `public.accounts` must be configured in `.env.local` (or dynamically fallback to the default account in the database).
4. **Programmatic Test Script Architecture (`test_agent.js`)**:
   - To provide reliable, automated validation without reliance on manual UI clicks, `test_agent.js` should run directly via `node test_agent.js` using Node's native HTTP fetch and `@supabase/supabase-js`.
   - The test script must verify four distinct dimensions:
     1. HTTP 200/201 response with `{ success: true, lead: { category, status }, whatsapp_triggered: true }`.
     2. Correct classification: "Safar Go" (travel, luggage, packing, flights, taxi) vs "Safar Home" (medical, elderly care, local delivery, home repairs, grocery).
     3. Direct database verification in `leads` table and `messages` table using `supabaseAdmin`.
     4. Strict idempotency: Using clean prefixes (`__TEST_AGENT__`), verifying that pre-existing test data is cleaned before running and cleaned up after execution.

---

## 3. Caveats

1. **Live Meta API Connectivity**: In local or CI environments without a verified WhatsApp Business Account (WABA) or with empty `META_ACCESS_TOKEN`, outbound calls to `graph.facebook.com` will fail unless mocked or guarded with a synthetic development/dry-run mode (similar to `WHATSAPP_TEMPLATES_DRY_RUN=true`).
2. **Schema of `leads` Table**: `044_safar_leads_table.sql` currently has columns `service_interest`, `notes`, `source`, and `status`. It does not have a separate dedicated `category` column. Categorization can either be stored in `notes` (e.g. `[Category: safar_go]`), in a new migration adding a `category` column, or returned directly in the API JSON response object. The test harness specification accommodates both approaches.
3. **Database Network Policy**: Because the explorer subagent operates in CODE_ONLY mode, outbound HTTP requests to external services like Supabase from within this subagent are restricted. However, when the developer or parent orchestrator runs `node test_agent.js` directly on the host machine, full internet/Supabase connectivity is available.

---

## 4. Conclusion & Specification for `test_agent.js`

### 4.1 Specification Overview
`test_agent.js` will be a standalone Node.js verification script located at the project root (`C:\Users\User\.gemini\antigravity\scratch\wacrm-inspection\test_agent.js`).

### 4.2 Test Suite Matrix
| Test Case | Payload `service_interest` | Expected Category | Expected HTTP Status | Expected DB Status | WhatsApp Triggered |
|---|---|---|---|---|---|
| **TC-1: Safar Go (Travel & Packing)** | `"Safar Go - Flight Tickets & Baggage Packing"` | `"safar_go"` | 200 (or 201) | `'new'` / `'qualified'` | `true` |
| **TC-2: Safar Home (Family Care)** | `"Safar Home - Parents Medical Coordination"` | `"safar_home"` | 200 (or 201) | `'new'` / `'qualified'` | `true` |
| **TC-3: Categorization Fallback** | `"General inquiry about services"` | `"safar_go"` or `"safar_home"` (deterministic default) | 200 (or 201) | `'new'` | `true` |
| **TC-4: Validation Failure** | Missing `name` or `phone` | `N/A` | 400 | No DB insert | `false` |
| **TC-5: Idempotent Resubmission** | Resending same phone number | Consistent category | 200 (or 201) | Updated / deduplicated | `true` |

### 4.3 Database Assertions Specification
Using `@supabase/supabase-js` service role client:
1. **`leads` Table**:
   - `SELECT * FROM leads WHERE phone = :testPhone`
   - Assert `record.name == payload.name`
   - Assert `record.service_interest == payload.service_interest`
   - Assert `record.source == 'website'`
   - Assert `record.status` in `['new', 'qualified', 'contacted']`
2. **`messages` Table**:
   - `SELECT * FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE contact_id IN (SELECT id FROM contacts WHERE phone = :testPhone))`
   - Or direct search in `messages` where `content_text ILIKE '%Safar%'`
   - Assert `sender_type == 'bot'`
   - Assert `content_text` contains category-appropriate welcome text (e.g. mentions travel/packing for Safar Go, or family/medical support for Safar Home).
3. **`automation_logs` Table** (if automation engine is dispatched):
   - Assert log row exists with `status == 'success'`.

### 4.4 Setup and Teardown (Idempotency) Specification
```javascript
const TEST_PHONE_PREFIX = "+9100000";
const TEST_NAME_PREFIX = "__TEST_AGENT__";

async function cleanupTestData(supabase) {
  // 1. Delete from messages linked to test contacts
  // 2. Delete from conversations linked to test contacts
  // 3. Delete from contacts where phone like '+9100000%'
  // 4. Delete from leads where name like '__TEST_AGENT__%' or phone like '+9100000%'
  await supabase.from('leads').delete().like('name', `${TEST_NAME_PREFIX}%`);
  await supabase.from('contacts').delete().like('name', `${TEST_NAME_PREFIX}%`);
}
```
- Setup executes `cleanupTestData()` before running test cases to clear stale records.
- Teardown executes `cleanupTestData()` in a `finally` block to ensure a pristine database state.

### 4.5 Required Environment Adjustments Before Running
1. Set `SAFAR_ACCOUNT_ID` in `.env.local` (retrieve from `accounts` table using service role key).
2. Set `ENCRYPTION_KEY` in `.env.local` (64-character hex string).
3. Ensure Next.js server is booted (`npm run dev` at `http://localhost:3000`).

---

## 5. Verification Method

To verify the findings and test harness readiness:

1. **Verify `whatsapp_simulator.js` path mismatch**:
   - Inspect `whatsapp_simulator.js:59` (`path: '/api/webhooks/whatsapp'`).
   - Check directory `src/app/api/` — note that the actual route is `src/app/api/whatsapp/webhook/route.ts`.
2. **Verify missing `SAFAR_ACCOUNT_ID` impact**:
   - Inspect `src/app/api/public/lead/route.ts:39-49`.
   - Inspect `.env.local` — note that `SAFAR_ACCOUNT_ID` is absent.
3. **Verify table schemas**:
   - Inspect `supabase/migrations/044_safar_leads_table.sql` for `leads` schema.
   - Inspect `supabase/migrations/001_initial_schema.sql` (lines 163-175) for `messages` schema.
   - Inspect `supabase/migrations/006_automations.sql` for `automation_logs` and `automation_pending_executions`.
4. **Verify test runner dependencies**:
   - Run `node -v` to ensure Node >= 20.
   - Verify `@supabase/supabase-js` exists in `node_modules`.
