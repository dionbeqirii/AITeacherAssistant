import { gradeSubmission } from '../services/ai.service.js';
import { saveAiGrade } from '../services/db.service.js';

export const gradingRoutes = async (fastify) => {
  fastify.post('/grade', async (request, reply) => {
    try {
      const { studentAnswer, questionText, rubric, subject } = request.body;
      
      console.log("📥 Duke procesuar vlerësimin për:", subject);

      // 1. Provo AI
      const aiResult = await gradeSubmission(studentAnswer, questionText, rubric);
      console.log("🤖 AI u përgjigj me sukses");

      // 2. Provo Databazën (Nëse dështon kjo, AI do të shfaqet gjithsesi)
      try {
        await saveAiGrade({
          subject: subject || "Pa lëndë",
          score: aiResult.score,
          feedback: aiResult.feedback,
          strengths: aiResult.strengths,
          weaknesses: aiResult.weaknesses
        });
        console.log("💾 U ruajt në Supabase");
      } catch (dbError) {
        console.error("⚠️ Gabim në DB por po dërgojmë rezultatin e AI:", dbError.message);
      }

      return reply.send({ success: true, data: aiResult });
    } catch (error) {
      console.error("❌ Gabim Kritik:", error.message);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
};