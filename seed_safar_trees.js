require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Fetching account ID...');
  const { data: accounts, error: errAcc } = await supabase.from('accounts').select('id, owner_user_id').limit(1);
  if (errAcc || !accounts.length) {
    console.error('No accounts found', errAcc);
    return;
  }
  const accountId = accounts[0].id;
  const userId = accounts[0].owner_user_id;

  console.log(`Using Account ID: ${accountId}`);

  // 1. Create Automations
  console.log('Seeding Automations...');
  // Lead Captured
  let { data: autoLead } = await supabase.from('automations').select().eq('account_id', accountId).eq('trigger_type', 'lead_captured').maybeSingle();
  if (!autoLead) {
    const { data: newLead, error: errLead } = await supabase.from('automations').insert({
      account_id: accountId,
      user_id: userId,
      name: "SAFAR Lead Intake Response",
      trigger_type: "lead_captured",
      is_active: true
    }).select().single();
    if (errLead) console.error('Error creating lead automation', errLead);
    autoLead = newLead;
  }

  await supabase.from('automation_steps').delete().eq('automation_id', autoLead.id);
  await supabase.from('automation_steps').insert({
    automation_id: autoLead.id,
    position: 0,
    step_type: 'send_message',
    step_config: { text: "{{ vars.faq_preview }}\n\nWhat can we help you with today? Reply to this message to continue." }
  });

  // Message Received (SAFAR TRIAGE)
  let { data: autoMsg } = await supabase.from('automations').select().eq('account_id', accountId).eq('trigger_type', 'message_received').maybeSingle();
  if (!autoMsg) {
    const { data: newMsg, error: errMsg } = await supabase.from('automations').insert({
      account_id: accountId,
      user_id: userId,
      name: "SAFAR Engine Triage",
      trigger_type: "message_received",
      is_active: true
    }).select().single();
    if (errMsg) console.error('Error creating msg automation', errMsg);
    autoMsg = newMsg;
  }

  // We need a Service Definition to tie the triage step to
  console.log('Seeding Service Definitions...');
  let { data: svc } = await supabase.from('service_definitions').select().eq('name', 'AC Repair (SAFAR HOME)').maybeSingle();
  if (!svc) {
    const { data: newSvc, error: svcErr } = await supabase.from('service_definitions').insert({
      user_id: userId,
      name: 'AC Repair (SAFAR HOME)',
      description: 'Professional AC inspection and repair',
      base_price: 200.00
    }).select().single();
    if (svcErr) { console.error('Service err', svcErr); return; }
    svc = newSvc;
  }

  // Triage step
  await supabase.from('automation_steps').delete().eq('automation_id', autoMsg.id);
  await supabase.from('automation_steps').insert({
    automation_id: autoMsg.id,
    position: 0,
    step_type: 'safar_service_triage',
    step_config: { service_definition_id: svc.id }
  });

  // 2. Seed Decision Trees for AC Repair
  console.log('Seeding Decision Tree for AC Repair...');
  
  // Clear old nodes
  await supabase.from('decision_tree_nodes').delete().eq('service_id', svc.id);

  // Q1: Is AC turning on?
  const { data: q1 } = await supabase.from('decision_tree_nodes').insert({
    service_id: svc.id,
    node_type: 'question',
    question_text: 'Is your AC turning on?',
    is_starting_node: true
  }).select().single();

  // Q2 (If Yes): Is it cooling normally?
  const { data: q2 } = await supabase.from('decision_tree_nodes').insert({
    service_id: svc.id,
    node_type: 'question',
    question_text: 'Is it cooling normally?'
  }).select().single();

  // Q3 (If No): Is there a display or power indication?
  const { data: q3 } = await supabase.from('decision_tree_nodes').insert({
    service_id: svc.id,
    node_type: 'question',
    question_text: 'Is there any display or power indication on the AC unit?'
  }).select().single();

  // Human Handoff / Quote node
  const { data: qEnd } = await supabase.from('decision_tree_nodes').insert({
    service_id: svc.id,
    node_type: 'human_handoff',
    question_text: 'Thank you for the details! Our technician will visit for an inspection. The standard inspection charge is ₹200. Please wait while an agent confirms your appointment.'
  }).select().single();

  // Branches
  console.log('Seeding Branches...');
  await supabase.from('decision_tree_branches').insert([
    { from_node_id: q1.id, to_node_id: q2.id, answer_text: 'Yes, it turns on' },
    { from_node_id: q1.id, to_node_id: q3.id, answer_text: 'No, completely dead' },
    { from_node_id: q2.id, to_node_id: qEnd.id, answer_text: 'Yes, it cools' },
    { from_node_id: q2.id, to_node_id: qEnd.id, answer_text: 'No, not cooling' },
    { from_node_id: q3.id, to_node_id: qEnd.id, answer_text: 'Yes, display is on' },
    { from_node_id: q3.id, to_node_id: qEnd.id, answer_text: 'No display' },
  ]);

  console.log('✅ Seeding Complete! The Agentic Task Completer is LIVE.');
}

main().catch(console.error);
