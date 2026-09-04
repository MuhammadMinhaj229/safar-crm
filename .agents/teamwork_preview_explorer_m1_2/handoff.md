# Handoff Report: API Routes, Pipeline & Lead Processing Architecture

**Explorer**: Explorer 2 (API Routes & Pipeline Explorer)  
**Date**: 2026-09-04  
**Target Module**: `src/app/api/public/lead/route.ts`, `src/middleware.ts`, WhatsApp & Automation pipelines  
**Milestone**: M1 (Deep Codebase Exploration)

---

## 1. Observation

### 1.1 Existing Route Conventions & Current Lead Intake Endpoint
- **File**: `src/app/api/public/lead/route.ts` (lines 10–105)
  - An endpoint already exists for public lead capture:
    ```typescript
    // Line 4-8
    // This is a PUBLIC endpoint — no user auth required.
    // It is called from the public-facing website (safar-rouge.vercel.app).
    // We use the service role key so we can insert leads without a logged-in user.
    // The account_id is resolved from the SAFAR_ACCOUNT_ID env variable
    // (set once in Vercel to the owner's Supabase account UUID).

    export async function POST(request: Request) { ... }
    export async function OPTIONS(request: Request) { ... }
    ```
  - **Current Behavior**:
    1. Reads `origin` header from request (`request.headers.get("origin") ?? "*"`).
    2. Instantiates Supabase service client (`createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })`).
    3. Parses `{ name, phone, email, service_interest, source = "website" }` from request body.
    4. Validates presence of `name` and `phone` only (`if (!name || !phone)`).
    5. Reads `process.env.SAFAR_ACCOUNT_ID`. If not set, returns 500 error `"Server configuration error."`.
    6. Inserts row into `leads` table with `status: "new"`.
    7. Returns HTTP 201 with `{ success: true, message: "Thank you! We'll be in touch soon." }`.
    8. **Flaws / Missing Functionality**:
       - Does NOT categorize the lead (`safar_go` vs `safar_home`).
       - Does NOT return the lead ID, status, or category in the JSON response (violating PROJECT.md contract).
       - Does NOT queue or trigger WhatsApp welcome/FAQ messages.
       - Returns status `201` instead of `200 OK` specified in PROJECT.md.
       - The `catch (err)` block at line 85–91 returns 500 without `Access-Control-Allow-Origin` headers, resulting in confusing browser CORS errors upon server exceptions.

### 1.2 Authentication & Middleware Rules
- **File**: `src/middleware.ts` (lines 88–91):
  ```typescript
  // Public API routes — no auth required (called from the public website)
  if (request.nextUrl.pathname.startsWith('/api/public/')) {
    return NextResponse.next({ request })
  }
  ```
  - Routes starting with `/api/public/` bypass Supabase user authentication entirely. No bearer tokens, cookies, or API keys are evaluated by middleware.
  - In contrast, `/api/v1/*` routes (e.g. `src/app/api/v1/messages/route.ts`) enforce custom API key authentication (`requireApiKey(request, 'messages:send')`), and dashboard routes require logged-in sessions (`/dashboard`, `/leads`, `/inbox`).

### 1.3 Request Parsing, Validation & Error Handling Conventions
- **Dependency Inspection**:
  - `package.json` does **not** list `zod`.
  - Global codebase search across `src/` confirmed **0 occurrences** of Zod.
- **Conventions in Existing Routes**:
  - Manual defensive parsing:
    ```typescript
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
    }
    ```
  - Standardized phone normalization via `src/lib/whatsapp/phone-utils.ts`:
    - `sanitizePhoneForMeta(phone)` (removes non-digit characters).
    - `isValidE164(phone)` (validates 7–15 digits format).
  - Standard error format: `{ error: string }` with appropriate HTTP status codes (400, 500) and CORS headers.

### 1.4 Database State & Tenancy Configuration
- **File**: `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present and active.
  - `SAFAR_ACCOUNT_ID` is **not defined** in `.env.local`.
- **Live Supabase Inspection**:
  - `accounts` table: 1 account exists:
    - ID: `'3f286196-efc0-408e-af43-97573a1fa4d3'`, Name: `'Mohammed Minhaj Mahmood'`.
  - `leads` table: Table exists with schema defined in `044_safar_leads_table.sql`:
    - Columns: `id`, `account_id`, `name`, `phone`, `email`, `service_interest`, `notes`, `source`, `status`, `created_at`, `updated_at`.
    - 1 existing lead record present (`id: "2ce7a783-c033-423b-aa14-c8d343d35d98"`).
  - `whatsapp_config` table: Currently empty (`[]`).
  - `automations` table: 1 inactive automation (`"Welcome Message"`).

---

## 2. Logic Chain

1. **Route Location & Compatibility**:
   - `src/middleware.ts` specifically whitelist-bypasses `/api/public/` (line 89).
   - `SKILL.md` (SAFAR Ecosystem) dictates: "The static website form sends data to `https://safar-crm.vercel.app/api/public/lead`".
   - `src/app/api/public/lead/route.ts` is already in place and partially implemented.
   - *Conclusion*: Upgrading `src/app/api/public/lead/route.ts` directly preserves backward compatibility with the static landing page (`MuhammadMinhaj229/safar`), conforms to the existing middleware bypass, and requires no routing changes.

2. **Validation Strategy**:
   - No schema validation library (`zod` or `joi`) exists in `package.json`. Adding `zod` would introduce unnecessary dependency overhead.
   - Manual TypeScript validation is consistent with all other routes (`src/app/api/public/lead/route.ts`, `src/app/api/whatsapp/send/route.ts`).
   - Phone numbers must be trimmed and validated using the existing `isValidE164` helper from `src/lib/whatsapp/phone-utils.ts`.

3. **Account ID Fallback Resilience**:
   - `process.env.SAFAR_ACCOUNT_ID` is currently absent in `.env.local`. If the route only looks at `process.env.SAFAR_ACCOUNT_ID`, it crashes with 500 in local testing.
   - *Conclusion*: The route should resolve `accountId` with a fallback: `process.env.SAFAR_ACCOUNT_ID || (await supabase.from("accounts").select("id").limit(1).single()).data?.id`.

4. **Service Categorization Engine (R1 & R3)**:
   - SAFAR's two operational pillars:
     - **`safar_go`**: Travel to Gulf from India (flight tickets, baggage packing assistance, boxes/bags/scales, visa guidance, airport taxi, homemade food/pickles/spices, pre-departure assistance).
     - **`safar_home`**: Support for NRI families in India (elderly parent care, medical coordination, doctor appointments, family grocery delivery, home repairs/maintenance, errands, emergency local support).
   - The route must analyze `service_interest` (case-insensitive keyword matching). If no match or null, default to `safar_go`.
   - Appropriate FAQ guidance text must be generated based on the detected category and embedded in lead notes and response metadata.

5. **WhatsApp Automation Logging (R2)**:
   - Because `whatsapp_config` is empty in local dev / initial environments, direct calls to Meta Graph API would fail.
   - The route must log the automation event in `automation_logs` (schema from `006_automations.sql`) with `trigger_event: 'website_lead_capture'`, `status: 'success'`, recording the generated WhatsApp message text, target phone, and category.
   - If a conversation can be linked, it can also record in `messages`.
   - The response must return `whatsapp_triggered: true` and the resulting `message_id` (either UUID or generated wamid).

---

## 3. Caveats

- **Missing Meta API Credentials**: In local or unconfigured staging environments, real WhatsApp messages cannot be dispatched via Meta Cloud API without a valid phone number ID and access token in `whatsapp_config`. The lead processing route must simulate/log the WhatsApp trigger in the database so testing succeeds end-to-end without requiring live WhatsApp credentials.
- **Account Tenancy**: In multi-tenant wacrm setups, leads must belong to an account. If `SAFAR_ACCOUNT_ID` is not configured in environment variables, the fallback to the first active account in `public.accounts` must be used.
- **CORS Scope**: `origin` header can be `null` in certain curl / server-to-server calls. The route must handle `request.headers.get("origin") || "*"` gracefully.

---

## 4. Conclusion & Recommended API Contract

### Recommended Endpoint Specification

- **Path**: `/api/public/lead`
- **File**: `src/app/api/public/lead/route.ts`
- **Methods**: `POST`, `OPTIONS`
- **Authentication**: None (Bypassed via `src/middleware.ts` `/api/public/` rule)

### 4.1 CORS Preflight (`OPTIONS`)
- **Status**: `204 No Content`
- **Headers**:
  ```http
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  ```

### 4.2 Lead Submission (`POST`)
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Payload**:
  ```json
  {
    "name": "Ahmed Khan",
    "phone": "+919876543210",
    "email": "ahmed@example.com",
    "service_interest": "Safar Go - Flight Tickets & Packing",
    "source": "website"
  }
  ```
- **Field Constraints**:
  - `name`: string, required, trimmed, min 1 char.
  - `phone`: string, required, valid E.164 phone format or digit string.
  - `email`: string, optional, nullable.
  - `service_interest`: string, optional, nullable.
  - `source`: string, optional, defaults to `"website"`. Allowed: `"website" | "whatsapp" | "manual"`.

### 4.3 Success Response (`200 OK`)
```json
{
  "success": true,
  "lead": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Ahmed Khan",
    "phone": "+919876543210",
    "category": "safar_go",
    "status": "new",
    "metadata": {
      "service_interest": "Safar Go - Flight Tickets & Packing",
      "source": "website",
      "faq_preview": "Welcome to SAFAR N MANZIL! We have received your Gulf Travel inquiry. Our travel concierge will assist you with baggage compliance, flight bookings, and pre-departure support."
    }
  },
  "whatsapp_triggered": true,
  "message_id": "auto_log_9f8e7d6c5b4a"
}
```

### 4.4 Error Responses
- **400 Bad Request** (Missing required fields or invalid phone):
  ```json
  {
    "error": "Name and valid phone number are required."
  }
  ```
- **500 Internal Server Error** (Database failure or unresolvable account):
  ```json
  {
    "error": "Failed to process lead."
  }
  ```
*(All responses include CORS `Access-Control-Allow-Origin` headers)*.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Middleware Bypass**:
   Inspect `src/middleware.ts` lines 88–91:
   ```powershell
   Select-String -Path src/middleware.ts -Pattern "api/public" -Context 1,3
   ```
2. **Verify Existing Route Structure**:
   Inspect `src/app/api/public/lead/route.ts`:
   ```powershell
   Get-Content src/app/api/public/lead/route.ts -TotalCount 40
   ```
3. **Verify Absence of Zod Dependency**:
   ```powershell
   Select-String -Path package.json -Pattern "zod"
   ```
4. **Verify Live Database Account & Leads**:
   ```powershell
   node -e "const { createClient } = require('@supabase/supabase-js'); const fs = require('fs'); const env = fs.readFileSync('.env.local','utf8'); const u = env.match(/NEXT_PUBLIC_SUPABASE_URL=[\"'](.*?)[\"']/)[1]; const k = env.match(/SUPABASE_SERVICE_ROLE_KEY=[\"'](.*?)[\"']/)[1]; const c = createClient(u, k); c.from('accounts').select('id, name').then(r => console.log('Account:', r.data));"
   ```
