import { gradeSubmission } from '../services/ai.service.js';
import { saveAiGrade } from '../services/db.service.js';

export const gradingRoutes = async (fastify) => {
  fastify.post('/grade', async (request, reply) => {
    try {
      const { studentAnswer, questionText, rubric, subject } = request.body;

      // 1. Thirrja e Groq AI
      const aiResult = await gradeSubmission(studentAnswer, questionText, rubric);

      // 2. Ruajtja në Supabase
      await saveAiGrade({
        subject: subject || "Lëndë e Pacaktuar",
        score: aiResult.score,
        feedback: aiResult.feedback,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses
      });

      return reply.send({
        success: true,
        message: "Vlerësimi u krye dhe u ruajt në databazë",
        data: aiResult
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Gabim gjatë procesit." });
    }
  });
};