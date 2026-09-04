-- ============================================================
-- 048_safar_feedback_update_policy.sql
-- Allow authenticated users (CRM users) to update feedback
-- ============================================================

CREATE POLICY "Allow authenticated users to update customer feedback" ON public.customer_feedback
    FOR UPDATE
    TO authenticated
    USING (true);
