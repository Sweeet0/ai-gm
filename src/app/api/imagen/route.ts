import { NextRequest, NextResponse } from "next/server";

const NEXT_PUBLIC_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Using Imagen 3 via Gemini API / Google AI Studio endpoint
        // Standard endpoint for Imagen 3 in AI Studio
        const model = "imagen-3.0-generate-001";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${NEXT_PUBLIC_GEMINI_API_KEY}`;

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [
                    { prompt: prompt }
                ],
                parameters: {
                    sampleCount: 1,
                    // aspect_ratio: "1:1", // Optional
                    // output_mime_type: "image/png"
                },
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Imagen API Error:", errorData);
            return NextResponse.json(
                { error: `Imagen API returned error ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
        }

        // Return the data URL directly for the prototype
        return NextResponse.json({ imageUrl: `data:image/png;base64,${base64Image}` });

    } catch (error) {
        console.error("Imagen Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
