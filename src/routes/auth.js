import { supabase } from '../services/db.service.js';

export const authRoutes = async (fastify) => {
  // 1. Regjistrimi
  fastify.post('/register', async (request, reply) => {
    const { email, password, fullName } = request.body;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) return reply.status(400).send({ error: error.message });
    return reply.send({ message: "Llogaria u krijua! Kontrollo email-in për konfirmim.", data });
  });

  // 2. Login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return reply.status(401).send({ error: "Email ose fjalëkalim i gabuar." });

    // Gjenerojmë një JWT Token të brendshëm për aplikacionin tonë
    const token = fastify.jwt.sign({ id: data.user.id, email: data.user.email });
    
    return reply.send({ 
      message: "Mirësevini!", 
      token, 
      user: data.user 
    });
  });
};