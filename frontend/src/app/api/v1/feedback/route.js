import { supabase } from '../../../../lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { rating, message, userId, fullName } = await request.json();

    // Validimi bazë (Edge Case)
    if (!rating || !message || !userId) {
      return NextResponse.json(
        { success: false, error: "Të dhënat janë të paplotësuara." },
        { status: 400 }
      );
    }

    // Insertimi në Supabase
    const { data, error } = await supabase
      .from('feedbacks')
      .insert([
        { 
          user_id: userId, 
          user_full_name: fullName, 
          rating: parseInt(rating), 
          message: message 
        }
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Feedback-u u dërgua me sukses!" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}