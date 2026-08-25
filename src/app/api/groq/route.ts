import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "No readable text found in PDF. Please ensure it is a text-based document." }, { status: 400 });
    }

    const processedText = text.substring(0, 30000);
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "Server missing GROQ_API_KEY" }, { status: 500 });
    }

    const prompt = `
      You are an expert Quiz Generator. 
      Analyze the following text extracted from a PDF and extract ALL multiple-choice questions.
      
      CRITICAL: Return ONLY a raw JSON array of objects. No markdown formatting, no "here is your JSON", no code blocks.
      
      Format:
      [
        {
          "text": "The full question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0
        }
      ]

      Text:
      ${processedText}
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a specialized JSON generator. Output only raw JSON arrays." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        stream: false
      })
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const rawOutput = data.choices[0].message.content.trim();
    const startIndex = rawOutput.indexOf('[');
    const endIndex = rawOutput.lastIndexOf(']') + 1;
    
    if (startIndex === -1 || endIndex === 0) {
      return NextResponse.json({ error: "Failed to extract valid JSON from AI response." }, { status: 500 });
    }

    const cleanJson = rawOutput.substring(startIndex, endIndex);
    const questions = JSON.parse(cleanJson);

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
