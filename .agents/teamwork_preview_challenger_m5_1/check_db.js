const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const ENV_PATH = path.join(PROJECT_ROOT, ".env.local");

const env = fs.readFileSync(ENV_PATH, "utf8");
const getVal = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].replace(/["']/g, "").trim() : "";
};

const supabase = createClient(
  getVal("NEXT_PUBLIC_SUPABASE_URL"),
  getVal("SUPABASE_SERVICE_ROLE_KEY")
);

async function main() {
  const { data: leads } = await supabase.from("leads").select("id, name, created_at");
  const { data: logs } = await supabase
    .from("automation_logs")
    .select("id, created_at, steps_executed")
    .order("created_at", { ascending: false })
    .limit(20);

  console.log("Current Leads count in Supabase:", leads ? leads.length : 0);
  if (leads && leads.length > 0) {
    console.log("Leads:", leads);
  }

  console.log("Recent Automation Logs count:", logs ? logs.length : 0);
  if (logs && logs.length > 0) {
    console.log("Most recent 3 log timestamps:", logs.slice(0, 3).map(l => l.created_at));
  }
}

main();
