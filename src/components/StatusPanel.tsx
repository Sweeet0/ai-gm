"use client";

import type { GameStatus, GenreConfig } from "@/types";

interface Props {
    status: GameStatus;
    genreConfig: GenreConfig;
}

export default function StatusPanel({ status, genreConfig }: Props) {
    const statEntries = Object.entries(genreConfig.stats);

    return (
        <div className="card-sketch p-4 flex flex-col h-full overflow-hidden min-h-0">
            <h3
                className="title-handwritten text-lg mb-3 flex-none"
                style={{ color: "var(--color-accent)" }}
            >
                📊 ステータス
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">

                {/* HP / Stats bars */}
                <div className="flex flex-col gap-3 mb-4">
                    {statEntries.map(([key, statDef]) => {
                        const value =
                            typeof status[key] === "number"
                                ? (status[key] as number)
                                : typeof status.hp === "number"
                                    ? status.hp
                                    : 100;
                        const pct = Math.max(0, Math.min(100, (value / statDef.max) * 100));

                        return (
                            <div key={key}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>
                                        {statDef.icon} {statDef.label}
                                    </span>
                                    <span style={{ color: "var(--color-ink-light)" }}>
                                        {value} / {statDef.max}
                                    </span>
                                </div>
                                <div className="hp-bar-track">
                                    <div
                                        className="hp-bar-fill"
                                        style={{
                                            width: `${pct}%`,
                                            background:
                                                pct < 30
                                                    ? "linear-gradient(90deg, #c06040, #d47755)"
                                                    : pct < 60
                                                        ? "linear-gradient(90deg, #c4a94d, #dbc46e)"
                                                        : undefined,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <hr className="divider-sketch" />

                {/* Situation */}
                <div className="mb-3">
                    <h4 className="text-sm font-bold mb-1">
                        🌍 {genreConfig.situationLabel}
                    </h4>
                    <p className="text-sm" style={{ color: "var(--color-ink-light)" }}>
                        {status.situation || "—"}
                    </p>
                </div>

                <hr className="divider-sketch" />

                {/* Inventory */}
                <div>
                    <h4 className="text-sm font-bold mb-1">
                        🎒 {genreConfig.inventoryLabel}
                    </h4>
                    {status.inventory && status.inventory.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {status.inventory.map((item, i) => (
                                <span key={i} className="badge-sketch text-xs">
                                    {item}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p
                            className="text-sm italic"
                            style={{ color: "var(--color-pencil-soft)" }}
                        >
                            何も持っていない
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
