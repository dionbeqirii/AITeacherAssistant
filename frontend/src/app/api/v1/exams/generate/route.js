import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { subject, topic, level, numQuestions, type, difficulty, extraInfo } = body;

    const prompt = `
      Je një profesor akademik ekspert në fushën: ${subject}.
      Detyra: Gjenero një provim profesional për temën: ${topic}.

      SPECIFIKAT E PROVIMIT:
      - Niveli i studentëve: ${level}
      - Shkalla e vështirësisë: ${difficulty} (E RËNDËSISHME: Përshtat kompleksitetin e pyetjeve me këtë shkallë)
      - Numri i pyetjeve: ${numQuestions}
      - Tipi i pyetjeve: ${type === 'multiple-choice' ? 'Me zgjedhje të shumëfishta (A, B, C, D)' : 'Pyetje të hapura/ese'}

      UDHËZIME SHTESË NGA PROFESORI:
      "${extraInfo || 'Nuk ka udhëzime specifike.'}"

      KËRKESAT E FORMATIT:
      1. Gjuha: SHQIP.
      2. Përgjigju VETËM me një objekt JSON të vlefshëm.
      3. Struktura e JSON:
      {
        "questions": [
          {
            "id": 1,
            "question": "Teksti i pyetjes këtu?",
            "options": ["Opsioni A", "Opsioni B", "Opsioni C", "Opsioni D"],
            "answer": "Përgjigja e saktë"
          }
        ]
      }
      *Nëse tipi është "open-ended", fusha "options" duhet të jetë null.*
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Ti je një asistent që gjeneron provime akademike në formatin JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const content = JSON.parse(chatCompletion.choices[0].message.content);

    return NextResponse.json({
      success: true,
      data: content.questions
    });

  } catch (error) {
    console.error("Groq API Error:", error);
    return NextResponse.json(
      { success: false, error: "Gabim gjatë komunikimit me AI." },
      { status: 500 }
    );
  }
}