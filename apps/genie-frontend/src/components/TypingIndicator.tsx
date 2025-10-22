export const TypingIndicator = () => {
  return (
    <div className="flex w-full justify-start animate-slide-up">
      <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-[hsl(var(--chat-assistant-bg))] border border-border shadow-[var(--shadow-message)]">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-soft" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
};
