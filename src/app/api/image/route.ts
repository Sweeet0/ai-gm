import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { prompt, visualSummary, imageStyleSuffix } = await req.json();

        if (!prompt && !visualSummary) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const url = "http://192.168.0.12:7860/sdapi/v1/txt2img";

        // 1. 人物判定用のキーワードリスト（英語）
        const characterKeywords = [
            "person", "human",
            "man", "woman", "old man", "old woman", "child", "kid", "boy", "girl", "he", "she", "him", "her",
            "villager", "enemy", "ally", "companion", "soldier", "knight",
            "face", "eyes", "hair"
        ];

        // 2. 物語の内容(content)に人物キーワードが含まれているか判定
        const contentStr = (visualSummary || prompt).toLowerCase();
        const hasCharacter = characterKeywords.some(word => contentStr.includes(word));

        // 3. スタイル定義の刷新（アナログ・手書き感を強調）
        const prefix = "Rough colored pencil sketch, warm storybook illustration, hand-drawn organic lines";
        const artStyle = "messy watercolor wash, visible paper grain, crayon texture, traditional media feel, charcoal edges, oil painting, pastel, charcoal, ink, graphite, pencil";

        // Use dynamic suffix if provided, otherwise empty
        const dynamicSuffix = imageStyleSuffix ? `${imageStyleSuffix}` : "";
        const fullPrompt = `${prefix}, ${dynamicSuffix}, ${contentStr}, ${artStyle}`;

        // 4. Negative Promptの動的制御
        let negativePrompt = "photorealistic, realistic, 3d render, digital art, smooth gradient, sharp lines, low quality, (worst quality:1.4), text, watermark";
        if (!hasCharacter) {
            negativePrompt += ", human, person, character, face, girl, boy, body, man, woman, people";
        }

        // Request Body for Forge/Automatic1111 API - Optimized for analog style
        const payload = {
            prompt: fullPrompt,
            negative_prompt: negativePrompt,
            steps: 20,
            cfg_scale: 7,
            width: 896,
            height: 1152,
            sampler_name: "Euler a",
        };

        console.log("Fetching from:", url, "HasCharacter:", hasCharacter);
        console.log("Payload:", payload);

        // Using specialized fetch with duplex
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
            // @ts-ignore - duplex is required in some Node versions for POST with body
            duplex: 'half',
            signal: (AbortSignal as any).timeout(180000), // 3 minutes timeout
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

        // Instead of constructing a Node Blob (which can cause 500 errors with large payloads),
        // we'll return the base64 string formatted as a Data URL directly in JSON.
        return NextResponse.json({
            imageUrl: `data:image/png;base64,${base64Image}`
        });

    } catch (error: any) {
        console.error("Local Image Generation Error:", error, error.cause);
        return NextResponse.json(
            { error: `Image generation failed: ${error.message}` },
            { status: 500 }
        );
    }
}
