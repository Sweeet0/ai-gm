import { NextRequest, NextResponse } from "next/server";
import http from "http";

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

        // Local Forge API Endpoint configuration
        const host = "127.0.0.1";
        const port = 7860;
        const path = "/sdapi/v1/txt2img";

        // Request Body for Forge/Automatic1111 API
        const payload = {
            prompt: fullPrompt,
            negative_prompt: "photorealistic, realistic, 3d render, low quality, bad anatomy, blurry, text, watermark, (worst quality:1.4), (low quality:1.4)",
            steps: 20,
            cfg_scale: 7,
            width: 896,
            height: 1152,
            sampler_name: "Euler a",
        };

        const postData = JSON.stringify(payload);

        console.log(`Fetching from: http://${host}:${port}${path}`);

        // Using native http module to bypass fetch's ConnectTimeoutError (10s limit)
        const responseData: any = await new Promise((resolve, reject) => {
            const options = {
                hostname: host,
                port: port,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error("Failed to parse Forge API response"));
                        }
                    } else {
                        reject(new Error(`Forge API returned status ${res.statusCode}: ${data.substring(0, 100)}`));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            // Set explicit connection and response timeouts
            req.setTimeout(60000, () => {
                req.destroy(new Error("Request timed out after 60s"));
            });

            req.write(postData);
            req.end();
        });

        const base64Image = responseData.images?.[0];

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
