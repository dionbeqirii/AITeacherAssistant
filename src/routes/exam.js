import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const examRoutes = async (fastify) => {
  fastify.post('/generate', async (request, reply) => {
    const { subject, topic, difficulty, numQuestions } = request.body;

    try {
      const prompt = `Gjenero një provim për lëndën ${subject}, tema ${topic}. 
      Vështirësia: ${difficulty}. Numri i pyetjeve: ${numQuestions}.
      Kthe përgjigjen VETËM si JSON array me objekte që kanë: question, options (nëse është MC), correctAnswer, dhe rubric.`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return reply.send({ success: true, exam: JSON.parse(completion.choices[0].message.content) });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
};