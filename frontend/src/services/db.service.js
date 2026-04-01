import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(
    supabaseUrl || '', 
    supabaseKey || ''
);

export const saveAiGrade = async (gradeData) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .insert([
        {
          subject: gradeData.subject,
          score: gradeData.score,
          feedback: gradeData.feedback,
          strengths: gradeData.strengths,
          weaknesses: gradeData.weaknesses
        }
      ]);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Database Error:", err.message);
    throw err;
  }
};