import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "llama-3.3-70b-versatile";

function buildExamPrompt(materialText, { level, numQuestions, type, difficulty, professorName, extraInfo }) {
  let typeInstruction = '';
  if (type === 'multiple-choice') typeInstruction = 'Të gjitha pyetjet duhet të jenë me zgjedhje të shumëfishta (A, B, C, D). Fusha "options" ka 4 alternativa.';
  else if (type === 'open-ended') typeInstruction = 'Të gjitha pyetjet duhet të jenë të hapura/ese. Fusha "options" duhet të jetë null.';
  else typeInstruction = 'Provimi i kombinuar: ~50% me zgjedhje të shumëfishta (me "options") dhe ~50% pyetje të hapura (options: null).';

  return `HAPI 1 — ANALIZO MATERIALIN:
Lexo me kujdes materialin mësimor më poshtë. Identifiko:
- Temat dhe nëntemat kryesore
- Konceptet, definicionet dhe faktet e rëndësishme
- Shembujt dhe rastet e studimit
- Nivelin e vështirësisë së përmbajtjes

MATERIAL MËSIMOR:
"""
${materialText}
"""

HAPI 2 — GJENERO PROVIMIN:
Duke u bazuar EKSKLUZIVISHT në analizën e materialit të mësipërm, krijo ${numQuestions || 5} pyetje provimi që testojnë mirëkuptimin e thellë, jo memorizimin.

SPECIFIKAT:
- Profesor: ${professorName || 'N/A'}
- Nivel: ${level || 'Fakultet'}
- Vështirësi: ${difficulty || 'Medium'}
- Tip: ${typeInstruction}
${extraInfo ? `- Udhëzime shtesë: "${extraInfo}"` : ''}

RREGULLA STRIKTE:
1. Çdo pyetje DUHET të jetë e bazuar drejtpërdrejt në material — nuk lejohen pyetje të përgjithshme.
2. Shpërndaj pyetjet në mënyrë të balancuar nëpër të gjitha temat e materialit.
3. Pyetjet duhet të variojnë: disa testojnë kuptimin, disa aplikimin, disa analizën.
4. Gjuha: SHQIP.
5. Kthe VETËM JSON të vlefshëm, pa tekst tjetër, pa komente.

FORMAT I SAKTË:
{
  "questions": [
    {
      "id": 1,
      "question": "Teksti i plotë i pyetjes?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "Përgjigja e saktë e plotë"
    }
  ]
}`;
}

async function extractTextFromImage(buffer, mimeType) {
  const base64 = buffer.toString('base64');
  const imageUrl = `data:${mimeType};base64,${base64}`;

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUrl } },
        { type: "text", text: "Lexo dhe transkribo të gjithë tekstin e dukshëm në këtë material mësimor. Kthe VETËM tekstin e plotë, pa komente shtesë." }
      ]
    }],
    max_tokens: 2048,
  });

  return response.choices[0].message.content;
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const config = {
      level: formData.get('level') || 'Fakultet',
      numQuestions: parseInt(formData.get('numQuestions') || '5'),
      type: formData.get('type') || 'multiple-choice',
      difficulty: formData.get('difficulty') || 'Medium',
      professorName: formData.get('professorName') || '',
      extraInfo: formData.get('extraInfo') || '',
    };

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nuk u ngarkua asnjë material.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;

    let materialText = '';

    if (mimeType === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const pdfData = await parser.getText();
      await parser.destroy();
      materialText = pdfData.text?.trim();
      if (!materialText || materialText.length < 20) {
        return NextResponse.json({ success: false, error: 'PDF-ja duket bosh ose nuk mund të lexohet. Provo me foto.' }, { status: 422 });
      }
    } else if (mimeType.startsWith('image/')) {
      materialText = await extractTextFromImage(buffer, mimeType);
    } else {
      return NextResponse.json({ success: false, error: 'Format i pasupportuar. Provo JPEG, PNG ose PDF.' }, { status: 400 });
    }

    const prompt = buildExamPrompt(materialText, config);

    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: "Ti je profesor universitar me eksperiencë në hartimin e provimeve akademike. Detyra jote: lexo materialin mësimor, analizoje thellë, dhe gjenero pyetje provimi që testojnë mirëkuptimin real të studentit — jo memorizimin sipërfaqësor. Gjithmonë kthe JSON të vlefshëm sipas formatit të kërkuar."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(completion.choices[0].message.content);

    if (!content.questions || !Array.isArray(content.questions)) {
      throw new Error("AI nuk ktheu strukturën e pritur.");
    }

    return NextResponse.json({ success: true, data: content.questions });

  } catch (error) {
    console.error("generate-from-material (exam) error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
