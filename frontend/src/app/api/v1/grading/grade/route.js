import { NextResponse } from 'next/server';
import { gradeSubmission } from '@/services/ai.service';
import { saveAiGrade } from '@/services/db.service';

export async function POST(req) {
  try {
    // 1. Marrim të dhënat nga kërkesa (body)
    const { studentAnswer, questionText, rubric, subject } = await req.json();
    
    console.log("📥 Duke procesuar vlerësimin për:", subject);

    // 2. Thirrja e AI
    const aiResult = await gradeSubmission(studentAnswer, questionText, rubric);
    console.log("🤖 AI u përgjigj me sukses");

    // 3. Ruajtja në Databazë (Supabase)
    try {
      await saveAiGrade({
        subject: subject || "Pa lëndë",
        score: aiResult.score,
        feedback: aiResult.feedback,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses
      });
      console.log("💾 U ruajt në Supabase");
    } catch (dbError) {
      console.error("⚠️ Gabim në DB por po dërgojmë rezultatin e AI:", dbError.message);
    }

    // 4. Kthimi i përgjigjes te Frontendi
    return NextResponse.json({ success: true, data: aiResult });

  } catch (error) {
    console.error("❌ Gabim Kritik:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}