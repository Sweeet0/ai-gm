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

        // Local Forge API Endpoint (Fixed IP to bypass DNS issues)
        const url = "http://192.168.0.12:7860/sdapi/v1/txt2img";

        // Request Body for Forge/Automatic1111 API - Optimized for BluePencil-XL
        const payload = {
            prompt: fullPrompt,
            negative_prompt: "photorealistic, realistic, 3d render, low quality, bad anatomy, blurry, text, watermark, (worst quality:1.4), (low quality:1.4)",
            steps: 20,
            cfg_scale: 7,
            width: 896,
            height: 1152,
            sampler_name: "Euler a",
        };

        console.log("Fetching from:", url);

        // Using specialized fetch with duplex and explicit Host header
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Host": "127.0.0.1:7860", // Explicit Host header as requested
            },
            body: JSON.stringify(payload),
            cache: "no-store",
            // @ts-ignore - duplex is required in some Node versions for POST with body
            duplex: 'half',
            signal: (AbortSignal as any).timeout(60000), // 60 seconds timeout
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Forge API Error:", errorText);
            return NextResponse.json(
                { error: `Forge API returned status ${res.status}` },
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
            { error: `Image generation failed: ${error.message}` },
            { status: 500 }
        );
    }
}
