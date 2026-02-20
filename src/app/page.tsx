"use client";

import { useState } from "react";
import GenreSelect from "@/components/GenreSelect";
import GameInterface from "@/components/GameInterface";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [worldSetting, setWorldSetting] = useState("");
  const [genreKey, setGenreKey] = useState("");

  const handleStart = (setting: string, genre: string) => {
    setWorldSetting(setting);
    setGenreKey(genre);
    setGameStarted(true);
  };

  const handleRestart = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gem-engine-save");
    }
    setGameStarted(false);
    setWorldSetting("");
    setGenreKey("");
  };

  if (!gameStarted) {
    return <GenreSelect onStart={handleStart} />;
  }

  return (
    <GameInterface
      worldSetting={worldSetting}
      genreKey={genreKey}
      onRestart={handleRestart}
    />
  );
}
