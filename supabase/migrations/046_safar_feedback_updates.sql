-- ============================================================
-- 046_safar_feedback_updates.sql
-- Update customer_feedback for public website form
-- ============================================================

ALTER TABLE public.customer_feedback
  ALTER COLUMN service_request_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing records if any
UPDATE public.customer_feedback 
SET status = 'pending' 
WHERE status IS NULL;

-- Make account_id required for new records? No, keep it optional for backwards compatibility 
-- with older rows that might exist without account_id, though we can backfill if we want.

-- Fix the unique constraint to allow multiple feedback entries without a service_request_id
-- We need to drop the unique constraint unique_feedback_per_request if it prevents 
-- inserting multiple rows where service_request_id is NULL.
-- Actually, in Postgres, multiple NULLs in a UNIQUE constraint are allowed, but to be safe:
ALTER TABLE public.customer_feedback DROP CONSTRAINT IF EXISTS unique_feedback_per_request;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_feedback_unique_req ON public.customer_feedback (service_request_id) WHERE service_request_id IS NOT NULL;
