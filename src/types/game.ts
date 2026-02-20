// Type definitions for the GEM Engine

export interface GameStatus {
    hp: number;
    inventory: string[];
    situation: string;
    [key: string]: unknown; // allow genre-specific stats
}

export interface GeminiResponse {
    scenario_text: string;
    status: GameStatus;
    choices: [string, string, string, string];
    is_question: boolean;
    is_ending?: boolean;
    imagePrompt: string;
    imageUrl?: string;
    audio_prompt: string;
    audioUrl?: string;
    modelName?: string;
    isBackup?: boolean;
}

export interface HistoryEntry {
    role: "user" | "assistant";
    content: string;
}

export type GamePhase = "start" | "genre_select" | "playing" | "ending";
export type StartMethod = "custom" | "candidates" | "random";

export interface GenreConfig {
    label: string;
    stats: Record<string, { label: string; icon: string; max: number }>;
    situationLabel: string;
    inventoryLabel: string;
    keywords: string[];
    imageStyleSuffix: string;
    sampleSettings: string[];
}

export interface WorldConfig {
    genres: Record<string, GenreConfig>;
    globalImageStyle: string;
    audioPromptSuffix: string;
}

export interface GameState {
    phase: GamePhase;
    worldSetting: string;
    genreKey: string;
    history: HistoryEntry[];
    currentResponse: GeminiResponse | null;
    seed: number;
    turnCount: number;
    isLoading: boolean;
    error: string | null;
    isDeepDiveMode?: boolean;
}
