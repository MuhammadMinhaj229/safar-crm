-- ============================================================
-- 050_safar_decoupled_crm.sql
-- Decoupled CRM Architecture modifications
-- ============================================================

-- Add safar_customer_id to contacts for a unique readable ID
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS safar_customer_id TEXT UNIQUE;

-- Add request_id and notepad_content to service_requests
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS request_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS notepad_content JSONB;

-- Create an invoices table that will be shared with the decoupled Invoify app
CREATE TABLE IF NOT EXISTS invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_id    TEXT REFERENCES service_requests(request_id) ON DELETE SET NULL,
  contact_id    uuid REFERENCES contacts(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'CANCELLED')),
  pdf_url       TEXT,
  total_amount  NUMERIC(12,2),
  currency      TEXT DEFAULT 'INR',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account members can manage invoices" ON invoices FOR ALL 
USING (
  account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  )
);
