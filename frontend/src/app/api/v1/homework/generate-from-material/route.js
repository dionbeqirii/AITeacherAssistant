import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "llama-3.3-70b-versatile";

function buildHomeworkPrompt(materialText, { level, numTasks, type, deadline, extraInfo }) {
  let typeInstruction = '';
  if (type === 'open') typeInstruction = 'Të gjitha detyrat duhet të jenë me përgjigje të hapura/ese që kërkojnë mendim kritik.';
  else if (type === 'practical') typeInstruction = 'Të gjitha detyrat duhet të jenë praktike/laboratorike me hapa konkretë zbatimi.';
  else typeInstruction = 'Detyra të kombinuara: ~50% të hapura (mendim kritik) dhe ~50% praktike (zbatim).';

  return `HAPI 1 — ANALIZO MATERIALIN:
Lexo me kujdes materialin mësimor më poshtë. Identifiko:
- Temat dhe nëntemat kryesore
- Konceptet themelore që studenti duhet t'i kuptojë mirë
- Fushat ku mund të aplikohen njohuritë praktikisht
- Lidhjet midis koncepteve të ndryshme në material

MATERIAL MËSIMOR:
"""
${materialText}
"""

HAPI 2 — GJENERO DETYRAT E SHTËPISË:
Duke u bazuar EKSKLUZIVISHT në analizën e materialit, krijo ${numTasks || 3} detyra shtëpie që ndihmojnë studentin të thellojë mirëkuptimin dhe të zbatojë konceptet.

SPECIFIKAT:
- Nivel: ${level || 'i papërcaktuar'}
- Tip: ${typeInstruction}
${deadline ? `- Afati i dorëzimit: ${deadline}` : ''}
${extraInfo ? `- Udhëzime shtesë: "${extraInfo}"` : ''}

RREGULLA STRIKTE:
1. Çdo detyrë DUHET të rrjedhë drejtpërdrejt nga materiali — nuk lejohen detyra të përgjithshme.
2. Shpërndaj detyrat nëpër temat e ndryshme të materialit.
3. Çdo detyrë duhet të ketë qëllim të qartë dhe të matshëm.
4. Rubrica DUHET të ketë shumë 100 pikë gjithsej.
5. Gjuha: SHQIP.
6. Kthe VETËM JSON të vlefshëm, pa tekst tjetër, pa komente.

FORMAT I SAKTË:
{
  "homework": [
    {
      "id": 1,
      "title": "Titulli specifik i lidhur me materialin",
      "description": "Përshkrim i detajuar: çfarë bën studenti, si e realizon dhe çfarë rezultati pritet.",
      "requirements": ["Kërkesa specifike 1 nga materiali", "Kërkesa specifike 2"],
      "rubric": [
        { "criteria": "Korrektësia dhe lidhja me materialin", "points": 40 },
        { "criteria": "Thellësia e analizës", "points": 35 },
        { "criteria": "Struktura dhe prezantimi", "points": 25 }
      ],
      "type": "open"
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
      level: formData.get('level') || '',
      numTasks: parseInt(formData.get('numTasks') || '3'),
      type: formData.get('type') || 'open',
      deadline: formData.get('deadline') || '',
      extraInfo: formData.get('extraInfo') || '',
    };

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nuk u ngarkua asnjë material.' }, { status: 400 });
    }

    if (config.numTasks < 1 || config.numTasks > 10) {
      return NextResponse.json({ success: false, error: 'Numri i detyrave duhet të jetë ndërmjet 1 dhe 10.' }, { status: 400 });
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

    const prompt = buildHomeworkPrompt(materialText, config);

    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: "Ti je profesor universitar me eksperiencë në pedagogji dhe dizajnimin e aktiviteteve mësimore. Detyra jote: lexo materialin mësimor, analizoje me kujdes, dhe krijo detyra shtëpie që ndihmojnë studentët të kuptojnë dhe të zbatojnë konceptet e materialit — jo detyra të përgjithshme. Gjithmonë kthe JSON të vlefshëm sipas formatit të kërkuar."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(completion.choices[0].message.content);

    if (!content.homework || !Array.isArray(content.homework)) {
      throw new Error("AI nuk ktheu strukturën e pritur.");
    }

    return NextResponse.json({ success: true, homework: content.homework });

  } catch (error) {
    console.error("generate-from-material (homework) error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
