-- ============================================================
-- 20260911_scalable_architecture_v2.sql
-- Master migration for Contacts, Invoices, Service Requests, and Payments
-- ============================================================

-- 1. Ensure safar_customer_id is strictly unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_safar_customer_id_key') THEN
        ALTER TABLE public.contacts ADD CONSTRAINT contacts_safar_customer_id_key UNIQUE (safar_customer_id);
    END IF;
END $$;

-- 2. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    account_id UUID,
    user_id UUID,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    total_amount NUMERIC,
    currency VARCHAR(10),
    service_code VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PAID',
    line_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

CREATE POLICY "Users can view their own invoices" ON public.invoices
    FOR SELECT USING (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can insert their own invoices" ON public.invoices
    FOR INSERT WITH CHECK (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can update their own invoices" ON public.invoices
    FOR UPDATE USING (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can delete their own invoices" ON public.invoices
    FOR DELETE USING (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

-- 3. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    account_id UUID,
    user_id UUID,
    payment_method VARCHAR(100),
    transaction_id VARCHAR(255),
    amount NUMERIC,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;

CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can update their own payments" ON public.payments
    FOR UPDATE USING (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can delete their own payments" ON public.payments
    FOR DELETE USING (
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );
