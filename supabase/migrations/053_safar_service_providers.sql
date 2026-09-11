CREATE TABLE safar_service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE safar_service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES safar_service_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Categories
ALTER TABLE safar_service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their account categories" ON safar_service_categories
  FOR SELECT USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert categories" ON safar_service_categories
  FOR INSERT WITH CHECK (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their account categories" ON safar_service_categories
  FOR UPDATE USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their account categories" ON safar_service_categories
  FOR DELETE USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- RLS for Providers
ALTER TABLE safar_service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their account providers" ON safar_service_providers
  FOR SELECT USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert providers" ON safar_service_providers
  FOR INSERT WITH CHECK (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their account providers" ON safar_service_providers
  FOR UPDATE USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their account providers" ON safar_service_providers
  FOR DELETE USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));
