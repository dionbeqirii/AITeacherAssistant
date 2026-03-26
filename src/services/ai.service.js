import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const gradeSubmission = async (studentAnswer, questionText, rubric) => {
  try {
    const prompt = `
      Rolet: Profesor akademik. 
      Detyra: Vlerëso përgjigjen e studentit bazuar në pyetjen dhe rubrikën.
      Pyetja: ${questionText}
      Përgjigja: ${studentAnswer}
      Rubrika: ${rubric || "Vlerëso korrektësinë faktike"}

      KTHE VETËM NJË OBJEKT JSON TË PASTËR (pa tekst tjetër):
      {
        "score": (numër 0-100),
        "feedback": "koment i shkurtër",
        "strengths": ["pika 1", "pika 2"],
        "weaknesses": ["pika 1"]
      }
    `;

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("Dështoi vlerësimi nga AI.");
  }
};