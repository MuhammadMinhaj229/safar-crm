-- ============================================================
-- 041_safar_state_machine.sql
-- SAFAR OS Engine State Tracking
-- ============================================================

-- 1. Extend service_requests to track decision tree state
ALTER TABLE service_requests 
ADD COLUMN current_node_id UUID REFERENCES decision_tree_nodes(id) ON DELETE SET NULL,
ADD COLUMN collected_data JSONB DEFAULT '{}'::jsonb;

-- 2. Add an index for fast lookups when processing webhooks
CREATE INDEX idx_service_requests_triage ON service_requests(contact_id) WHERE status = 'triage';

-- Comment on columns
COMMENT ON COLUMN service_requests.current_node_id IS 'The node the customer is currently looking at in the decision tree.';
COMMENT ON COLUMN service_requests.collected_data IS 'JSON storage for answers collected from decision_tree_branches (e.g., location, date).';
