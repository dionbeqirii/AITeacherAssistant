export const analyticsRoutes = async (fastify) => {
  fastify.get('/report', async (request, reply) => {
    return { 
      success: true, 
      message: "Moduli i analitikës është gati. Shto nota në databazë për të parë statistikat." 
    };
  });
};