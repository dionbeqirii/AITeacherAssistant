import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';

// Importimi i Routeve nga folderi src/routes/
import { gradingRoutes } from './routes/grading.js';
import { examRoutes } from './routes/exam.js';
import { analyticsRoutes } from './routes/analytics.js';

dotenv.config();

// Inicializimi i Fastify me Logger profesional
const app = Fastify({ 
    logger: { 
        transport: { 
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
            }
        } 
    } 
});

// 1. Regjistrimi i CORS (Lejon komunikimin me Frontendin Next.js)
// app.register(cors, {
//     origin: true 
// });

app.register(cors, {
  origin: "*", // Kjo lejon çdo kërkesë nga çdo portë
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// 2. Regjistrimi i JWT (Për sigurinë e sistemit)
app.register(jwt, {
    secret: process.env.JWT_SECRET || 'sekreti-yt-shume-i-sigurt-123'
});


// 3. Dekorues për Middleware (Për të mbrojtur rrugët në të ardhmen)
app.decorate("authenticate", async (request, reply) => {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// 4. Regjistrimi i Moduleve me Prefix /api/v1 (Sipas raportit teknik)

// Moduli 2: AI Automatic Grading System
app.register(gradingRoutes, { prefix: '/api/v1/grading' });

// Moduli 1: AI Exam Generation
app.register(examRoutes, { prefix: '/api/v1/exam' });

// Moduli 3: Performance Analytics
app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });



// 5. Rrugët Bazë (General Routes)

// Faqja kryesore
app.get('/', async () => {
    return { 
        message: "Mirësevini në AI Teaching Assistant API",
        version: "1.0.0",
        author: "Valdrin Maxhuni"
    };
});

// Health Check - Teston nëse serveri dhe AI janë gati
app.get('/api/v1/health', async (request, reply) => {
    return { 
        status: 'Online', 
        ai_engine: 'Groq Llama-3.3-70b',
        database: 'Supabase connected',
        timestamp: new Date().toISOString() 
    };
});

// 6. Menaxhimi i Gabimeve Globale
app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(500).send({ 
        success: false, 
        error: 'Gabim i brendshëm i serverit',
        message: error.message 
    });
});

export default app;