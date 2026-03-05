import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Konfigurimi specifik për Groq
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1", 
});

export const gradeSubmission = async (studentAnswer, questionText, rubric) => {
  const prompt = `
    Roli: Profesor Universitar Ekspert.
    Detyra: Vlerëso përgjigjen e studentit bazuar në rubrikën e dhënë. [cite: 57, 59]
    
    Pyetja: ${questionText}
    Përgjigja e Studentit: ${studentAnswer}
    Rubrika e Vlerësimit: ${rubric}

    Kthe përgjigjen VETËM në format JSON me këtë strukturë:
    {
      "score": (numër 0-100),
      "feedback": "shpjegim i detajuar në shqip",
      "strengths": ["pika e fortë 1", "pika e fortë 2"],
      "weaknesses": ["ku duhet të përmirësohet"]
    }
  `;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // Model i shpejtë dhe i saktë në Groq
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content);
};