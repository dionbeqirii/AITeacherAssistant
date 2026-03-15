import { supabase } from './db.service.js'; // Sigurohu që supabase është export-uar nga db.service
import { OpenAI } from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const generateClassAnalytics = async (subject) => {
  // 1. Marrim të gjitha notat për këtë lëndë nga Supabase
  const { data: grades, error } = await supabase
    .from('grades')
    .select('*')
    .eq('subject', subject);

  if (error) throw error;
  if (grades.length === 0) return { message: "Nuk ka të dhëna për këtë lëndë." };

  // 2. Kalkulime bazë matematike
  const averageScore = grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length;
  
  // 3. AI Insight: Dërgojmë feedback-et te Groq për të gjetur "Pikat e Dobëta"
  const allWeaknesses = grades.map(g => g.weaknesses).flat();
  
  const aiResponse = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages: [{
        role: "system",
        content: "Ti je një analist akademik. Analizo listën e dobësive të studentëve dhe nxirr 3 temat kryesore ku profesori duhet të fokusohet në leksionin tjetër."
    }, {
        role: "user",
        content: `Dobësitë e raportuara: ${JSON.stringify(allWeaknesses)}`
    }],
    response_format: { type: "json_object" }
  });

  return {
    subject,
    totalStudents: grades.length,
    classAverage: averageScore.toFixed(2),
    aiInsights: JSON.parse(aiResponse.choices[0].message.content)
  };
};