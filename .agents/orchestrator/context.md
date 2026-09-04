# Context: SAFAR N MANZIL CRM Agent Backend Worker

## Business Overview
- **Brand Identity**: SAFAR N MANZIL
- **Core Themes**: SAFAR Orange (`#FF9B6A`), Typography (Nunito, Dancing Script), premium, trustworthy, simple.
- **Two-Repo Architecture**:
  1. Static Website (`MuhammadMinhaj229/safar`) - captures leads. Sends lead submissions to CRM API endpoint.
  2. CRM Backend (`MuhammadMinhaj229/safar-crm`) - Next.js, Supabase, Tailwind (wacrm fork).
- **Core Value Proposition**:
  - **Safar Go**: Gulf travel assistance from India (visa, flights, packing guidelines, pre-departure assistance, documentation, airport transit).
  - **Safar Home**: Family assistance back home in India for NRIs working in the Gulf (elderly parent care, medical coordination, home maintenance, emergency local support).
- **Data Model Segregation**:
  - `leads`: Unqualified form captures from website or WhatsApp.
  - `contacts`: Verified, active customers paying for services.
- **WhatsApp Integration**: Primary automation mechanism for qualification and broadcast messaging.

## Technical Scope & Requirements
1. **R1. Lead Processing API**:
   - Next.js API route receiving lead data: `name`, `phone`, `service_interest` (and any related metadata).
   - Agent logic within this route evaluates `service_interest`, categorizes the lead appropriately (e.g. `safar_go`, `safar_home`, or specific subcategory), and inserts/updates the record in the Supabase `leads` table.
2. **R2. WhatsApp Automation Trigger**:
   - Automated WhatsApp follow-up via existing WhatsApp config/flows in CRM database.
   - Queues or logs a welcome/FAQ message tailored to the lead's service interest in the database (e.g. in `messages` or `automation_logs` / `broadcasts`).
3. **R3. Business Knowledge Integration**:
   - SAFAR N MANZIL context used to generate intelligent, trustworthy, simple responses to general FAQs about Gulf travel, packing, and home assistance.
4. **Acceptance Criteria**:
   - `test_agent.js` programmatic test script verifying:
     - API endpoint responds with 200 OK and categorized lead data.
     - Database insertion/status update in `leads` table.
     - WhatsApp message payload queuing/logging in database.
