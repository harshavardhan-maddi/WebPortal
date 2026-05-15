
import { supabase } from "./src/lib/supabase";

async function checkSchema() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log("Student columns:", Object.keys(data[0] || {}));
  }

  const { data: qData, error: qError } = await supabase.from('quizzes').select('*').limit(1);
    if (qError) {
        console.error(qError);
    } else {
        console.log("Quiz columns:", Object.keys(qData[0] || {}));
    }
}

checkSchema();
