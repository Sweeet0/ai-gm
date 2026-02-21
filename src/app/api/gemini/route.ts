import { NextRequest, NextResponse } from "next/server";

const NEXT_PUBLIC_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const MODEL_HIERARCHY = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
];

const BACKUP_HIERARCHY = [
    "gemma-3-27b-it",
    "gemma-3-12b-it",
];

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

## 特別な指示：エンディング（クリア / ゲームオーバー）
- 物語が完結した際（目的達成、または絶望的な状況での敗北など）、必ずJSONの "is_ending" を true に設定してください。
- 完結した際の物語描写は、これまでの旅を締めくくるにふさわしい劇的で感動的、あるいは衝撃的な内容にしてください。

## 特別な指示：裏話モード（DEEP DIVE）
- プレイヤーが「裏話を聞く」を選択、または「舞台設定」「他の選択肢の結果」「逆提案（没設定）」などについて聞いてきた場合、ゲームマスターの立場を離れ、「物語の製作者・解説者」として対話してください。
- **舞台設定**: 物語の全体像や、隠された背景設定、AIが想定していたロアなどを詳しく解説してください。
- **他の選択肢の結果**: 過去の分岐を振り返るリクエストがあった場合、最初から1つずつ「この時〇〇を選んでいたらこうなっていた」という結果や影響を解説してください。解説の最後には必ず「次の分岐へ」「裏話メニューに戻る」を選択肢として含めてください。
- **逆提案（没設定）**: 「実はあのキャラにはこんな没設定が…」といった、生成過程で使われなかった面白いアイデアを熱っぽく語ってください。解説の最後には必ず「聞く」「別の提案」「裏話メニューに戻る」を選択肢として含めてください。
- 裏話モードでは物語は進めず、出力フォーマットは通常と同じJSONを維持してください。

## 出力フォーマット
必ず以下のJSON形式で返答してください。JSON以外のテキストは一切含めないでください。

{
  "scenario_text": "(日本語) 臨場感のある情景描写とストーリー展開、または解説文",
  "status": {
    "hp": 数値（0-100）,
    "inventory": ["所持品1", "所持品2"],
    "situation": "現在の状況の簡潔な説明"
  },
  "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "is_question": プレイヤーが質問をした場合はtrue、
  "is_ending": 物語が完結（クリア、ゲームオーバー）した場合はtrue、
  "visualSummary": "(English) Specific nouns describing the scene's key objects/locations for a Kamishibai (picture story show) style image. Examples: 'Old stone bridge, blooming flowers' or 'Spooky castle, dark clouds, lightning'.",
  "imagePrompt": "(English) Detailed image generation prompt for the current scene.",
  "audio_prompt": "(English) Short ambient audio description."
} `;

async function callModel(model: string, userPrompt: string, seed: number) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${NEXT_PUBLIC_GEMINI_API_KEY}`;

    const res = await fetch(url, {
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
            },
        }),
    });
    return res;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { worldSetting, genreKey, action, history, seed, turnCount } = body;

        const historyPrompt = Array.isArray(history) ? history
            .map((h: any) => `${h.role === "user" ? "Player" : "GM"}: ${h.content}`)
            .join("\n") : "";

        const userPrompt = `
WORLD SETTING: ${worldSetting || ""}
GENRE: ${genreKey || ""}
TURN COUNT: ${turnCount || 0}
PREVIOUS HISTORY:
${historyPrompt}

PLAYER ACTION: ${action || "ゲームスタート"}

上記を踏まえ、物語の次の展開（または終了、または裏話の回答）を生成してください。必ずJSON形式で出力してください。
`;

        const allModels = [...MODEL_HIERARCHY, ...BACKUP_HIERARCHY];

        for (const model of allModels) {
            console.log(`Trying model: ${model}`);
            const geminiRes = await callModel(model, userPrompt, seed || Math.floor(Math.random() * 1000000));

            if (geminiRes.status === 429) {
                console.warn(`Quota exceeded for ${model}. Trying next...`);
                continue;
            }

            if (!geminiRes.ok) {
                const errorText = await geminiRes.text();
                console.error(`Gemini API Error for ${model}:`, errorText);
                return NextResponse.json(
                    { error: `Model ${model} returned error ${geminiRes.status}` },
                    { status: geminiRes.status }
                );
            }

            const rawData = await geminiRes.json();
            const text = rawData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                console.error(`Empty response from ${model}`);
                continue;
            }

            let jsonStr = text.trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonStr = jsonMatch[0];

            try {
                const data = JSON.parse(jsonStr);
                const isBackup = BACKUP_HIERARCHY.includes(model);
                return NextResponse.json({
                    ...data,
                    modelName: model,
                    isBackup: isBackup,
                });
            } catch (parseError) {
                console.error(`JSON parse error from ${model}. Raw text:`, text);
                continue;
            }
        }

        return NextResponse.json(
            { error: "クォータ制限（回数制限）により全モデルが利用不可です。時間を空けて再度お試しください。" },
            { status: 429 }
        );

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "サーバーでエラーが発生しました。" },
            { status: 500 }
        );
    }
}
