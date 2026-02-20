import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { prompt, visualSummary } = await req.json();

        if (!prompt && !visualSummary) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Image Consistency: Put specific content (visualSummary) first, then styling prefix
        const prefix = "Soft colored pencil sketch, warm storybook illustration, hand-drawn texture, gentle lighting";
        const content = visualSummary || prompt;
        const fullPrompt = `${content}, ${prefix}`;

        // Local Forge API Endpoints to try (Fallback for ECONNREFUSED)
        const endpoints = [
            "http://localhost:7860/sdapi/v1/txt2img",
            "http://127.0.0.1:7860/sdapi/v1/txt2img",
            "http://0.0.0.0:7860/sdapi/v1/txt2img"
        ];

        // Request Body for Forge/Automatic1111 API
        const payload = {
            prompt: fullPrompt,
            negative_prompt: "photorealistic, realistic, 3d render, low quality, bad anatomy, blurry, text, watermark, (worst quality:1.4), (low quality:1.4)",
            steps: 30,
            cfg_scale: 8.5,
            width: 896,
            height: 1152,
            sampler_name: "Euler a",
        };

        let res: Response | null = null;
        let lastError: any = null;

        for (const url of endpoints) {
            try {
                console.log(`Attempting image generation at: ${url}`);
                res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                    cache: "no-store",
                });
                if (res.ok) break;
            } catch (err: any) {
                console.warn(`Failed to connect to ${url}:`, err.message);
                lastError = err;
            }
        }

        if (!res || !res.ok) {
            const errorText = res ? await res.text() : "All endpoints failed";
            console.error("Forge API Error:", errorText, lastError?.cause);
            return NextResponse.json(
                { error: `Forge API connection failed. Tried ${endpoints.length} URLs.` },
                { status: res ? res.status : 500 }
            );
        }

        const data = await res.json();
        const base64Image = data.images?.[0];

        if (!base64Image) {
            return NextResponse.json({ error: "No image received from Forge API" }, { status: 500 });
        }

        const buffer = Buffer.from(base64Image, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });

        return new NextResponse(blob, {
            headers: {
                'Content-Type': 'image/png',
            },
        });

    } catch (error: any) {
        console.error("Local Image Generation - Unhandled Error:", error, error.cause);
        return NextResponse.json(
            { error: "Image generation logic failed" },
            { status: 500 }
        );
    }
}
