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

        // Local Forge API Endpoint (Fixed IP to avoid DNS resolution issues)
        const url = "http://192.168.0.12:7860/sdapi/v1/txt2img";

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

        console.log("Fetching from:", url);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
            signal: (AbortSignal as any).timeout(60000), // 60 seconds timeout
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Forge API Error:", errorText);
            return NextResponse.json(
                { error: `Forge API returned error ${res.status}` },
                { status: res.status }
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
        console.error("Local Image Generation Error:", error, error.cause);
        return NextResponse.json(
            { error: "Failed to connect to Local Forge API" },
            { status: 500 }
        );
    }
}
