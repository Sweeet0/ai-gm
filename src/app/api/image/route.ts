import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

const HUGGING_FACE_ACCESS_TOKEN = process.env.HUGGING_FACE_ACCESS_TOKEN || "";
const client = new InferenceClient(HUGGING_FACE_ACCESS_TOKEN);

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Add the fixed style prefix as requested
        const prefix = "Soft colored pencil sketch, warm storybook illustration, hand-drawn texture, gentle lighting, ";
        const fullPrompt = prefix + prompt;

        // Using official @huggingface/inference client
        const response = await client.textToImage({
            provider: "hf-inference",
            model: "black-forest-labs/FLUX.1-dev", // Changed to a model that works with Inference API
            // model: "ByteDance/SDXL-Lightning",
            // model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: fullPrompt,
            parameters: {
                num_inference_steps: 30,
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