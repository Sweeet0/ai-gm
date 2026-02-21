import { NextRequest, NextResponse } from "next/server";
import worldConfig from "@/world_config.json";

const NEXT_PUBLIC_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `あなたはTRPGの熟練ゲームマスターであり、世界観のクリエイターです。
要求されたジャンルに基づき、魅力的なゲームの舞台設定（候補）を生成してください。

## 出力フォーマットの厳守
必ず以下のJSONスキーマ（配列形式）で出力してください。Markdownのコードブロック記法（\`\`\`json など）は**一切含めず**、純粋なJSON文字列のみを返してください。配列の要素数は必ず3つにしてください。

[
  {
    "genreKey": "システムが要求したジャンルキー（例: fantasy, scifi 等。そのまま返すこと）",
    "label": "[ジャンル：世界観を表す魅力的なタイトル]（「ジャンル」の部分は必ず以下から選択してください：ファンタジー, SF・宇宙, ホラー, 現代・日常, 終末世界, 歴史・ウェスタン, 東洋）",
    "stats": {
      "hp": {
        "label": "体力や生命力に相当するラベル（自由に生成。）",
        "icon": "❤️など適切な絵文字",
        "max": 100
      },
      "custom_stat": {
        "label": "ジャンル特有の特殊ステータス（自由に生成。例: 魔力、正気度、評判、燃料など）",
        "icon": "✨など適切な絵文字",
        "max": 100
      }
    },
    "situationLabel": "現在の状況を表すラベル（自由に生成。例: 『現在の任務』『サバイバル状況』）",
    "inventoryLabel": "持ち物を表すラベル（自由に生成。例: 『所持品』『装備・デバイス』）",
    "keywords": ["象徴的なキーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"],
    "imageStyleSuffix": "背景画像生成用の英語フレーズ。人物を含めず風景や雰囲気に特化（例: 'mystical foggy forest with ancient ruins, overgrown vines, no character') ",
    "sampleSettings": [
      "プレイヤーがその世界に引き込まれるような、具体的で魅力的な導入文。30文字以内"
    ]
  }
]
`;

export async function POST(req: NextRequest) {
    try {
        const { selectedGenres } = await req.json();

        if (!selectedGenres || !Array.isArray(selectedGenres) || selectedGenres.length !== 3) {
            return NextResponse.json({ error: "Invalid selectedGenres array" }, { status: 400 });
        }

        const userPrompt = `
以下の3つのジャンルについて、それぞれ独自の舞台設定を生成してください。
パラメータで指定されたジャンルキーに対応する設定を作成し、JSONの配列として出力してください。

対象ジャンル:
1. ${selectedGenres[0]}
2. ${selectedGenres[1]}
3. ${selectedGenres[2]}

各要素について、第1ステータス（hp）は0でゲームオーバーになるものとし、第2ステータスはジャンル特有の魅力を引き出すものを設定してください。
sampleSettingsには、その舞台の始まりとなる具体的な導入文を1件だけ記述してください。
`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${NEXT_PUBLIC_GEMINI_API_KEY}`;

        // Simple fetch payload matching the recently debugged working format
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                generationConfig: {
                    temperature: 0.8,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json",
                },
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Gemini API Error (Candidates):", errorText);
            return NextResponse.json(
                { error: `Gemini API Error: ${res.status}` },
                { status: res.status }
            );
        }

        const rawData = await res.json();
        const text = rawData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return NextResponse.json({ error: "Empty response from Gemini" }, { status: 500 });
        }

        let jsonStr = text.trim();
        const jsonMatch = text.match(/\\[\s\S]*\\]/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        try {
            const data = JSON.parse(jsonStr);
            return NextResponse.json(data);
        } catch (parseError) {
            console.error("Failed to parse Gemini candidates JSON:", text);
            return NextResponse.json({ error: "Failed to parse API response" }, { status: 500 });
        }

    } catch (error) {
        console.error("Candidate Generation Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
