"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GameState, GeminiResponse, GenreConfig, WorldConfig } from "@/types/game";
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

export default function GameInterface({
    worldSetting,
    genreKey,
    onRestart,
}: Props) {
    const genreConfig: GenreConfig = config.genres[genreKey] || config.genres.fantasy;

    const [gameState, setGameState] = useState<GameState>(() => {
        // Hydrate from localStorage if available
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("gem-engine-save");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Check if the world/genre matches the current selection to decide whether to resume
                    if (parsed.worldSetting === worldSetting && parsed.genreKey === genreKey) {
                        return {
                            ...parsed,
                            isLoading: false,
                            error: null
                        };
                    }
                } catch (e) {
                    console.error("Failed to load save data:", e);
                }
            }
        }
        return {
            phase: "playing",
            worldSetting,
            genreKey,
            history: [],
            currentResponse: null,
            seed: Math.floor(Math.random() * 1000000),
            turnCount: 0,
            isLoading: false,
            error: null,
        };
    });

    const [typingComplete, setTypingComplete] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const initialized = useRef(false);

    // Persistence: Save on changes
    useEffect(() => {
        const { isLoading, error, ...toSave } = gameState;
        localStorage.setItem("gem-engine-save", JSON.stringify(toSave));
    }, [gameState]);

    const sendAction = useCallback(
        async (action: string) => {
            setGameState((prev) => ({
                ...prev,
                isLoading: true,
                error: null,
            }));
            setTypingComplete(false);
            setPendingAction(action);

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
                        turnCount: gameState.turnCount + (action ? 1 : 0),
                    }),
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `API error: ${res.status}`);
                }

                const data: GeminiResponse = await res.json();

                setGameState((prev) => ({
                    ...prev,
                    currentResponse: data,
                    turnCount: prev.turnCount + (action ? 1 : 0),
                    isLoading: false,
                    history: [
                        ...prev.history,
                        ...(action ? [{ role: "user" as const, content: action }] : []),
                        { role: "assistant" as const, content: data.scenario_text },
                    ],
                }));
                setPendingAction(null);

                // Start fetching multimedia in the background
                fetchMultimedia(data);
            } catch (err) {
                console.error("API call failed:", err);
                setGameState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: err instanceof Error ? err.message : "APIに接続できませんでした。もう一度試してください。",
                }));
            }
        },
        [worldSetting, genreKey, gameState.history, gameState.seed, gameState.turnCount]
    );

    const handleRestartGame = useCallback(() => {
        setGameState((prev) => ({
            ...prev,
            history: [],
            currentResponse: null,
            turnCount: 0,
            isDeepDiveMode: false,
            isLoading: false,
            error: null,
        }));
        setTypingComplete(false);
        initialized.current = false;
        // Trigger initialization again
    }, []);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchMultimedia = useCallback(async (data: GeminiResponse) => {
        // Fetch Image
        if (data.imagePrompt) {
            try {
                const imgRes = await fetch("/api/image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: data.imagePrompt }),
                });
                if (imgRes.ok) {
                    const blob = await imgRes.blob();
                    const imageUrl = URL.createObjectURL(blob);

                    setGameState(prev => {
                        if (prev.currentResponse?.scenario_text === data.scenario_text) {
                            return {
                                ...prev,
                                currentResponse: { ...prev.currentResponse!, imageUrl }
                            };
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch image:", err);
            }
        }

        // Fetch Audio
        if (data.audio_prompt) {
            try {
                const audioRes = await fetch("/api/audio", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: data.audio_prompt }),
                });
                if (audioRes.ok) {
                    const audioData = await audioRes.json();
                    setGameState(prev => {
                        if (prev.currentResponse?.scenario_text === data.scenario_text) {
                            return {
                                ...prev,
                                currentResponse: { ...prev.currentResponse!, audioUrl: audioData.audioUrl }
                            };
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch audio:", err);
            }
        }
    }, []);

    const handleEnterDeepDive = useCallback(() => {
        setGameState(prev => ({ ...prev, isDeepDiveMode: true }));
        sendAction("裏話を聞く");
    }, [sendAction]);

    const handleExitDeepDive = useCallback(() => {
        setGameState(prev => ({ ...prev, isDeepDiveMode: false }));
    }, []);

    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            // Only fetch prologue if we don't have a history yet (new game)
            if (gameState.history.length === 0) {
                sendAction("");
            } else {
                setTypingComplete(true);
            }
        }
    }, [sendAction, gameState.history.length, gameState.currentResponse]); // Added currentResponse to trigger correctly on reset

    const handleTypewriterComplete = useCallback(() => {
        setTypingComplete(true);
    }, []);

    const handleChoice = (choice: string) => {
        sendAction(choice);
    };

    const handleFreeInput = (text: string) => {
        sendAction(text);
    };

    const [bgmEnabled, setBgmEnabled] = useState(true);

    const response = gameState.currentResponse;

    // Audio playback control
    useEffect(() => {
        if (!audioRef.current) return;

        if (bgmEnabled && response?.audioUrl) {
            audioRef.current.play().catch(e => console.warn("Auto-play blocked or audio failed:", e));
        } else {
            audioRef.current.pause();
        }
    }, [bgmEnabled, response?.audioUrl]);

    return (
        <div className="fixed-viewport flex flex-col p-3 sm:p-6 bg-parchment">
            {/* Top bar */}
            <header className="flex-none max-w-6xl w-full mx-auto flex items-center justify-between mb-4">
                <h1 className="title-handwritten text-xl sm:text-2xl">
                    📖 GEM Engine
                </h1>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        className="btn-sketch text-xs"
                        onClick={() => setShowHistory(true)}
                    >
                        📜 履歴
                    </button>
                    <button
                        className={`btn-sketch p-2 rounded-full flex items-center justify-center transition-all ${bgmEnabled ? 'text-accent' : 'opacity-40'}`}
                        onClick={() => setBgmEnabled(!bgmEnabled)}
                        title={bgmEnabled ? "BGM ON" : "BGM OFF"}
                    >
                        {bgmEnabled ? "🎵" : "🔇"}
                    </button>
                    <span className="badge-sketch text-xs hidden sm:inline-flex">
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
            <div className="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                {/* Left column: Visual + Stats */}
                <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
                    {/* Image canvas */}
                    <div className="frame-sketch animate-fade-in-up">
                        <div
                            className="w-full aspect-square flex items-center justify-center overflow-hidden relative"
                            style={{
                                background: "linear-gradient(135deg, var(--color-parchment-dark), var(--color-canvas-bg))",
                                borderRadius: "4px",
                            }}
                        >
                            {response?.imageUrl ? (
                                <img
                                    src={response.imageUrl}
                                    alt={response.imagePrompt}
                                    className="w-full h-full object-cover animate-fade-in"
                                />
                            ) : (
                                <div className="text-center p-4">
                                    <span className="text-4xl mb-2 block animate-wobble">
                                        {response?.imagePrompt ? "🎨" : "🖼️"}
                                    </span>
                                    <p className="text-xs italic" style={{ color: "var(--color-pencil-soft)" }}>
                                        {response?.imagePrompt ? "AIが情景を描いています..." : "冒メントの始まりを待っています..."}
                                    </p>
                                    {response?.imagePrompt && (
                                        <div className="mt-3 flex justify-center">
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0s" }}></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hidden Audio Element */}
                    <audio
                        ref={audioRef}
                        src={response?.audioUrl}
                        loop
                        className="hidden"
                    />

                    {/* Status panel */}
                    {response && (
                        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                            <StatusPanel status={response.status} genreConfig={genreConfig} />
                        </div>
                    )}
                </div>

                {/* Right column: Narrative + Actions */}
                <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
                    <div className="card-sketch p-3 text-sm animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                        <span className="font-bold">🌍 舞台：</span>
                        <span style={{ color: "var(--color-ink-light)" }}>{worldSetting}</span>
                    </div>

                    <div
                        className="card-sketch p-5 sm:p-6 flex-1 flex flex-col animate-fade-in-up min-h-0 transition-colors duration-500"
                        style={{
                            animationDelay: "0.1s",
                            backgroundColor: response?.is_question ? "var(--color-question-bg)" : "var(--color-canvas-bg)",
                            borderColor: response?.is_question ? "var(--color-question-border)" : "var(--border-sketch)"
                        }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="title-handwritten text-lg" style={{ color: "var(--color-accent)" }}>
                                📜 物語
                            </h3>
                            {response?.is_ending && (
                                <span className="badge-sketch text-xs bg-amber-500/20 border-amber-500/50 text-amber-600 animate-bounce-gentle">
                                    🏆 物語の結末
                                </span>
                            )}
                            {gameState.isDeepDiveMode && (
                                <span className="badge-sketch text-xs bg-purple-500/20 border-purple-500/50 text-purple-600 animate-pulse-gentle">
                                    🕵️ 裏話モード
                                </span>
                            )}
                            {response?.is_question && !response.is_ending && !gameState.isDeepDiveMode && (
                                <span className="badge-sketch text-xs bg-accent/10 border-accent/40 text-accent animate-pulse-gentle">
                                    💡 質問回答モード
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
                            <div className="narrative-content-wrapper min-h-full">
                                {response?.isBackup && (
                                    <div className="mb-4 p-3 bg-amber-900/40 border border-amber-500/50 rounded-lg text-xs flex gap-2 animate-pulse-gentle">
                                        <span>⚠️</span>
                                        <span>
                                            メインモデルの制限によりバックアップモデル（{response.modelName}）を使用しています。
                                            一時的に物語の精度や整合性が低下する可能性があります。
                                        </span>
                                    </div>
                                )}

                                {!response && !gameState.isLoading && !gameState.error && (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                        <span className="text-4xl mb-4">✍️</span>
                                        <p className="title-handwritten text-lg">物語の断片を読み込んでいます...</p>
                                    </div>
                                )}

                                {gameState.isLoading && !response ? (
                                    <div className="flex items-center gap-2">
                                        <span className="animate-pulse-gentle text-xl">✍️</span>
                                        <span className="text-sm italic" style={{ color: "var(--color-pencil-soft)" }}>
                                            GMが物語を紡いでいます...
                                        </span>
                                    </div>
                                ) : response ? (
                                    <div className="leading-relaxed text-sm sm:text-base" style={{ whiteSpace: "pre-wrap" }}>
                                        <TypewriterText
                                            text={response.scenario_text}
                                            speed={25}
                                            onComplete={handleTypewriterComplete}
                                            skipAnimation={typingComplete}
                                        />

                                        {pendingAction && gameState.isLoading && (
                                            <div className="mt-6 animate-fade-in-up">
                                                <div className="story-log-action">{pendingAction}</div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="animate-pulse-gentle text-lg">✍️</span>
                                                    <span className="text-xs italic opacity-50">GMが次の展開を執筆中...</span>
                                                </div>
                                            </div>
                                        )}

                                        {bgmEnabled && response.audio_prompt && !gameState.isLoading && (
                                            <div className="mt-4 text-xs italic opacity-40 flex items-center gap-2">
                                                <span>🎵</span>
                                                <span>{response.audio_prompt}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm italic" style={{ color: "var(--color-pencil-soft)" }}>
                                        冒険が始まるのを待っています...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {response && (
                        <div className="flex-none animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                            {response.is_ending && !gameState.isDeepDiveMode ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        onClick={handleEnterDeepDive}
                                        disabled={gameState.isLoading || !typingComplete}
                                        className="btn-action-sketch min-h-[50px] text-sm animate-bounce-gentle"
                                        style={{ "--color-btn": "#c06040" } as any}
                                    >
                                        A. 裏話を聞く
                                    </button>
                                    <button
                                        onClick={handleRestartGame}
                                        disabled={gameState.isLoading || !typingComplete}
                                        className="btn-action-sketch min-h-[50px] text-sm"
                                    >
                                        B. 最初からやり直す
                                    </button>
                                    <button
                                        onClick={onRestart}
                                        disabled={gameState.isLoading || !typingComplete}
                                        className="btn-action-sketch min-h-[50px] text-sm"
                                    >
                                        C. 次の話へ
                                    </button>
                                </div>
                            ) : gameState.isDeepDiveMode ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleChoice("舞台設定について教えてください")}
                                        disabled={gameState.isLoading || !typingComplete}
                                        className="btn-action-sketch min-h-[44px] text-sm"
                                    >
                                        🔍 舞台設定
                                    </button>
                                    <button
                                        onClick={() => handleChoice("他の選択肢の結果を教えてください")}
                                        disabled={gameState.isLoading || !typingComplete}
                                        className="btn-action-sketch min-h-[44px] text-sm"
                                    >
                                        🔮 他の分岐
                                    </button>
                                    <button
                                        onClick={() => handleChoice("没設定や逆提案はありますか？")}
                                        disabled={gameState.isLoading || !typingComplete}
                                        className="btn-action-sketch min-h-[44px] text-sm"
                                    >
                                        💡 没設定
                                    </button>
                                    <button
                                        onClick={handleExitDeepDive}
                                        disabled={gameState.isLoading || !typingComplete}
                                        className="btn-action-sketch min-h-[44px] text-sm border-accent/20 text-accent"
                                    >
                                        ⬅️ 裏話を終わる
                                    </button>
                                </div>
                            ) : (
                                <ActionBar
                                    choices={response.choices}
                                    onChoiceSelect={handleChoice}
                                    onFreeInput={handleFreeInput}
                                    disabled={gameState.isLoading || !typingComplete}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="card-sketch w-full max-w-2xl max-h-[80vh] flex flex-col p-6 overflow-hidden animate-fade-in-up">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="title-handwritten text-2xl" style={{ color: "var(--color-accent)" }}>
                                📜 冒険の記録
                            </h2>
                            <button className="btn-sketch p-2 rounded-full" onClick={() => setShowHistory(false)}>
                                ❌
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {gameState.history.length === 0 ? (
                                <p className="text-center italic opacity-50 py-10">まだ物語の記録はありません。</p>
                            ) : (
                                gameState.history.map((entry, i) => (
                                    <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                                        {entry.role === "user" ? (
                                            <div className="flex justify-end pr-2">
                                                <div className="story-log-action">{entry.content}</div>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-black/10 rounded-lg border-l-4 border-accent/30 text-sm leading-relaxed whitespace-pre-wrap">
                                                {entry.content}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
