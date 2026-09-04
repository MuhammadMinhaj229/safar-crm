-- ============================================================
-- 045_safar_branch_updates.sql
-- Add branch_type and condition_value to decision_tree_branches
-- ============================================================

ALTER TABLE decision_tree_branches
ADD COLUMN IF NOT EXISTS branch_type TEXT DEFAULT 'button',
ADD COLUMN IF NOT EXISTS condition_value TEXT;

-- update existing rows
UPDATE decision_tree_branches SET condition_value = answer_text WHERE condition_value IS NULL;
