import { useEffect, useState } from "react";

export const TypingIndicator = () => {
  const phrases = [
    "Thinking…",
    "Generating…",
    "Analyzing your request…",
    "Crafting a response…",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full justify-start animate-slide-up">
      <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-[hsl(var(--chat-assistant-bg))] border border-border shadow-[var(--shadow-message)] flex items-center gap-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-xs text-muted-foreground select-none">{phrases[index]}</span>
      </div>
    </div>
  );
};
