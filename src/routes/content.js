import { generateTeachingContent } from '../services/content.service.js';

export const contentRoutes = async (fastify) => {
  fastify.post('/generate', async (request, reply) => {
    try {
      const { topic, contentType, difficulty } = request.body;

      if (!topic || !contentType) {
        return reply.status(400).send({ error: "Mungon tema ose lloji i materialit." });
      }

      const material = await generateTeachingContent(topic, contentType, difficulty || 'mesatare');
      
      return reply.send({
        success: true,
        data: material
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Dështoi gjenerimi i materialit mësimor." });
    }
  });
};