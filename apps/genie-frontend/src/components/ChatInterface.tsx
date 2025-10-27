import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Bot, Sparkles, PanelLeft, Plus, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileAttachment } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  agent_id: number;
  agent_name: string;
  agent_status: boolean;
  agent_type?: string;
  completed_at?: string;
  started_at?: string;
  response_message?: string[];
  response_error?: string | null;
  query?: string;
}

type ChatInterfaceProps = {
  messages: Message[];
  isTyping: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onSendMessage: (content: string, files?: FileAttachment[]) => void;
};

export const ChatInterface = ({
  messages,
  isTyping,
  isSidebarOpen,
  onToggleSidebar,
  onNewChat,
  onSendMessage,
}: ChatInterfaceProps) => {
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [agentDialogResults, setAgentDialogResults] = useState<AgentExecutedResult[] | null>(null);
  const [activeAgentTab, setActiveAgentTab] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const openAgentDialog = (results: AgentExecutedResult[], activeAgentName?: string) => {
    setAgentDialogResults(results);
    setActiveAgentTab(activeAgentName ?? (results?.[0]?.agent_name ?? null));
    setAgentDialogOpen(true);
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
            >
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                        <img src="/logo.png" alt="GenIE" className="h-12 w-12 object-contain" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-foreground">Ready to get your GenIE Super Agent</h2>
                    <p className="text-muted-foreground max-w-xl text-sm">
                      Ask me anything and I’ll conduct GenIE Super Agent research with citations and sources
                    </p>

                    {/* Suggestions grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl px-2">
                      {[
                        { title: 'Market Entry Strategy', desc: 'Best approach to enter the APAC market for a B2B SaaS' },
                        { title: 'Digital Transformation', desc: 'Roadmap to modernize legacy systems across business units' },
                        { title: 'Competitive Positioning', desc: 'How to differentiate vs top 3 competitors in enterprise' },
                        { title: 'M&A Synergy Plan', desc: 'Evaluate synergies and integration plan for target acquisition' },
                      ].map((s) => (
                        <button
                          key={s.title}
                          onClick={() => onSendMessage(`Research: ${s.desc}`)}
                          className="text-left rounded-xl border border-border bg-card/40 hover:bg-card/70 transition-colors px-4 py-3 shadow-sm"
                        >
                          <div className="font-medium text-foreground mb-1">{s.title}</div>
                          <div className="text-xs text-muted-foreground">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-2">
                        <ChatMessage
                          role={message.role}
                          content={message.content}
                          isStreaming={message.isStreaming}
                          files={message.files}
                          createdAtMs={message.createdAtMs}
                        />
                        {message.agentResults && message.agentResults.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {message.agentResults.map((ar, ai) => (
                              <div key={`${message.id}-agent-${ai}`} className="flex items-center gap-2">
                                {(ar.response_message && ar.response_message.length > 0
                                  ? ar.response_message
                                  : ["View results"]).map((_, mi) => (
                                  <Button
                                    key={`${message.id}-agent-${ai}-msg-${mi}`}
                                    variant="outline"
                                    size="sm"
                                    className="border-border"
                                    onClick={() => openAgentDialog(message.agentResults!, ar.agent_name)}
                                  >
                                    View {ar.agent_name} result {mi + 1}
                                  </Button>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && <TypingIndicator />}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Agent Results Dialog */}
            <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
              <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Executed Agents</DialogTitle>
                  <DialogDescription>Select a tab to view each agent's output.</DialogDescription>
                </DialogHeader>
                {agentDialogResults && agentDialogResults.length > 0 ? (
                  <Tabs value={activeAgentTab ?? undefined} onValueChange={setActiveAgentTab} defaultValue={agentDialogResults[0]?.agent_name}>
                    <TabsList className="mb-3 sticky top-0 bg-background z-10">
                      {agentDialogResults.map((ar) => (
                        <TabsTrigger key={ar.agent_name} value={ar.agent_name}>
                          {ar.agent_name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                      {agentDialogResults.map((ar, idx) => (
                        <TabsContent key={`${ar.agent_name}-${idx}`} value={ar.agent_name}>
                          <Card className="border-border bg-card/70">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Brain className="h-4 w-4 text-primary" /> {ar.agent_name}
                              </CardTitle>
                              <CardDescription>
                                {(ar.agent_type || "Agent")} {ar.agent_status ? "• Succeeded" : "• Failed"}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                              {ar.response_error ? (
                                <p className="text-sm text-destructive">Error: {ar.response_error}</p>
                              ) : (
                                <div className="space-y-2 text-sm">
                                  {(ar.response_message ?? ["No message provided"]).map((m, i) => (
                                    <pre key={i} className="whitespace-pre-wrap bg-muted/60 p-2 rounded border border-border text-foreground/90 text-xs">
{m}
                                    </pre>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      ))}
                    </div>
                  </Tabs>
                ) : (
                  <p className="text-sm text-muted-foreground">No agent results available.</p>
                )}
              </DialogContent>
            </Dialog>

            {/* Input Area */}
            <div className="sticky bottom-4 w-full px-4">
              <ChatInput onSendMessage={onSendMessage} disabled={isTyping} />
            </div>
          </>
        </div>
      </div>
    </div>
  );
};
