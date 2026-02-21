"use client";

import { useState } from "react";
import GenreSelect from "@/components/GenreSelect";
import GameInterface from "@/components/GameInterface";

import type { GenreConfig } from "@/types";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [worldSetting, setWorldSetting] = useState("");
  const [genreKey, setGenreKey] = useState("");
  const [dynamicConfig, setDynamicConfig] = useState<GenreConfig | null>(null);

  const handleStart = (setting: string, genre: string, config?: GenreConfig) => {
    setWorldSetting(setting);
    setGenreKey(genre);
    if (config) setDynamicConfig(config);
    setGameStarted(true);
  };

  const handleRestart = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gem-engine-save");
    }
    setGameStarted(false);
    setWorldSetting("");
    setGenreKey("");
    setDynamicConfig(null);
  };

  if (!gameStarted) {
    return <GenreSelect onStart={handleStart} />;
  }

  return (
    <GameInterface
      worldSetting={worldSetting}
      genreKey={genreKey}
      dynamicConfig={dynamicConfig}
      onRestart={handleRestart}
    />
  );
}
