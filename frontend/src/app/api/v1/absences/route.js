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

// ─── GET: MERR MUNGESAT ───────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in GET absences:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get('student_name');
    const subject = searchParams.get('subject');

    let query = supabase
      .from('absences')
      .select('*')
      .eq('user_id', user.id)
      .order('absence_date', { ascending: false });

    if (studentName) {
      query = query.eq('student_name', studentName);
    }
    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Database error in GET absences:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Absences GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST: SHTO MUNGESË ───────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in POST absence:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const body = await req.json();
    const { student_name, subject, absence_date, absence_type, notes } = body;

    // Validime
    if (!student_name?.trim() || !subject?.trim() || !absence_date) {
      return NextResponse.json({ 
        success: false, 
        error: "Studenti, lënda dhe data janë të detyrueshme." 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('absences')
      .insert([{
        user_id: user.id,
        student_name: student_name.trim(),
        subject: subject.trim(),
        absence_date,
        absence_type: absence_type || 'unjustified',
        notes: notes?.trim() || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error in POST absence:', error);
      
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Absences POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT: PËRDITËSO MUNGESËN ──────────────────────────────────────────────────
export async function PUT(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in PUT absence:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const body = await req.json();
    const { id, student_name, subject, absence_date, absence_type, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID mungon." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('absences')
      .update({
        student_name: student_name?.trim(),
        subject: subject?.trim(),
        absence_date,
        absence_type,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error in PUT absence:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Absences PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE: FSHI MUNGESËN ────────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in DELETE absence:', authError);
      return NextResponse.json({ success: false, error: "Jo i autentikuar." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "ID mungon." }, { status: 400 });
    }

    const { error } = await supabase
      .from('absences')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error in DELETE absence:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Absences DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
