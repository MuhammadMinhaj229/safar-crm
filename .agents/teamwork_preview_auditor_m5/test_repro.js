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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data: logs, count, error } = await supabase
    .from('automation_logs')
    .select('id, trigger_event, status, created_at, steps_executed', { count: 'exact' });
  console.log('Total automation_logs count:', count, 'error:', error);
  if (logs) {
    for (const log of logs) {
      console.log(`Log ${log.id} [${log.created_at}]:`, JSON.stringify(log.steps_executed));
    }
  }

  const { data: leads, count: leadCount } = await supabase
    .from('leads')
    .select('id, name, created_at', { count: 'exact' });
  console.log('Total leads count:', leadCount);
  if (leads) {
    for (const lead of leads) {
      console.log(`Lead ${lead.id} [${lead.created_at}]: ${lead.name}`);
    }
  }
}

main().catch(console.error);
