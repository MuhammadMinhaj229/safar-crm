# Original User Request

## 2026-09-03T18:38:05Z

Build a world-class AI agent backend worker for SAFAR N MANZIL that processes form submissions, categorizes leads in the CRM, and triggers automated WhatsApp broadcasts. The agent must understand the business deeply and operate as a Next.js API route within the existing CRM.

Working directory: C:\Users\User\.gemini\antigravity\scratch\wacrm-inspection
Integrity mode: development

## Requirements

### R1. Lead Processing API
Create a Next.js API route that receives lead data (name, phone, service interest). The agent logic within this route must evaluate the `service_interest`, categorize the lead appropriately, and insert/update the record in the Supabase `leads` table.

### R2. WhatsApp Automation Trigger
Upon processing a new lead, the backend worker must trigger an automated WhatsApp follow-up. It should interface with the existing WhatsApp config and flows in the CRM database to queue or send a welcome/FAQ message tailored to their service interest.

### R3. Business Knowledge Integration
The agent logic must use the SAFAR N MANZIL business context to generate intelligent, trustworthy, and simple responses to general FAQs about Gulf travel, packing, and home assistance.

## Acceptance Criteria

### API Endpoint Functionality
- [ ] A programmatic test script (`test_agent.js`) successfully sends a mock payload to the API route.
- [ ] The API responds with a 200 OK and returns the categorized lead data.

### Database Integration
- [ ] The test script verifies that the mock lead is correctly inserted into the `leads` table with the appropriate `status` and parsed details.

### WhatsApp Trigger Verification
- [ ] The API correctly logs or queues a WhatsApp message payload in the database (e.g., in `messages` or `automation_logs`) corresponding to the triggered follow-up.
