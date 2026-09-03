-- ============================================================
-- 040_safar_service_engine.sql
-- SAFAR OS Custom Service Engine Migration
-- ============================================================

-- 1. DROP CRM BLOAT
-- We are removing pipelines and deals as SAFAR is a service-operations OS.
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS pipeline_stages CASCADE;
DROP TABLE IF EXISTS pipelines CASCADE;

-- ============================================================
-- SERVICE_DEFINITIONS
-- Catalog of services offered by SAFAR N MANZIL
-- ============================================================
CREATE TABLE IF NOT EXISTS service_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own service definitions" ON service_definitions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PROVIDERS
-- Trusted network executing the services
-- ============================================================
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  provider_type TEXT,
  rating NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own providers" ON providers FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PROVIDER_SERVICES
-- Mapping providers to services
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES service_definitions(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, service_id)
);

ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own provider services" ON provider_services FOR ALL 
USING (EXISTS (SELECT 1 FROM providers WHERE providers.id = provider_services.provider_id AND providers.user_id = auth.uid()));

-- ============================================================
-- SERVICE_REQUESTS
-- The core operational unit for a customer problem
-- ============================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  service_id UUID REFERENCES service_definitions(id) ON DELETE SET NULL,
  assigned_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'triage' CHECK (status IN ('triage', 'quoting', 'approved', 'in_progress', 'completed', 'cancelled')),
  quoted_price NUMERIC(12,2),
  final_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own service requests" ON service_requests FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- QUOTES_AND_APPROVALS
-- Tracking financial offers made to the customer
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes_and_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  offered_price NUMERIC(12,2) NOT NULL,
  customer_approved BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes_and_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage quotes" ON quotes_and_approvals FOR ALL 
USING (EXISTS (SELECT 1 FROM service_requests WHERE service_requests.id = quotes_and_approvals.service_request_id AND service_requests.user_id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON service_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON quotes_and_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DECISION_TREE_NODES
-- Defines the questions/prompts in the decision tree
-- ============================================================
CREATE TABLE IF NOT EXISTS decision_tree_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES service_definitions(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'question' CHECK (node_type IN ('question', 'classification', 'human_handoff')),
  question_text TEXT NOT NULL,
  is_starting_node BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE decision_tree_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role can read decision nodes" ON decision_tree_nodes FOR SELECT USING (true);
CREATE POLICY "Users can manage decision nodes" ON decision_tree_nodes FOR ALL USING (EXISTS (SELECT 1 FROM service_definitions WHERE service_definitions.id = decision_tree_nodes.service_id AND service_definitions.user_id = auth.uid()));

-- ============================================================
-- DECISION_TREE_BRANCHES
-- Defines the paths between nodes based on user answers
-- ============================================================
CREATE TABLE IF NOT EXISTS decision_tree_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node_id UUID NOT NULL REFERENCES decision_tree_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES decision_tree_nodes(id) ON DELETE SET NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE decision_tree_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role can read decision branches" ON decision_tree_branches FOR SELECT USING (true);
CREATE POLICY "Users can manage decision branches" ON decision_tree_branches FOR ALL USING (EXISTS (SELECT 1 FROM decision_tree_nodes n JOIN service_definitions s ON n.service_id = s.id WHERE n.id = decision_tree_branches.from_node_id AND s.user_id = auth.uid()));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON decision_tree_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
