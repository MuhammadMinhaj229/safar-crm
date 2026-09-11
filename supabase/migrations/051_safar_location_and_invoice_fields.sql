-- ============================================================
-- 051_safar_location_and_invoice_fields.sql
-- Add location tracking and structured invoice JSON 
-- ============================================================

-- 1. Add Location to Contacts
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'Unknown';

-- 2. Add Location to Leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'Unknown';

-- 3. Add Invoice Data to Service Requests
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS invoice_details JSONB;
