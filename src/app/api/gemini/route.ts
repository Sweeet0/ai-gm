import { NextRequest, NextResponse } from "next/server";

const NEXT_PUBLIC_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${NEXT_PUBLIC_GEMINI_API_KEY}`;
console.log("Requesting URL:", GEMINI_URL);

const SYSTEM_PROMPT = `あなたは対話型ゲームマスター（GM）です。プレイヤーの選択と想像力を尊重し、没入感のある最高のゲーム体験を提供してください。

## ルール
1. 毎ターン、プレイヤーのアクションを受け取り、物語を進行させてください。
2. 臨場感があり、五感に訴えかける情景描写を心がけてください。
3. 常に4つの選択肢を提示してください。
4. プレイヤーが選択肢以外の自由なテキスト入力（無茶な行動など）をした場合、どんな行動でも、物語として成立させるか、面白おかしく劇的な結果（またはゲームオーバー）へ繋げてください。
5. プレイヤーが行動ではなく「質問」をしてきた場合、ストーリーは一切進めず、状況の解説や回答のみを行ってください。回答の最後は必ず「他に確認したいことはありますか？」で締めてください。
6. 同じ設定でやり直した場合、プレイヤーが「全く同じ行動」を取った際は、可能な限り同じ展開・同じ分岐結果を返してください。

## 特別な指示：プロローグ
- 物語の開始時（「これまでの経緯」が空で、アクションが空または「ゲームスタート」などの場合）、プレイヤーを物語の世界へ引き込む魅力的なプロローグを描写してください。
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
  "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "image_prompt": "(English) Detailed image generation prompt for the current scene. Always include 'soft colored pencil and crayon drawing, calm hand-drawn sketch, storybook aesthetic' in the style.",
  "audio_prompt": "(English) Short ambient audio description for the current scene."
}`;

export async function POST(req: NextRequest) {
    try {
        const { worldSetting, genreKey, action, history, seed, turnCount } = await req.json();

        const historyPrompt = history
            .map((h: any) => `${h.role === "user" ? "Player" : "GM"}: ${h.content}`)
            .join("\n");

        const userPrompt = `
WORLD SETTING: ${worldSetting}
GENRE: ${genreKey}
TURN COUNT: ${turnCount}
PREVIOUS HISTORY:
${historyPrompt}

PLAYER ACTION: ${action || "ゲームスタート"}

上記を踏まえ、物語の次の展開を生成してください。必ずJSON形式で出力してください。
`;

        const geminiRes = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json",
                    seed: seed,
                },
            }),
        });

        if (!geminiRes.ok) {
            if (geminiRes.status === 429) {
                return NextResponse.json(
                    { error: "クォータ制限（回数制限）に達しました。少し時間を置いて（約1分後）再度お試しください。" },
                    { status: 429 }
                );
            }
            return NextResponse.json(
                { error: `Gemini API returned ${geminiRes.status}` },
                { status: 502 }
            );
        }

        const rawData = await geminiRes.json();
        const text = rawData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No response text from Gemini");
        }

        // Robust JSON extraction
        let jsonStr = text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        try {
            const data = JSON.parse(jsonStr);
            return NextResponse.json(data);
        } catch (parseError) {
            console.error("JSON parse error. Raw text:", text);
            return NextResponse.json(
                { error: "AIからの応答を正しく解析できませんでした。もう一度試してください。" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "サーバーでエラーが発生しました。" },
            { status: 500 }
        );
    }
}
