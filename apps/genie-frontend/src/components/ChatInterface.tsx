import { useRef, useLayoutEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Bot, PanelLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileAttachment } from "@/services/api";
import { useNavigate } from "react-router-dom";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  files?: FileAttachment[];
  agentResults?: AgentExecutedResult[];
  createdAtMs?: number;
}

export interface AgentExecutedResult {
  agent_id: string;
  agent_name: string;
  agent_status: string;
  completed_at?: string;
  started_at?: string;
  query?: string;
  response?: Record<string, any> | null;
  response_error?: string | null;
}

type ChatInterfaceProps = {
  messages: Message[];
  isTyping: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onSendMessage: (content: string, files?: FileAttachment[], optional_agent?: string) => void;
};

export const ChatInterface = ({
  messages,
  isTyping,
  isSidebarOpen,
  onToggleSidebar,
  onNewChat,
  onSendMessage,
}: ChatInterfaceProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      try {
        container.scrollTo({ top: container.scrollHeight, behavior });
        return;
      } catch {
        container.scrollTop = container.scrollHeight;
        return;
      }
    }
    const el = messagesEndRef.current;
    if (el) {
      try {
        el.scrollIntoView({ behavior, block: "end" });
      } catch {
        el.scrollIntoView();
      }
    }
  };

  // Use layout effect to ensure scrolling after DOM/layout updates
  useLayoutEffect(() => {
    // Immediate scroll
    scrollToBottom("auto");
    // Scroll again shortly after to account for async layout (markdown tables, images)
    const t1 = setTimeout(() => scrollToBottom("auto"), 50);
    const t2 = setTimeout(() => scrollToBottom("auto"), 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages.length]);

  // Adapter to map ChatInput's File[] to FileAttachment[] expected by onSendMessage
  const handleOnSendFromInput = (content: string, files?: File[], optionalAgent?: string, uploadedFiles?: any[]) => {
    // Use uploaded file metadata if available, otherwise fall back to local previews
    const attachments: FileAttachment[] | undefined = uploadedFiles && uploadedFiles.length > 0
      ? uploadedFiles.map((u: any) => ({
          id: u.id,
          name: u.name,
          size: u.size,
          type: u.type,
          path: u.path,
        }))
      : files?.map((file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          path: URL.createObjectURL(file),
        }));
    onSendMessage(content, attachments, optionalAgent);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Header (chat window) */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {isSidebarOpen ? (
              <Bot className="h-7 w-7 text-primary" />
            ) : (
              <img src="/logo.png" alt="GenIE" className="h-7 w-7 object-contain" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white">
            GenIE Super Agent
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 relative overflow-hidden">
          {/* Sidebar Toggle Button */}
          <div className="absolute top-5 left-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-8 w-8 hover:bg-muted/50 bg-background/80 backdrop-blur-sm border border-border shadow-sm"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* New Chat Button - Only visible when sidebar is hidden */}
          {!isSidebarOpen && (
            <div className="absolute top-16 left-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewChat}
                className="h-8 w-8 hover:bg-muted/50 bg-background/80 backdrop-blur-sm border border-border shadow-sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Chat Content */}
          <>
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
            >
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] text-center py-8">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                        <img src="/logo.png" alt="GenIE" className="h-12 w-12 object-contain" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-foreground">GenIE Super Agent</h2>
                    <p className="text-muted-foreground max-w-xl text-sm mb-6">
                      Ask anything, create anything
                    </p>

                    {/* Centered Chat input */}
                    <div className="w-full max-w-2xl">
                      <ChatInput onSend={handleOnSendFromInput} isLoading={isTyping} />
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 w-full max-w-xl">
                      <div className="grid grid-cols-4 justify-items-center">
                        {[
                          { label: "AI Slides", path: "/ai/slides", iconBg: "from-purple-500/20 to-purple-400/10", emoji: "📑" },
                          { label: "AI Image", path: "/ai/image", iconBg: "from-amber-500/20 to-amber-400/10", emoji: "🖼️" },
                          { label: "AI Chat", path: "/ai/chat", iconBg: "from-sky-500/20 to-sky-400/10", emoji: "💬" },
                          { label: "AI Developer", path: "/ai/developer", iconBg: "from-emerald-500/20 to-emerald-400/10", emoji: "🧑‍💻" },
                        ].map((b) => (
                          <button
                            key={b.label}
                            className="group flex flex-col items-center gap-1.5"
                            onClick={() => navigate(b.path)}
                          >
                            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${b.iconBg} flex items-center justify-center border border-border group-hover:scale-105 transition-transform`}
                            >
                              <span className="text-base select-none">{b.emoji}</span>
                            </div>
                            <span className="text-[11px] leading-tight text-foreground/90">{b.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div key={message.id}>
                        <ChatMessage
                          role={message.role}
                          content={message.content}
                          isStreaming={message.isStreaming}
                          files={message.files}
                          createdAtMs={message.createdAtMs}
                          agentResults={message.agentResults}
                        />
                      </div>
                    ))}
                    {isTyping && <TypingIndicator />}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area only when messages exist */}
            {messages.length > 0 && (
              <div className="sticky bottom-1 w-full px-4">
                <ChatInput onSend={handleOnSendFromInput} isLoading={isTyping} />
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};
