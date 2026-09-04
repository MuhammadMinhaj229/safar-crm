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

async function testSingle() {
  console.log('Sending single request to http://localhost:3000/api/public/lead...');
  const res = await fetch('http://localhost:3000/api/public/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '__AUDIT_DEBUG__ Test User',
      phone: '+919876543299',
      service_interest: 'Safar Go flight travel',
    }),
  });
  console.log('Response status:', res.status);
  const data = await res.json();
  console.log('Response data:', data);

  const leadId = data.lead?.id;
  const msgId = data.message_id;
  console.log('Created leadId:', leadId, 'message_id:', msgId);

  // Direct query by ID
  const { data: logById, error: errById } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('id', msgId)
    .maybeSingle();
  console.log('Log fetched by msgId:', logById, 'err:', errById);

  // Query as done in test_agent.js
  const { data: autoLogs, error: autoErr } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('trigger_event', 'lead_captured')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('autoLogs count:', autoLogs?.length, 'error:', autoErr);
  console.log('autoLogs IDs:', autoLogs?.map(l => l.id));
  if (autoLogs && autoLogs.length > 0) {
    console.log('First log steps_executed:', JSON.stringify(autoLogs[0].steps_executed));
    const matched = autoLogs.find(l => JSON.stringify(l.steps_executed || []).includes(leadId));
    console.log('Matched by leadId?:', Boolean(matched));
  }

  // Cleanup
  await supabase.from('automation_logs').delete().eq('id', msgId);
  await supabase.from('leads').delete().eq('id', leadId);
  console.log('Cleaned up debug lead and log.');
}

testSingle().catch(console.error);
