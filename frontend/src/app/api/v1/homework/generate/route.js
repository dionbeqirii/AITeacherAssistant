import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { subject, topic, level, numTasks, type, deadline, extraInfo } = body;

    // Validim bazë
    if (!subject || !topic) {
      return NextResponse.json(
        { success: false, error: "Lënda dhe Tema janë të detyrueshme." },
        { status: 400 }
      );
    }

    if (numTasks < 1 || numTasks > 10) {
      return NextResponse.json(
        { success: false, error: "Numri i detyrave duhet të jetë ndërmjet 1 dhe 10." },
        { status: 400 }
      );
    }

    // Lloji i detyrës
    let typeInstruction = '';
    if (type === 'open') {
      typeInstruction = 'Të gjitha detyrat duhet të jenë me përgjigje të hapura/ese, ku studenti shpjegon me fjalët e veta.';
    } else if (type === 'practical') {
      typeInstruction = 'Të gjitha detyrat duhet të jenë praktike/laboratorike, ku studenti duhet të kryejë ushtrime konkrete, zgjidhë probleme ose shkruajë kod.';
    } else if (type === 'mixed') {
      typeInstruction = 'Detyrat duhet të jenë të kombinuara: rreth 50% me përgjigje të hapura dhe 50% praktike/laboratorike.';
    }

    const deadlineText = deadline
      ? `Afati i dorëzimit: ${deadline}.`
      : 'Nuk ka afat specifik të dorëzimit.';

    const prompt = `
      Je një profesor akademik ekspert. Detyra jote është të gjenerosh detyra shtëpie profesionale.

      DETAJET:
      - Lënda: ${subject}
      - Tema: ${topic}
      - Niveli i studentëve: ${level || 'i papërcaktuar'}
      - Numri i detyrave: ${numTasks}
      - Tipi: ${typeInstruction}
      - ${deadlineText}

      UDHËZIME SHTESË:
      "${extraInfo || 'Nuk ka udhëzime specifike.'}"

      KËRKESAT E FORMATIT:
      1. Gjuha: SHQIP.
      2. Kthe VETËM një objekt JSON të vlefshëm, pa tekst tjetër.
      3. Struktura e saktë:
      {
        "homework": [
          {
            "id": 1,
            "title": "Titulli i shkurtër i detyrës",
            "description": "Përshkrimi i plotë dhe i qartë i detyrës. Çfarë duhet të bëjë studenti.",
            "requirements": [
              "Kërkesa 1",
              "Kërkesa 2",
              "Kërkesa 3"
            ],
            "rubric": [
              { "criteria": "Korrektësia e përmbajtjes", "points": 40 },
              { "criteria": "Struktura dhe organizimi", "points": 30 },
              { "criteria": "Kreativiteti dhe thellësia", "points": 30 }
            ],
            "type": "open" 
          }
        ]
      }
      
      SHËNIM: Fusha "type" për çdo detyrë duhet të jetë "open" ose "practical".
      Rubrica duhet të ketë gjithmonë total 100 pikë.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Ti je një asistent akademik që gjeneron detyra shtëpie profesionale në formatin JSON. Je strikt në strukturën e kërkuar dhe gjithmonë kthen JSON të vlefshëm."
        },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      response_format: { type: "json_object" }
    });

    const content = JSON.parse(chatCompletion.choices[0].message.content);

    if (!content.homework || !Array.isArray(content.homework)) {
      throw new Error("Formati i përgjigjes nga AI është i pasaktë.");
    }

    return NextResponse.json({
      success: true,
      homework: content.homework
    });

  } catch (error) {
    console.error("Homework Generate Error:", error);
    return NextResponse.json(
      { success: false, error: "Gabim gjatë gjenerimit të detyrave. Provoni përsëri." },
      { status: 500 }
    );
  }
}