# Project: SAFAR N MANZIL CRM AI Backend Worker

## Architecture
- Next.js App Router route handler in `src/app/api/public/lead/route.ts` (POST, OPTIONS).
- Domain Intelligence Engine in `src/lib/safar/agent-knowledge.ts` implementing SAFAR N MANZIL business context, weighted keyword scoring, and personalized FAQ preview generator.
- Supabase PostgreSQL database interface: `supabase/migrations/044_safar_leads_table.sql` and `006_automations.sql`.
- Programmatic Verification Harness: `test_agent.js` at project root with automated server boot, CORS preflight, Safar Go / Safar Home payloads, 400 validation, direct Supabase `leads` table and `automation_logs` assertions, and idempotent teardown.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Deep Codebase Exploration | Explore database schemas, API routes, env vars, Supabase client | None | DONE |
| M2 | Test Infra & Test Agent Script | Create standalone `test_agent.js` satisfying all acceptance criteria | M1 | DONE |
| M3 | Lead Processing API & Agent Logic | Implement API route with categorization & SAFAR business knowledge | M1, M2 | DONE |
| M4 | WhatsApp Automation & Database Logging | Implement WhatsApp flow trigger and DB queueing/logging | M3 | DONE |
| M5 | E2E Testing, Review & Adversarial Hardening | Run `test_agent.js`, run Reviewer & Challenger passes, Forensic Audit | M4 | DONE |

## Interface Contracts
### Public Lead API ↔ Website / Frontend
- Route: `/api/public/lead`
- Method: `POST`
- Headers: `Content-Type: application/json`
- Payload:
  ```json
  {
    "name": "string",
    "phone": "string",
    "email": "string | optional",
    "service_interest": "string (e.g., 'Gulf Travel', 'Safar Go - Dubai Flight & Packing', 'Safar Home - Parents Medical Care')",
    "source": "website | optional"
  }
  ```
- Response (200 OK):
  ```json
  {
    "success": true,
    "lead": {
      "id": "uuid",
      "name": "string",
      "phone": "string",
      "category": "safar_go | safar_home",
      "status": "new",
      "metadata": {
        "service_interest": "string",
        "source": "website",
        "faq_preview": "string"
      }
    },
    "whatsapp_triggered": true,
    "message_id": "string"
  }
  ```

## Verification Summary
- `npm run typecheck`: 0 errors.
- `npm run build`: Exit code 0, all 54 routes compiled successfully.
- `node test_agent.js`: 100% passed across all 6 test phases.
- Reviewers (2/2): Unanimous APPROVE.
- Challengers (2/2): Unanimous CONFIRMED (48/48 edge-case assertions passed, 10-burst and 20-burst concurrency verified).
- Forensic Auditor: Binary Verdict CLEAN.
