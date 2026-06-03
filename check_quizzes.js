const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function check() {
  try {
    const { data, error } = await supabase.from('quizzes').select('*').limit(1);
    if (error) {
      console.error("Supabase Error:", error);
    } else {
      console.log("SUCCESS! Quizzes row columns:", Object.keys(data[0] || {}));
      console.log("Sample quiz questions format:", JSON.stringify(data[0]?.questions?.[0], null, 2));
    }
  } catch (err) {
    console.error("Execution Exception:", err);
  }
}

check();
