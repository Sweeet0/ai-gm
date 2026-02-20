import { NextRequest, NextResponse } from "next/server";

const NEXT_PUBLIC_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${NEXT_PUBLIC_GEMINI_API_KEY}`;

// System prompt defining the GM role & enforcing JSON output
const SYSTEM_PROMPT = `あなたは究極の対話型ゲームマスター（GM）です。プレイヤーの選択と想像力を尊重し、没入感のある最高のゲーム体験を提供してください。

## ルール
1. 毎ターン、プレイヤーのアクションを受け取り、物語を進行させてください。
2. 臨場感があり、五感に訴えかける情景描写を心がけてください。
3. 常に4つの選択肢を提示してください。うち3つは「論理的・王道な行動」、残り1つは「えっ、それやる！？というユニーク・ユーモア・狂気枠」。
4. プレイヤーが選択肢以外の自由なテキスト入力（無茶な行動など）をした場合、どんなカオスな行動でも、強引に物語として成立させるか、面白おかしく劇的な結果（またはゲームオーバー）へ繋げてください。
5. プレイヤーが行動ではなく「質問」をしてきた場合、ストーリーは一切進めず、状況の解説や回答のみを行ってください。回答の最後は必ず「他に確認したいことはありますか？」で締めてください。
6. 同じ設定でやり直した場合、プレイヤーが「全く同じ行動」を取った際は、可能な限り同じ展開・同じ分岐結果を返してください。

## 特別な指示：プロローグ
- 物語の開始時（「これまでの経緯」が空で、アクションが「ゲームスタート」などの場合）、プレイヤーを物語の世界へ引き込む魅力的なプロローグを描写してください。
- プロローグは、プレイヤーが置かれている状況、周囲の環境、初期の目的を明確に示すようにしてください。

## 出力フォーマット
必ず以下のJSON形式で返答してください。JSON以外のテキストは一切含めないでください。

{
  "scenario_text": "(日本語) 臨場感のある情景描写とストーリー展開",
  "status": {
    "hp": 数値（0-100）,
    "inventory": ["所持品1", "所持品2"],
    "situation": "現在の状況の簡潔な説明"
  },
  "choices": ["選択肢1", "選択肢2", "選択肢3", "狂気の選択肢4"],
  "image_prompt": "(English) Detailed image generation prompt for the current scene. Always include 'soft colored pencil and crayon drawing, calm hand-drawn sketch, storybook aesthetic' in the style.",
  "audio_prompt": "(English) Short ambient audio description for the current scene."
}`;

interface RequestBody {
    worldSetting: string;
    genreKey: string;
    action: string;
    history: { role: "user" | "assistant"; content: string }[];
    seed: number;
    turnCount: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();
        const { worldSetting, genreKey, action, history, seed, turnCount } = body;

        if (!NEXT_PUBLIC_GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "NEXT_PUBLIC_GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        // Build conversation history for context
        const conversationContext = history
            .slice(-20) // keep last 20 messages for context window
            .map(
                (h) =>
                    `${h.role === "user" ? "【プレイヤー】" : "【GM】"} ${h.content}`
            )
            .join("\n\n");

        const userPrompt = `## 舞台設定
${worldSetting}（ジャンル: ${genreKey}）

## これまでの経緯
${conversationContext || "（これがプロローグです。物語の冒頭を描写してください。）"}

## プレイヤーのアクション
${action || "ゲームスタート（プロローグを描写してください）"}

## メタ情報
- シード値: ${seed}
- ターン数: ${turnCount}

上記を踏まえて、必ずJSON形式のみで返答してください。`;

        const geminiPayload = {
            contents: [
                {
                    parts: [
                        { text: userPrompt },
                    ],
                },
            ],
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
            },
            generationConfig: {
                temperature: 0.85,
                topP: 0.92,
                topK: 40,
                maxOutputTokens: 2048,
                responseMimeType: "application/json",
                seed: seed,
            },
        };

        const geminiRes = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiPayload),
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("Gemini API error:", errText);
            return NextResponse.json(
                { error: `Gemini API returned ${geminiRes.status}` },
                { status: 502 }
            );
        }

        const geminiData = await geminiRes.json();

        // Extract the text from Gemini's response
        const rawText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse the JSON from the response
        let parsed;
        try {
            // Try direct parse first
            parsed = JSON.parse(rawText);
        } catch {
            // Try extracting JSON from markdown code block
            const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                throw new Error("Could not parse JSON from Gemini response");
            }
        }

        // Validate required fields and set defaults
        const response = {
            scenario_text: parsed.scenario_text || "物語が進行中...",
            status: {
                hp: parsed.status?.hp ?? 100,
                inventory: Array.isArray(parsed.status?.inventory)
                    ? parsed.status.inventory
                    : [],
                situation: parsed.status?.situation || "",
                ...parsed.status,
            },
            choices:
                Array.isArray(parsed.choices) && parsed.choices.length === 4
                    ? parsed.choices
                    : [
                        "周囲を調べる",
                        "先に進む",
                        "立ち止まって考える",
                        "踊り出す",
                    ],
            image_prompt: parsed.image_prompt || "",
            audio_prompt: parsed.audio_prompt || "",
        };

        return NextResponse.json(response);
    } catch (err) {
        console.error("API route error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
