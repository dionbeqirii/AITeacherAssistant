import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export const saveAiGrade = async (gradeData) => {
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
};