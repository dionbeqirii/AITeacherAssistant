import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const generateTeachingContent = async (topic, contentType, difficulty) => {
  const prompt = `
    Roli: Profesor Universitar Ekspert.
    Detyra: Gjenero përmbajtje mësimore për temën: ${topic}.
    Lloji i materialit: ${contentType} (p.sh. Leksion, Ushtrime, Slide Outline).
    Niveli: ${difficulty}.

    Kërkesat:
    1. Shpjegim i qartë dhe akademik në gjuhën shqipe.
    2. Shembuj praktikë.
    3. Nëse janë ushtrime, përfshi edhe zgjidhjet.

    Kthe përgjigjen në format JSON:
    {
      "title": "Titulli i materialit",
      "content": "Teksti i plotë i gjeneruar...",
      "metadata": { "topic": "${topic}", "type": "${contentType}" }
    }
  `;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7, // Pak më kreativ për materiale mësimore
  });

  return JSON.parse(response.choices[0].message.content);
};