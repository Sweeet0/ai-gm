"use client";

import { useState, useCallback } from "react";
import type {
    GameState,
    GeminiResponse,
    WorldConfig,
} from "@/types";
import worldConfig from "@/world_config.json";
import TypewriterText from "./TypewriterText";
import StatusPanel from "./StatusPanel";
import ActionBar from "./ActionBar";

const config = worldConfig as WorldConfig;

interface Props {
    worldSetting: string;
    genreKey: string;
    onRestart: () => void;
}

// Mock data for initial display
const MOCK_RESPONSE: GeminiResponse = {
    scenario_text:
        "あなたは薄暗い森の中で目を覚ました。\n\n頭上には古木の枝が絡み合い、わずかな月明かりが地面に斑模様を描いている。遠くで梟の鳴き声が聞こえ、湿った土の匂いが鼻をくすぐる。\n\n足元には古びた革の鞄が転がっており、中には錆びたランタンと一枚の地図が入っていた。地図には赤い印で「ここから北へ」と書かれている。\n\n北の方角から微かに光が見える。南には川のせせらぎが聞こえる。",
    status: {
        hp: 85,
        inventory: ["錆びたランタン", "古い地図", "革の鞄"],
        situation: "夜の森の中。北に微かな光、南に川の音。東の茂みが不自然に揺れている。",
    },
    choices: [
        "北の光に向かって慎重に進む",
        "川の方へ向かい、水を確保する",
        "ランタンに火を付けて周囲を確認する",
        "大声で「誰かいますかー！」と叫ぶ",
    ],
    image_prompt:
        "A dark mysterious forest at night, moonlight filtering through ancient tree branches, a worn leather bag on the ground with a rusty lantern and old map, soft colored pencil and crayon drawing style, storybook aesthetic",
    audio_prompt:
        "Mysterious forest ambience at night, owl hooting, gentle wind, distant river sound",
};

export default function GameInterface({
    worldSetting,
    genreKey,
    onRestart,
}: Props) {
    const genreConfig = config.genres[genreKey] || config.genres.fantasy;

    const [gameState, setGameState] = useState<GameState>({
        phase: "playing",
        worldSetting,
        genreKey,
        history: [],
        currentResponse: MOCK_RESPONSE,
        seed: Math.floor(Math.random() * 1000000),
        turnCount: 0,
        isLoading: false,
        error: null,
    });

    const [typingComplete, setTypingComplete] = useState(false);

    const sendAction = useCallback(
        async (action: string) => {
            setGameState((prev) => ({
                ...prev,
                isLoading: true,
                error: null,
                history: [
                    ...prev.history,
                    { role: "user" as const, content: action },
                    ...(prev.currentResponse
                        ? [
                            {
                                role: "assistant" as const,
                                content: prev.currentResponse.scenario_text,
                            },
                        ]
                        : []),
                ],
            }));
            setTypingComplete(false);

            try {
                const res = await fetch("/api/gemini", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        worldSetting,
                        genreKey,
                        action,
                        history: gameState.history,
                        seed: gameState.seed,
                        turnCount: gameState.turnCount + 1,
                    }),
                });

                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }

                const data: GeminiResponse = await res.json();

                setGameState((prev) => ({
                    ...prev,
                    currentResponse: data,
                    turnCount: prev.turnCount + 1,
                    isLoading: false,
                }));
            } catch (err) {
                // On error, use mock data so the UI remains functional
                console.error("API call failed, using mock response:", err);
                setGameState((prev) => ({
                    ...prev,
                    currentResponse: MOCK_RESPONSE,
                    turnCount: prev.turnCount + 1,
                    isLoading: false,
                    error: "APIに接続できませんでした。モックデータを表示しています。",
                }));
            }
        },
        [worldSetting, genreKey, gameState.history, gameState.seed, gameState.turnCount]
    );

    const handleChoice = (choice: string) => {
        sendAction(choice);
    };

    const handleFreeInput = (text: string) => {
        sendAction(text);
    };

    const response = gameState.currentResponse;

    return (
        <div className="min-h-screen p-3 sm:p-6">
            {/* Top bar */}
            <header className="max-w-6xl mx-auto flex items-center justify-between mb-4">
                <h1 className="title-handwritten text-xl sm:text-2xl">
                    📖 GEM Engine
                </h1>
                <div className="flex items-center gap-3">
                    <span className="badge-sketch text-xs">
                        🎭 {genreConfig.label}
                    </span>
                    <span className="badge-sketch text-xs">
                        ターン {gameState.turnCount}
                    </span>
                    <button className="btn-sketch text-xs" onClick={onRestart}>
                        🔄 最初から
                    </button>
                </div>
            </header>

            {/* Error banner */}
            {gameState.error && (
                <div
                    className="max-w-6xl mx-auto mb-4 p-3 text-sm animate-fade-in-up"
                    style={{
                        background: "rgba(192, 96, 64, 0.1)",
                        border: "1px dashed var(--color-accent)",
                        borderRadius: "var(--radius-rough)",
                        color: "var(--color-accent)",
                    }}
                >
                    ⚠️ {gameState.error}
                </div>
            )}

            {/* Main grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left column: Visual + Stats */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    {/* Image canvas */}
                    <div className="frame-sketch animate-fade-in-up">
                        <div
                            className="w-full aspect-square flex items-center justify-center"
                            style={{
                                background:
                                    "linear-gradient(135deg, var(--color-parchment-dark), var(--color-canvas-bg))",
                                borderRadius: "4px",
                            }}
                        >
                            <div className="text-center p-4">
                                <span className="text-4xl mb-2 block animate-wobble">🎨</span>
                                <p
                                    className="text-xs italic"
                                    style={{ color: "var(--color-pencil-soft)" }}
                                >
                                    {response?.image_prompt
                                        ? "Image prompt ready"
                                        : "画像生成待ち..."}
                                </p>
                                {response?.image_prompt && (
                                    <p
                                        className="text-xs mt-2"
                                        style={{
                                            color: "var(--color-pencil-gray)",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        &quot;{response.image_prompt.slice(0, 80)}...&quot;
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status panel */}
                    {response && (
                        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                            <StatusPanel
                                status={response.status}
                                genreConfig={genreConfig}
                            />
                        </div>
                    )}

                    {/* Audio prompt badge */}
                    {response?.audio_prompt && (
                        <div
                            className="badge-sketch text-xs animate-fade-in-up"
                            style={{ animationDelay: "0.15s" }}
                        >
                            🎵 {response.audio_prompt.slice(0, 60)}...
                        </div>
                    )}
                </div>

                {/* Right column: Narrative + Actions */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* World setting banner */}
                    <div
                        className="card-sketch p-3 text-sm animate-fade-in-up"
                        style={{ animationDelay: "0.05s" }}
                    >
                        <span className="font-bold">🌍 舞台：</span>
                        <span style={{ color: "var(--color-ink-light)" }}>
                            {worldSetting}
                        </span>
                    </div>

                    {/* Narrative log */}
                    <div
                        className="card-sketch p-5 sm:p-6 flex-1 min-h-[200px] animate-fade-in-up"
                        style={{ animationDelay: "0.1s" }}
                    >
                        <h3
                            className="title-handwritten text-lg mb-3"
                            style={{ color: "var(--color-accent)" }}
                        >
                            📜 物語
                        </h3>

                        {gameState.isLoading ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-pulse-gentle text-xl">✍️</span>
                                <span
                                    className="text-sm italic"
                                    style={{ color: "var(--color-pencil-soft)" }}
                                >
                                    GMが物語を紡いでいます...
                                </span>
                            </div>
                        ) : response ? (
                            <div
                                className="leading-relaxed text-sm sm:text-base"
                                style={{ whiteSpace: "pre-wrap" }}
                            >
                                <TypewriterText
                                    text={response.scenario_text}
                                    speed={25}
                                    onComplete={() => setTypingComplete(true)}
                                />
                            </div>
                        ) : (
                            <p
                                className="text-sm italic"
                                style={{ color: "var(--color-pencil-soft)" }}
                            >
                                冒険が始まるのを待っています...
                            </p>
                        )}
                    </div>

                    {/* Action bar */}
                    {response && (
                        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                            <ActionBar
                                choices={response.choices}
                                onChoiceSelect={handleChoice}
                                onFreeInput={handleFreeInput}
                                disabled={gameState.isLoading || !typingComplete}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
