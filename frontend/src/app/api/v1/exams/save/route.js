import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req) {
  // 1. Merr cookieStore në mënyrë asinkrone (E detyrueshme në Next 16)
  const cookieStore = await cookies();
  
  // 2. Krijo klientin e Supabase me qasje direkte te cookies
  const supabase = createServerClient(
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
            // Kjo mund të dështojë nëse thirret nga një Server Component, 
            // por në API Route është në rregull.
          }
        },
      },
    }
  );

  // 3. Kontrollo përdoruesin
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth Error:", authError);
    return NextResponse.json(
      { success: false, error: "Sesioni nuk u gjet. Provoni të bëni login përsëri." },
      { status: 401 }
    );
  }

  // 4. Vazhdo me logjikën e ruajtjes...
  try {
    const body = await req.json();
    // Logjika jote për ruajtjen në DB këtu...
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}