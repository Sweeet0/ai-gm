import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import image from "next/image";

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
            provider: "replicate",
            model: "ByteDance/SDXL-Lightning",
            inputs: fullPrompt,
            parameters: {
                num_inference_steps: 5,
            },
        });

        // The response from textToImage is typically a Blob in @huggingface/inference
        // But we handle it robustly to avoid TypeScript errors
        const responseData = response as unknown;
        let buffer: ArrayBuffer;

        if (responseData instanceof Blob) {
            buffer = await responseData.arrayBuffer();
        } else if (typeof responseData === "string") {
            // If the response is a string, it might be a Data URL or base64. 
            // Most likely it's a base64 string if configured, or something went wrong.
            // For now, we'll try to convert it if it looks like base64
            const base64Data = responseData.includes("base64,")
                ? responseData.split("base64,")[1]
                : responseData;
            const nodeBuffer = Buffer.from(base64Data, "base64");
            buffer = nodeBuffer.buffer as ArrayBuffer;
        } else {
            throw new Error("Unexpected response type from textToImage");
        }

        const base64Image = Buffer.from(buffer).toString("base64");

        return NextResponse.json({
            imageUrl: `data:image/png;base64,${base64Image}`
        });

    } catch (error) {
        console.error("Image Generation Error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Internal server error"
        }, { status: 500 });
    }
}
