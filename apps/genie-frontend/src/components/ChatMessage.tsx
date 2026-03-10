import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FileAttachment } from "@/services/api";
import { Paperclip, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  files?: FileAttachment[];
  createdAtMs?: number;
}

export const ChatMessage = ({ role, content, isStreaming = false, files = [], createdAtMs }: ChatMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent((prev) => prev + content[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 20);
      return () => clearTimeout(timeout);
    }
  }, [content, currentIndex, isStreaming]);

  const isUser = role === "user";
  const ts = createdAtMs ? new Date(createdAtMs) : null;
  const tsText = ts
    ? ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  return (
    <div
      className={cn(
        "flex w-full animate-slide-up items-start gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-[var(--shadow-message)] transition-all",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-[hsl(var(--chat-assistant-bg))] text-[hsl(var(--chat-assistant-fg))] border border-border"
        )}
      >
        {/* File Attachments */}
        {files.length > 0 && (
          <div className="mb-2 space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 text-xs opacity-80"
              >
                <Paperclip className="h-3 w-3" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs opacity-60">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div className="prose prose-sm max-w-none break-words leading-relaxed">
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
              {displayedContent}
              {isStreaming && currentIndex < content.length && (
                <span className="inline-block w-0.5 h-4 ml-1 bg-current animate-pulse-soft" />
              )}
            </p>
          ) : (
            <div className="markdown-content">
              {isStreaming ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                  {displayedContent}
                  {currentIndex < content.length && (
                    <span className="inline-block w-0.5 h-4 ml-1 bg-current animate-pulse-soft" />
                  )}
                </p>
              ) : (
                <div className="prose prose-sm max-w-none break-words leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                    // Custom styling for markdown elements
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs font-mono mb-2">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/30 pl-3 italic text-muted-foreground mb-2">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-2">
                        <table className="min-w-full border-collapse border border-border">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border px-2 py-1 bg-muted font-semibold text-left text-xs">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-2 py-1 text-xs">
                        {children}
                      </td>
                    ),
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    a: ({ children, href }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    ),
                    }}
                  >
                    {displayedContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
          {tsText && (
            <div className={cn("mt-1 text-[10px] opacity-80", isUser ? "text-primary-foreground/80" : "text-muted-foreground")}>{tsText}</div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
