-- Migration: 043_safar_feedback_schema
-- Creates the customer_feedback table linked to service_requests

CREATE TABLE IF NOT EXISTS public.customer_feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    service_request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    timeliness_rating integer CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
    comments text,
    would_recommend boolean DEFAULT true,
    photo_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure a service request only gets one feedback entry
    CONSTRAINT unique_feedback_per_request UNIQUE (service_request_id)
);

-- Enable RLS
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (so customers can submit feedback without logging in)
-- They only need the request_id to submit.
CREATE POLICY "Allow anonymous inserts for customer feedback" ON public.customer_feedback
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow admins to read all feedback
CREATE POLICY "Allow authenticated users to read customer feedback" ON public.customer_feedback
    FOR SELECT
    TO authenticated
    USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_feedback_service_request_id ON public.customer_feedback(service_request_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON public.customer_feedback(rating);
