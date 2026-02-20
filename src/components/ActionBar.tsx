"use client";

import { useState } from "react";

interface Props {
    choices: string[];
    onChoiceSelect: (choice: string) => void;
    onFreeInput: (text: string) => void;
    disabled?: boolean;
}

export default function ActionBar({
    choices,
    onChoiceSelect,
    onFreeInput,
    disabled = false,
}: Props) {
    const [freeText, setFreeText] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (freeText.trim() && !disabled) {
            onFreeInput(freeText.trim());
            setFreeText("");
        }
    };

    // Color the "chaos" option (4th) differently
    const getChaosStyle = (index: number) => {
        if (index === 3) {
            return {
                borderColor: "var(--color-accent)",
                color: "var(--color-accent)",
            };
        }
        return {};
    };

    return (
        <div className="card-sketch p-4">
            <h3
                className="title-handwritten text-lg mb-3"
                style={{ color: "var(--color-accent)" }}
            >
                🎭 行動を選択
            </h3>

            {/* 4 Choice Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 stagger-children">
                {choices.map((choice, i) => (
                    <button
                        key={i}
                        className="btn-sketch text-left text-sm animate-fade-in-up"
                        style={getChaosStyle(i)}
                        disabled={disabled}
                        onClick={() => onChoiceSelect(choice)}
                    >
                        <span className="font-bold mr-1" style={{ color: "var(--color-pencil-gray)" }}>
                            {i + 1}.
                        </span>{" "}
                        {choice}
                    </button>
                ))}
            </div>

            <hr className="divider-sketch" />

            {/* Free text input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    className="input-sketch flex-1 text-sm"
                    placeholder="自由入力：行動・質問を書く..."
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    disabled={disabled}
                />
                <button
                    type="submit"
                    className="btn-sketch btn-sketch-primary text-sm"
                    disabled={disabled || !freeText.trim()}
                    style={{
                        opacity: freeText.trim() && !disabled ? 1 : 0.5,
                    }}
                >
                    送信
                </button>
            </form>
        </div>
    );
}
