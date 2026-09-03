-- Migration 044: SAFAR N MANZIL Leads Table
-- Purpose: Track potential customers captured from the website form,
-- WhatsApp, or manual entry. Leads are separate from contacts (real customers).

CREATE TABLE IF NOT EXISTS public.leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name          text NOT NULL,
  phone         text,
  email         text,
  service_interest text,
  notes         text,
  source        text NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('website', 'whatsapp', 'manual')),
  status        text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by account
CREATE INDEX IF NOT EXISTS leads_account_id_idx ON public.leads(account_id);
-- Index for filtering by status
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.touch_leads_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_touch_updated_at ON public.leads;
CREATE TRIGGER leads_touch_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_leads_updated_at();

-- Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Account members can read leads in their account
CREATE POLICY "leads_select" ON public.leads
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE profile_id = auth.uid()
    )
  );

-- Account members (agents+) can insert leads
CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE profile_id = auth.uid()
    )
  );

-- Account members can update leads in their account
CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE profile_id = auth.uid()
    )
  );

-- Account members (admin+) can delete leads
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Service-role bypass for public website submissions (no auth)
-- The API route uses the service_role key to insert with account_id from env
CREATE POLICY "leads_service_role_insert" ON public.leads
  FOR INSERT WITH CHECK (true);
