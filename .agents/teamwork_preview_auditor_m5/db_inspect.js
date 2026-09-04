const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[trimmed.slice(0, idx).trim()] = val;
  }
}

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('--- DB INSPECTION START ---');
  const { data: leads, count: leadCount, error: leadErr } = await sb.from('leads').select('id, name, phone, status, notes', { count: 'exact' });
  if (leadErr) console.error('Leads query error:', leadErr);
  else console.log(`Total leads in DB: ${leadCount}`, leads);

  const { data: logs, count: logCount, error: logErr } = await sb.from('automation_logs').select('id, trigger_event, status, steps_executed', { count: 'exact' }).order('created_at', { ascending: false }).limit(5);
  if (logErr) console.error('Logs query error:', logErr);
  else console.log(`Total automation_logs in DB: ${logCount}`, logs);

  const { data: testLeads } = await sb.from('leads').select('id, name').ilike('name', '%__TEST_AGENT__%');
  console.log('Any lingering __TEST_AGENT__ leads before run:', testLeads);
  console.log('--- DB INSPECTION END ---');
}

main().catch(console.error);
