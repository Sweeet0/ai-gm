"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
    text: string;
    speed?: number;
    onComplete?: () => void;
    skipAnimation?: boolean;
}

export default function TypewriterText({ text, speed = 30, onComplete, skipAnimation = false }: Props) {
    const [displayedLength, setDisplayedLength] = useState(skipAnimation ? text.length : 0);
    const [isComplete, setIsComplete] = useState(skipAnimation);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (skipAnimation) {
            setDisplayedLength(text.length);
            setIsComplete(true);
            onComplete?.();
            return;
        }

        setDisplayedLength(0);
        setIsComplete(false);

        intervalRef.current = setInterval(() => {
            setDisplayedLength((prev) => {
                if (prev >= text.length) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setIsComplete(true);
                    onComplete?.();
                    return prev;
                }
                return prev + 1;
            });
        }, speed);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [text, speed, onComplete]);

    const handleSkip = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayedLength(text.length);
        setIsComplete(true);
        onComplete?.();
    };

    return (
        <div onClick={handleSkip} style={{ cursor: isComplete ? "default" : "pointer" }}>
            <span className="typewriter-text">
                {text.slice(0, displayedLength)}
            </span>
            {!isComplete && <span className="typewriter-cursor-blink" />}
        </div>
    );
}
