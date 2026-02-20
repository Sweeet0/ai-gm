import { NextRequest, NextResponse } from "next/server";

const NEXT_PUBLIC_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Using Lyria (Music AI) via Gemini API / Google AI Studio endpoint
        const model = "lyria-002"; // Or lyria-realtime-exp
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${NEXT_PUBLIC_GEMINI_API_KEY}`;

        // Note: Lyria's payload might differ slightly depending on the exact version
        // This is the standard predict pattern for Google's multimodal/specialized models
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [
                    { prompt: prompt }
                ],
                parameters: {
                    sampleCount: 1,
                    // durationSeconds: 30, // Usual default for music gen
                },
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Lyria API Error:", errorData);
            return NextResponse.json(
                { error: `Lyria API returned error ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        const base64Audio = data.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Audio) {
            return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
        }

        // Return the data URL for the prototype
        return NextResponse.json({ audioUrl: `data:audio/mpeg;base64,${base64Audio}` });

    } catch (error) {
        console.error("Audio Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
