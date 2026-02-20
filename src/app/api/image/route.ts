import { NextRequest, NextResponse } from "next/server";

const HUGGING_FACE_ACCESS_TOKEN = process.env.HUGGING_FACE_ACCESS_TOKEN || "";

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Add the fixed style prefix as requested
        const prefix = "Soft colored pencil sketch, warm storybook illustration, hand-drawn texture, gentle lighting, ";
        const fullPrompt = prefix + prompt;

        // Hugging Face API for Stability AI / SDXL
        const model = "stabilityai/stable-diffusion-xl-base-1.0";
        const url = `https://router.huggingface.co/models/${model}`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HUGGING_FACE_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: fullPrompt,
                options: { wait_for_model: true }
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Hugging Face API Error:", errorText);
            return NextResponse.json(
                { error: `Hugging Face API returned error ${res.status}` },
                { status: res.status }
            );
        }

        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        return NextResponse.json({ imageUrl: `data:image/png;base64,${base64Image}` });

    } catch (error) {
        console.error("Image Route Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
