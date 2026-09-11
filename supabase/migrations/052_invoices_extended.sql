-- ============================================================
-- 052_invoices_extended.sql
-- Extend invoices table with fields needed for CRM ↔ Invoify sync
-- ============================================================

-- Add service tracking and customer denormalisation columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS service_code    TEXT,        -- e.g. SNM-GD01
  ADD COLUMN IF NOT EXISTS invoice_date    DATE,        -- date of service
  ADD COLUMN IF NOT EXISTS line_items      JSONB,       -- [{name, quantity, unitPrice, total}]
  ADD COLUMN IF NOT EXISTS customer_name   TEXT,        -- denormalised for fast display
  ADD COLUMN IF NOT EXISTS customer_phone  TEXT;        -- for matching when contact_id is null

-- Index for fast lookups by contact (customer directory query)
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON public.invoices(contact_id);

-- Index for fast lookups by account + date (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_invoices_account_date ON public.invoices(account_id, invoice_date DESC);
