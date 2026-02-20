"use client";

import { useState } from "react";
import type { WorldConfig, StartMethod } from "@/types";
import worldConfig from "@/world_config.json";

const config = worldConfig as WorldConfig;
const genreEntries = Object.entries(config.genres);

interface Props {
    onStart: (setting: string, genreKey: string) => void;
}

export default function GenreSelect({ onStart }: Props) {
    const [method, setMethod] = useState<StartMethod | null>(null);
    const [customText, setCustomText] = useState("");
    const [candidates, setCandidates] = useState<
        { setting: string; genreKey: string }[]
    >([]);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

    // Generate 3 random candidate settings from different genres
    const generateCandidates = () => {
        const shuffled = [...genreEntries].sort(() => Math.random() - 0.5);
        const picks = shuffled.slice(0, 3).map(([key, genre]) => {
            const setting =
                genre.sampleSettings[
                Math.floor(Math.random() * genre.sampleSettings.length)
                ];
            return { setting, genreKey: key };
        });
        setCandidates(picks);
    };

    // "おまかせ" mode — pick one at random and force start
    const handleRandom = () => {
        const [key, genre] =
            genreEntries[Math.floor(Math.random() * genreEntries.length)];
        const setting =
            genre.sampleSettings[
            Math.floor(Math.random() * genre.sampleSettings.length)
            ];
        onStart(setting, key);
    };

    // Back to main method selection
    const handleBack = () => {
        setMethod(null);
        setCandidates([]);
        setSelectedGenre(null);
        setCustomText("");
    };

    /* ─── Render: Method Selection ─── */
    if (!method) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="card-sketch p-8 sm:p-12 max-w-lg w-full animate-fade-in-up text-center">
                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="title-handwritten text-3xl sm:text-4xl mb-2">
                            📖 GEM Engine
                        </h1>
                        <p className="text-sm" style={{ color: "var(--color-ink-light)" }}>
                            対話型アドベンチャーへようこそ
                        </p>
                    </div>

                    <hr className="divider-sketch" />

                    <p
                        className="mb-6 text-base"
                        style={{ color: "var(--color-ink-light)" }}
                    >
                        冒険の舞台を決めましょう。方法を選んでください。
                    </p>

                    <div className="flex flex-col gap-4 stagger-children">
                        <button
                            className="btn-sketch animate-fade-in-up text-lg"
                            onClick={() => setMethod("custom")}
                        >
                            ✏️ 指定 — 自分で舞台を決める
                        </button>
                        <button
                            className="btn-sketch animate-fade-in-up text-lg"
                            onClick={() => {
                                setMethod("candidates");
                                generateCandidates();
                            }}
                        >
                            🎲 候補 — ランダムな舞台から選ぶ
                        </button>
                        <button
                            className="btn-sketch btn-sketch-primary animate-fade-in-up text-lg"
                            onClick={handleRandom}
                        >
                            🌟 おまかせ — GMにすべて任せる！
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ─── Render: Custom Input ─── */
    if (method === "custom") {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="card-sketch p-8 sm:p-10 max-w-lg w-full animate-fade-in-up">
                    <h2 className="title-handwritten text-2xl mb-2 text-center">
                        ✏️ 舞台を入力してください
                    </h2>
                    <p
                        className="text-sm mb-6 text-center"
                        style={{ color: "var(--color-ink-light)" }}
                    >
                        世界観やジャンルを自由に書いてください
                    </p>

                    {/* Genre tag hints */}
                    <div className="flex flex-wrap gap-2 mb-4 justify-center">
                        {genreEntries.map(([key, genre]) => (
                            <button
                                key={key}
                                className={`badge-sketch cursor-pointer transition-all ${selectedGenre === key
                                        ? "border-[var(--color-accent)] bg-[var(--color-parchment-dark)]"
                                        : ""
                                    }`}
                                onClick={() => {
                                    setSelectedGenre(key);
                                    if (!customText) {
                                        setCustomText(
                                            genre.sampleSettings[
                                            Math.floor(
                                                Math.random() * genre.sampleSettings.length
                                            )
                                            ]
                                        );
                                    }
                                }}
                            >
                                {genre.label}
                            </button>
                        ))}
                    </div>

                    <textarea
                        className="input-sketch w-full mb-4 resize-none"
                        rows={3}
                        placeholder="例：サイバーパンクな未来の東京で探偵をする"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                    />

                    <div className="flex gap-3 justify-center">
                        <button className="btn-sketch" onClick={handleBack}>
                            ← 戻る
                        </button>
                        <button
                            className="btn-sketch btn-sketch-primary"
                            disabled={!customText.trim()}
                            onClick={() => {
                                const genre = selectedGenre || "fantasy";
                                onStart(customText.trim(), genre);
                            }}
                            style={{
                                opacity: customText.trim() ? 1 : 0.5,
                                cursor: customText.trim() ? "pointer" : "not-allowed",
                            }}
                        >
                            冒険を始める →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ─── Render: Candidates ─── */
    if (method === "candidates") {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="card-sketch p-8 sm:p-10 max-w-lg w-full animate-fade-in-up">
                    <h2 className="title-handwritten text-2xl mb-2 text-center">
                        🎲 冒険の候補
                    </h2>
                    <p
                        className="text-sm mb-6 text-center"
                        style={{ color: "var(--color-ink-light)" }}
                    >
                        3つの舞台設定から1つ選んでください
                    </p>

                    <div className="flex flex-col gap-3 mb-6 stagger-children">
                        {candidates.map((c, i) => (
                            <button
                                key={i}
                                className="btn-sketch text-left animate-fade-in-up w-full"
                                onClick={() => onStart(c.setting, c.genreKey)}
                            >
                                <span className="font-bold mr-2">
                                    {config.genres[c.genreKey]?.label}
                                </span>
                                <br />
                                <span
                                    className="text-sm"
                                    style={{ color: "var(--color-ink-light)" }}
                                >
                                    {c.setting}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button className="btn-sketch" onClick={handleBack}>
                            ← 戻る
                        </button>
                        <button
                            className="btn-sketch"
                            onClick={generateCandidates}
                        >
                            🔄 やり直し
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
