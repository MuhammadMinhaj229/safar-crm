require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function test() {
  const connectionString = 'postgres://postgres:safar123@db.uzpnvylarbfttzhjqduj.supabase.co:6543/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected!');
    await client.query("SELECT 1");
    console.log('Query success!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
test();
