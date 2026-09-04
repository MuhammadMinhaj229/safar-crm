-- ============================================================
-- 047_safar_feedback_public_read.sql
-- Allow anonymous users to read approved customer feedback
-- ============================================================

-- Create a policy to allow anon users to SELECT from customer_feedback
-- ONLY if the status is 'approved'
CREATE POLICY "Allow anon to read approved feedback" ON public.customer_feedback
    FOR SELECT
    TO anon
    USING (status = 'approved');
