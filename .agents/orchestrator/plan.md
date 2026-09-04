# Execution Plan: SAFAR N MANZIL AI Agent Backend Worker

## Objective
Build, verify, and test a world-class AI agent backend worker for SAFAR N MANZIL that processes form submissions, categorizes leads in the CRM, and triggers automated WhatsApp broadcasts.

## Step-by-Step Execution Plan

### Phase 1: Exploration & Discovery (M1)
- Dispatch 3 parallel Explorers:
  - **Explorer 1**: Explore Supabase database schema, migrations (`044_safar_leads_table.sql`, messages table, automation logs, whatsapp configs), and Supabase server client usage in `src/lib/supabase/`.
  - **Explorer 2**: Explore existing API routes (`src/app/api/` or `src/pages/api/`), routing conventions, authentication/public access patterns, CORS, and request handling.
  - **Explorer 3**: Explore WhatsApp integration/simulator (`whatsapp_simulator.js`, existing automation flows/webhooks/templates), and requirements for `test_agent.js`.
- Aggregate Explorer findings into `synthesis.md`.

### Phase 2: Implementation & E2E Testing Infrastructure (M2 & M3 & M4)
- Worker 1:
  - Implement/extend the Next.js API route (`/api/public/lead` or dedicated agent route) with SAFAR N MANZIL agent logic:
    - Parse name, phone, service_interest.
    - Categorize lead (`safar_go`, `safar_home`).
    - Insert/update into Supabase `leads` table.
    - Generate intelligent SAFAR response tailored to service interest (Gulf travel, packing, home assistance).
    - Queue or log WhatsApp message payload in database (`messages` / `automation_logs`).
  - Implement `test_agent.js` standalone programmatic test script:
    - Tests endpoint with mock payloads (Safar Go, Safar Home).
    - Verifies 200 OK and categorized data response.
    - Verifies DB insertion and status update in `leads` table.
    - Verifies WhatsApp payload logging/queuing in the database.
  - Run build / tests / `test_agent.js` and report outputs in handoff.

### Phase 3: Review & Verification
- Reviewer 1 & 2:
  - Verify code quality, type safety, schema conformance, error handling.
  - Run build, linter, tests, and `test_agent.js`.
- Challenger 1 & 2:
  - Stress-test endpoint with boundary cases (missing fields, malformed phone numbers, unhandled service interests, injection payloads, concurrency).
  - Verify database integrity and error responses.

### Phase 4: Forensic Integrity Audit & Victory Report
- Auditor (`teamwork_preview_auditor`):
  - Check for hardcoding, fake mocks, cheating, bypasses.
  - Confirm genuine business logic and authentic DB operations.
- Final synthesis & report victory to Sentinel.
