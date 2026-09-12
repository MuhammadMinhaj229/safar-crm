-- 1. Ensure safar_customer_id is strictly unique in the contacts table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_safar_customer_id_key') THEN
        ALTER TABLE public.contacts ADD CONSTRAINT contacts_safar_customer_id_key UNIQUE (safar_customer_id);
    END IF;
END $$;

-- 2. Build the Scalable History Table (invoices)
-- If the table exists from a previous basic setup, this upgrades it safely.
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    account_id UUID,
    request_id TEXT,
    invoice_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PAID',
    pdf_url TEXT,
    total_amount NUMERIC(12,2),
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely extend it with the new fields needed for our advanced logic
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS service_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS line_items JSONB;

-- Set up strict security rules so only your CRM can read/write this history
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Account members can manage invoices" ON public.invoices;

CREATE POLICY "Users can view their own invoices" ON public.invoices
    FOR SELECT USING (account_id IN (SELECT account_id FROM public.profiles WHERE user_id = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can insert their own invoices" ON public.invoices
    FOR INSERT WITH CHECK (account_id IN (SELECT account_id FROM public.profiles WHERE user_id = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update their own invoices" ON public.invoices
    FOR UPDATE USING (account_id IN (SELECT account_id FROM public.profiles WHERE user_id = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can delete their own invoices" ON public.invoices
    FOR DELETE USING (account_id IN (SELECT account_id FROM public.profiles WHERE user_id = auth.uid()) OR user_id = auth.uid());
