import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } 
          catch (error) {}
        },
      },
    }
  );
}

// Merr Mungesat
export async function GET(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Të lutem kyçu." }, { status: 401 });

    const { data, error } = await supabase
      .from('absences')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Fshi Mungesë
export async function DELETE(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Të lutem kyçu." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "ID mungon." }, { status: 400 });

    const { error } = await supabase
      .from('absences')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Përditëso justifikimin e një mungese
export async function PATCH(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ success: false, error: "Të lutem kyçu." }, { status: 401 });

    const body = await req.json();
    const { id, justification } = body;
    if (!id) return NextResponse.json({ success: false, error: "ID mungon." }, { status: 400 });

    const { data, error } = await supabase
      .from('absences')
      .update({ justification: justification ?? null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase PATCH error:', error);
      throw error;
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('PATCH /absences error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Shto Mungesë të Re
export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Të lutem kyçu." }, { status: 401 });

    const body = await req.json();
    const { student_name, date, reason, subject } = body;

    const { data, error } = await supabase
      .from('absences')
      .insert([{
        user_id: user.id,
        student_name,
        date,
        reason,
        subject: subject || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
