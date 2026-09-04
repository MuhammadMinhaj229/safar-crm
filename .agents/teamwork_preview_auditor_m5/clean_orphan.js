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

async function cleanOrphans() {
  const { data: logs } = await supabase.from('automation_logs').select('id, steps_executed');
  if (logs) {
    for (const log of logs) {
      if (JSON.stringify(log.steps_executed).includes('bde66648-d7e8-4940-87d9-68026d13b006')) {
        await supabase.from('automation_logs').delete().eq('id', log.id);
        console.log('Cleaned orphan log:', log.id);
      }
    }
  }
}

cleanOrphans().catch(console.error);
