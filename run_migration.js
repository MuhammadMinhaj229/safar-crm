require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const connectionString = 'postgres://postgres:safar123@db.uzpnvylarbfttzhjqduj.supabase.co:6543/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to DB!');
    
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '053_safar_service_providers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('Migration 053 applied successfully!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
migrate();
