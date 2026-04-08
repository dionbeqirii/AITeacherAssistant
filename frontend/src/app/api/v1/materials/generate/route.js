import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { subject, topic, type, level } = body;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ success: false, error: "Konfigurimi i API Key mungon." }, { status: 500 });
    }

    // Konstruktimi i një prompti më të detajuar
    const systemPrompt = `
      Je një asistent mësuesi ekspert në sistemin arsimor. 
      Detyra jote është të krijosh materiale mësimore cilësore në gjuhën shqipe.
      Përdor një ton profesional, edukativ dhe të qartë.
      Strukturo përmbajtjen me tituj (H1, H2), pika (bullet points) dhe nëse është e nevojshme, shembuj praktikë.
      Nëse kërkohet provim, shto edhe një seksion me përgjigjet e sakta në fund.
    `;

    const userPrompt = `
      Krijo një ${type} të detajuar.
      Lënda: ${subject}
      Niveli: ${level || 'Nivel i përgjithshëm'}
      Tema: ${topic}
      
      Materiali duhet të përfshijë:
      1. Një hyrje të shkurtër.
      2. Shpjegimin kryesor të koncepteve.
      3. Shembuj ilustrues.
      4. Një përmbledhje në fund.
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b", // Sugjeroj 70B për cilësi më të lartë në materiale komplekse
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6, // Pak më ulët për të ruajtur saktësinë faktike
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const groqError = await response.json();
      return NextResponse.json({ 
        success: false, 
        error: groqError.error?.message || "Gabim nga Groq API" 
      }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json({ success: false, error: "AI nuk gjeneroi dot përmbajtje." }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      content: data.choices[0].message.content 
    });

  } catch (error) {
    console.error("API ROUTE ERROR:", error);
    return NextResponse.json({ success: false, error: "Server Error: " + error.message }, { status: 500 });
  }
}