import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { saveAiGrade } from '@/services/db.service';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "openai/gpt-oss-120b";

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI nuk ktheu JSON të vlefshëm.");
  return JSON.parse(match[0]);
}

async function gradeWithVision(base64, mimeType, rubric) {
  const imageUrl = `data:${mimeType};base64,${base64}`;
  const prompt = `Ti je profesor akademik. Analizoji këtë fotografi të provimit të studentit.
Lexo me kujdes të gjitha pyetjet dhe përgjigjet e shkruara.
Vlerëso saktësinë e çdo përgjigje dhe jep një notë totale.
${rubric ? `Rubrika: ${rubric}` : 'Vlerëso korrektësinë faktike dhe plotësinë.'}

KTHE VETËM NJË OBJEKT JSON TË PASTËR (pa tekst tjetër):
{
  "score": (numër 0-100),
  "feedback": "koment i detajuar mbi performancën e studentit",
  "strengths": ["pika e fortë 1", "pika e fortë 2"],
  "weaknesses": ["gabim 1", "gabim 2"]
}`;

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUrl } },
        { type: "text", text: prompt }
      ]
    }],
    max_tokens: 1024,
  });

  return extractJson(response.choices[0].message.content);
}

async function gradeWithText(extractedText, rubric) {
  const prompt = `Ti je profesor akademik.
Vlerëso këtë provim të studentit bazuar në tekstin e ekstraktuar nga PDF.
Teksti i provimit:
${extractedText}

${rubric ? `Rubrika: ${rubric}` : 'Vlerëso korrektësinë faktike dhe plotësinë e përgjigjes.'}

KTHE VETËM NJË OBJEKT JSON TË PASTËR (pa tekst tjetër):
{
  "score": (numër 0-100),
  "feedback": "koment i detajuar mbi performancën e studentit",
  "strengths": ["pika e fortë 1", "pika e fortë 2"],
  "weaknesses": ["gabim 1", "gabim 2"]
}`;

  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const subject = formData.get('subject') || 'Pa lëndë';
    const rubric = formData.get('rubric') || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nuk u ngarkua asnjë skedar.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;

    let aiResult;

    if (mimeType === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const pdfData = await parser.getText();
      await parser.destroy();
      const extractedText = pdfData.text?.trim();

      if (!extractedText || extractedText.length < 20) {
        return NextResponse.json({ success: false, error: 'PDF-ja duket bosh ose nuk mund të lexohet. Provo me një foto.' }, { status: 422 });
      }

      aiResult = await gradeWithText(extractedText, rubric);
    } else if (mimeType.startsWith('image/')) {
      const base64 = buffer.toString('base64');
      aiResult = await gradeWithVision(base64, mimeType, rubric);
    } else {
      return NextResponse.json({ success: false, error: 'Formati i skedarit nuk mbështetet. Provo JPEG, PNG ose PDF.' }, { status: 400 });
    }

    try {
      await saveAiGrade({
        subject,
        score: aiResult.score,
        feedback: aiResult.feedback,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
      });
    } catch (dbError) {
      console.error("⚠️ DB error (jo kritik):", dbError.message);
    }

    return NextResponse.json({ success: true, data: aiResult });

  } catch (error) {
    console.error("❌ grade-image error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
