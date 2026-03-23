import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 1. Ngarko variablat nga .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // FIX: Duhet të jetë ANON_KEY si në .env

// 2. Kontrolli i sigurisë (Nëse mungojnë variablat, mos bëj crash menjëherë)
if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Gabim: SUPABASE_URL ose SUPABASE_ANON_KEY mungojnë në .env!");
}

// 3. Inicializimi i klientit
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder'
);

// 4. Funksioni për ruajtjen e notës
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