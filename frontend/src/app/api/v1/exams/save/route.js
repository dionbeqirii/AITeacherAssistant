import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const body = await req.json();

    // Ky log do të shfaqet në terminalin e VS Code kur klikon "Ruaj"
    console.log("Duke ruajtur të dhënat:", body);

    const { data, error } = await supabase
      .from('exams_history')
      .insert([
        {
          subject: body.subject,
          topic: body.topic,
          level: body.level,
          difficulty: body.difficulty,
          professor_name: body.professorName, // Sigurohu që në SQL është professor_name
          questions: body.questions,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase SQL Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Server Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}