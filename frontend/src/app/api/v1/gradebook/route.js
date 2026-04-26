import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── HELPER: KRIJO KLIENTIN SUPABASE ──────────────────────────────────────────
async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            console.error('Error setting cookies:', error);
          }
        },
      },
    }
  );
}

// ─── HELPER: LLOGARIT MESATAREN ───────────────────────────────────────────────
function calcAverage(p1, p2, p3) {
  const values = [p1, p2, p3].filter(v => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)));
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + parseFloat(b), 0) / values.length;
  return parseFloat(avg.toFixed(1));
}

// ─── HELPER: VALIDIM NOTE ─────────────────────────────────────────────────────
function validateGrade(value, scale) {
  if (value === null || value === undefined || value === '') return true;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (scale === '1-5') return num >= 1 && num <= 5;
  return num >= 1 && num <= 10;
}

// ─── GET: MERR STUDENTËT ──────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const supabase = await createClient();
    
    // Kontrollo autentikimin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in GET:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');

    let query = supabase
      .from('gradebook')
      .select('*')
      .eq('user_id', user.id)
      .order('subject', { ascending: true })
      .order('student_name', { ascending: true });

    if (subject && subject !== 'all') {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Database error in GET:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Gradebook GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST: SHTO STUDENT TË RI ─────────────────────────────────────────────────
export async function POST(req) {
  try {
    const supabase = await createClient();
    
    // Kontrollo autentikimin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      
      console.error('Auth error in POST:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const body = await req.json();
    const { subject, student_name, period_1, period_2, period_3, scale } = body;

    // Validimet bazë
    if (!subject?.trim() || !student_name?.trim()) {
      return NextResponse.json({ success: false, error: "Lënda dhe Emri janë të detyrueshme." }, { status: 400 });
    }

    // Validim i shkallës dhe notave
    const currentScale = scale || '1-10';
    const p1 = period_1 !== '' && period_1 !== null ? parseFloat(period_1) : null;
    const p2 = period_2 !== '' && period_2 !== null ? parseFloat(period_2) : null;
    const p3 = period_3 !== '' && period_3 !== null ? parseFloat(period_3) : null;

    if (!validateGrade(p1, currentScale) || !validateGrade(p2, currentScale) || !validateGrade(p3, currentScale)) {
      return NextResponse.json({ success: false, error: "Një ose më shumë nota janë jashtë shkallës së zgjedhur." }, { status: 400 });
    }

    const average = calcAverage(p1, p2, p3);

    const { data, error } = await supabase
      .from('gradebook')
      .insert([{
        user_id: user.id,
        subject: subject.trim(),
        student_name: student_name.trim(),
        period_1: p1,
        period_2: p2,
        period_3: p3,
        average,
        scale: currentScale,
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error in POST:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Gradebook POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT: PËRDITËSO STUDENTIN ─────────────────────────────────────────────────
export async function PUT(req) {
  try {
    const supabase = await createClient();
    
    // Kontrollo autentikimin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in PUT:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const body = await req.json();
    const { id, subject, student_name, period_1, period_2, period_3, scale } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID mungon." }, { status: 400 });
    }

    const currentScale = scale || '1-10';
    const p1 = period_1 !== '' && period_1 !== null ? parseFloat(period_1) : null;
    const p2 = period_2 !== '' && period_2 !== null ? parseFloat(period_2) : null;
    const p3 = period_3 !== '' && period_3 !== null ? parseFloat(period_3) : null;

    if (!validateGrade(p1, currentScale) || !validateGrade(p2, currentScale) || !validateGrade(p3, currentScale)) {
      return NextResponse.json({ success: false, error: "Një ose më shumë nota janë jashtë shkallës së zgjedhur." }, { status: 400 });
    }

    const average = calcAverage(p1, p2, p3);

    const { data, error } = await supabase
      .from('gradebook')
      .update({
        subject: subject?.trim(),
        student_name: student_name?.trim(),
        period_1: p1,
        period_2: p2,
        period_3: p3,
        average,
        scale: currentScale,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error in PUT:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Gradebook PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE: FSHI STUDENTIN ───────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const supabase = await createClient();
    
    // Kontrollo autentikimin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in DELETE:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "ID mungon." }, { status: 400 });
    }

    const { error } = await supabase
      .from('gradebook')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error in DELETE:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Gradebook DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
