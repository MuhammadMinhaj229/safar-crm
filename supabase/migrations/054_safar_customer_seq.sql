-- ============================================================
-- 054_safar_customer_seq.sql
-- Create a database sequence for CUS_SNM-000000 customer IDs
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS safar_customer_id_seq START 1;

CREATE OR REPLACE FUNCTION set_safar_customer_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.safar_customer_id IS NULL THEN
    NEW.safar_customer_id := 'CUS_SNM-' || LPAD(nextval('safar_customer_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_safar_customer_id ON contacts;
CREATE TRIGGER trigger_set_safar_customer_id
BEFORE INSERT ON contacts
FOR EACH ROW
EXECUTE FUNCTION set_safar_customer_id();

-- Backfill any existing contacts that don't have an ID
UPDATE contacts 
SET safar_customer_id = 'CUS_SNM-' || LPAD(nextval('safar_customer_id_seq')::text, 6, '0')
WHERE safar_customer_id IS NULL;
