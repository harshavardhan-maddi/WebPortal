import { supabase } from "./src/lib/supabase";

async function checkSchema() {
  const { data, error } = await supabase.from('results').select('*').limit(1);
  if (error) {
    console.error("Error fetching results schema:", error);
  } else {
    console.log("Results columns:", Object.keys(data[0] || {}));
  }
}

checkSchema();
