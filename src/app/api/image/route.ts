import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

const HUGGING_FACE_ACCESS_TOKEN = process.env.HUGGING_FACE_ACCESS_TOKEN || "";
const client = new InferenceClient(HUGGING_FACE_ACCESS_TOKEN);

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

        // Using official @huggingface/inference client
        const response = await client.textToImage({
            provider: "hf-inference",
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: fullPrompt,
            parameters: {
                guidance_scale: 8.5,
                num_inference_steps: 30,
                negative_prompt: 'photorealistic, realistic, 3d render, low quality, bad anatomy, blurry, text, watermark',
                scheduler: "Euler a"
            },
        });

        // Convert the response to a proper response
        return new NextResponse(response, {
            headers: {
                'Content-Type': 'image/png',
            },
        });

    } catch (error) {
        console.error("Hugging Face API Error:", error);
        return NextResponse.json(
            { error: "Failed to generate image" },
            { status: 500 }
        );
    }
}