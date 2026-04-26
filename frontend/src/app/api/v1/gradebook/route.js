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
          catch (error) { console.error('Error setting cookies:', error); }
        },
      },
    }
  );
}

// Llogaritja e mesatares dinamike
function calcAverage(p1, p2, p3) {
  const values = [p1, p2, p3].filter(v => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)));
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + parseFloat(b), 0) / values.length;
  return parseFloat(avg.toFixed(1));
}

// ─── GET: MERR TE DHENAT ──────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');

    // Këtu do të kërkojmë gjithashtu fushat e reja
    let query = supabase.from('gradebook').select('*, class_group, student_id_number, email_contact, notes').eq('user_id', user.id).order('created_at', { ascending: false });
    
    if (subject && subject !== 'all') {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST: SHTO STUDENT TE RI ─────────────────────────────────────────────────
export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });

    const body = await req.json();
    // Këtu shtohen fushat e reja: class_group, student_id_number, email_contact, notes
    const { subject, student_name, period_1, period_2, period_3, scale, absences, notes, class_group, student_id_number, email_contact } = body;

    const average = calcAverage(period_1, period_2, period_3);

    const { data, error } = await supabase
      .from('gradebook')
      .insert([{
        user_id: user.id,
        subject: subject?.trim(),
        student_name: student_name?.trim(),
        class_group: class_group?.trim() || null, // Fushe e re
        student_id_number: student_id_number?.trim() || null, // Fushe e re
        email_contact: email_contact?.trim() || null, // Fushe e re
        period_1: period_1 || null,
        period_2: period_2 || null,
        period_3: period_3 || null,
        average,
        scale: scale || '1-10',
        absences: parseInt(absences) || 0,
        notes: notes || '' // Fushe e re (ose perditesuar nese tashme ekzistonte si numer)
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT: EDITO STUDENTIN ─────────────────────────────────────────────────────
export async function PUT(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });

    const body = await req.json();
    // Këtu shtohen fushat e reja: class_group, student_id_number, email_contact, notes
    const { id, subject, student_name, period_1, period_2, period_3, scale, absences, notes, class_group, student_id_number, email_contact } = body;

    const average = calcAverage(period_1, period_2, period_3);

    const { data, error } = await supabase
      .from('gradebook')
      .update({ 
        subject: subject?.trim(),
        student_name: student_name?.trim(),
        class_group: class_group?.trim() || null, // Fushe e re
        student_id_number: student_id_number?.trim() || null, // Fushe e re
        email_contact: email_contact?.trim() || null, // Fushe e re
        period_1: period_1 || null,
        period_2: period_2 || null,
        period_3: period_3 || null,
        average,
        scale: scale || '1-10',
        absences: parseInt(absences) || 0,
        notes: notes || '' // Fushe e re (ose perditesuar nese tashme ekzistonte si numer)
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE: FSHI STUDENTIN ───────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID mungon." }, { status: 400 });

    const { error } = await supabase
      .from('gradebook')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
