import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { subject, topic, level, numQuestions, type, difficulty, extraInfo } = body;

    // Logjika për përcaktimin e tipit të pyetjeve në prompt
    let typeInstruction = '';
    if (type === 'multiple-choice') {
      typeInstruction = 'Të gjitha pyetjet duhet të jenë me zgjedhje të shumëfishta (A, B, C, D).';
    } else if (type === 'open-ended') {
      typeInstruction = 'Të gjitha pyetjet duhet të jenë të hapura/ese dhe fusha "options" duhet të jetë null.';
    } else if (type === 'mixed') {
      typeInstruction = `Provimi duhet të jetë i kombinuar: përfshij rreth 50% pyetje me zgjedhje të shumëfishta dhe 50% pyetje të hapura/ese. Për pyetjet e hapura, fusha "options" duhet të jetë null.`;
    }

    const prompt = `
      Je një profesor akademik ekspert në fushën: ${subject}.
      Detyra: Gjenero një provim profesional për temën: ${topic}.

      SPECIFIKAT E PROVIMIT:
      - Niveli i studentëve: ${level}
      - Shkalla e vështirësisë: ${difficulty} (Përshtat kompleksitetin me këtë shkallë)
      - Numri total i pyetjeve: ${numQuestions}
      - Tipi i pyetjeve: ${typeInstruction}

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
            "options": ["A", "B", "C", "D"], // Vetëm nëse është multiple-choice, përndryshe null
            "answer": "Përgjigja e saktë ose udhëzimi i zgjidhjes"
          }
        ]
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Ti je një asistent që gjeneron provime akademike në formatin JSON. Je strikt në strukturën e kërkuar." },
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