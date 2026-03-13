import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FileAttachment } from "@/services/api";
import { User, Bot, Brain, FileText, Image, FileAudio, FileVideo, File, Loader2, CheckCircle2, AlertCircle, Sparkles, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

import type { AgentExecutedResult, StreamingAgent } from "./ChatInterface";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  files?: FileAttachment[];
  createdAtMs?: number;
  agentResults?: AgentExecutedResult[];
  streamingAgents?: StreamingAgent[];
}

export const ChatMessage = ({ role, content, isStreaming = false, files = [], createdAtMs, agentResults, streamingAgents }: ChatMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStepsCollapsed, setIsStepsCollapsed] = useState(false);

  // Auto-collapse steps when streaming finishes and content is present
  useEffect(() => {
    if (!isStreaming && content && streamingAgents && streamingAgents.length > 0 && streamingAgents.every((sa) => sa.status === "COMPLETED")) {
      setIsStepsCollapsed(true);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
      return;
    }

    if (currentIndex < content.length) {
      // Word-by-word typing, 10ms per word
      let wordEnd = currentIndex;
      while (wordEnd < content.length && content[wordEnd] !== ' ' && content[wordEnd] !== '\n') {
        wordEnd++;
      }
      if (wordEnd < content.length) wordEnd++;

      const word = content.slice(currentIndex, wordEnd);

      const timeout = setTimeout(() => {
        setDisplayedContent((prev) => prev + word);
        setCurrentIndex(wordEnd);
      }, 10);
      return () => clearTimeout(timeout);
    }
  }, [content, currentIndex, isStreaming]);

  const isUser = role === "user";
  const hasStreamingAgents = streamingAgents && streamingAgents.length > 0;
  const allAgentsDone = hasStreamingAgents && streamingAgents.every((sa) => sa.status === "COMPLETED");
  const isStepsCollapsible = allAgentsDone && !!content;
  const showOnlyThinking = !content && hasStreamingAgents;
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
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn("max-w-[80%] flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {/* Streaming agents thinking trail — collapsible when done */}
        {hasStreamingAgents && (
          <div className="w-full rounded-xl overflow-hidden border border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 backdrop-blur-sm shadow-sm">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/30 w-full text-left"
              onClick={() => isStepsCollapsible && setIsStepsCollapsed((v) => !v)}
              style={{ cursor: isStepsCollapsible ? "pointer" : "default" }}
            >
              <div className="relative flex items-center justify-center h-4 w-4">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {streamingAgents.some((sa) => sa.status !== "COMPLETED") && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <span className="text-xs font-medium text-foreground/80">
                {isStepsCollapsible ? `Thought for ${streamingAgents.length} step${streamingAgents.length > 1 ? "s" : ""}` : "Thinking"}
              </span>
              {isStepsCollapsible && (
                <ChevronDown className={cn(
                  "h-3 w-3 text-muted-foreground ml-auto transition-transform duration-200",
                  isStepsCollapsed ? "-rotate-90" : "rotate-0"
                )} />
              )}
            </button>
            {!isStepsCollapsed && (
              <div className="divide-y divide-border/30">
                {streamingAgents.map((sa, i) => {
                  const isRunning = sa.status === "STARTED" || sa.status === "INPROGRESS";
                  const isDone = sa.status === "COMPLETED";
                  const hasFailed = isDone && !sa.agent_results;

                  return (
                    <div key={`stream-agent-${i}`} className="px-3 py-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        {isRunning ? (
                          <Loader2 className="h-3 w-3 text-primary animate-spin flex-shrink-0" />
                        ) : hasFailed ? (
                          <AlertCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground/90">{sa.agent_name}</span>
                      </div>
                      {sa.messages.length > 0 && (
                        <div className="ml-5 space-y-0.5">
                          {sa.messages.map((msg, mi) => {
                            const isLatest = mi === sa.messages.length - 1 && isRunning;
                            return (
                              <div key={mi} className={cn(
                                "flex items-center gap-1.5 text-xs",
                                isLatest ? "text-foreground/70" : "text-muted-foreground/60"
                              )}>
                                <span className={cn(
                                  "h-1.5 w-1.5 rounded-full flex-shrink-0",
                                  isLatest ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                                )} />
                                <span>{msg}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Main message bubble — only show when there's content or files */}
        {(!showOnlyThinking || files.length > 0) && (content || files.length > 0) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 shadow-[var(--shadow-message)] transition-all",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-[hsl(var(--chat-assistant-bg))] text-[hsl(var(--chat-assistant-fg))] border border-border"
            )}
          >
            {/* File Attachments */}
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((file) => {
                  const isImage = file.type?.startsWith("image/");
                  const isAudio = file.type?.startsWith("audio/");
                  const isVideo = file.type?.startsWith("video/");
                  const isPdf = file.type === "application/pdf";
                  const FileIcon = isImage ? Image : isAudio ? FileAudio : isVideo ? FileVideo : isPdf ? FileText : File;
                  const sizeStr = file.size >= 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`;

                  return isImage && file.path ? (
                    <a key={file.id} href={file.path} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-border/40 bg-muted/30">
                        <img src={file.path} alt={file.name} className="h-full w-full object-cover" />
                      </div>
                    </a>
                  ) : (
                    <a
                      key={file.id}
                      href={file.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg border max-w-[220px] transition-colors",
                        isUser
                          ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
                          : "border-border/50 bg-muted/40 hover:bg-muted/60"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0",
                        isUser ? "bg-primary-foreground/15" : "bg-primary/10"
                      )}>
                        <FileIcon className={cn("h-4 w-4", isUser ? "text-primary-foreground/80" : "text-primary")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className={cn("text-[10px]", isUser ? "text-primary-foreground/60" : "text-muted-foreground")}>{sizeStr}</p>
                      </div>
                    </a>
                  );
                })}
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

              {/* Final agent results — visible after streaming completes */}
              {agentResults && agentResults.length > 0 && (
                <Accordion type="multiple" className="w-full mt-3 rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                  {agentResults.map((ar, ai) => (
                    <AccordionItem key={`agent-${ai}`} value={`agent-${ai}`} className="border-b border-border/30 last:border-b-0">
                      <AccordionTrigger className="py-2 px-3 text-xs hover:no-underline hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2">
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium">{ar.agent_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ar.agent_status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {ar.agent_status}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-2">
                        {ar.response_error ? (
                          <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">Error: {ar.response_error}</p>
                        ) : ar.response && Object.keys(ar.response).length > 0 ? (
                          <Accordion type="multiple" className="w-full rounded-md border border-border/50 bg-muted/30 overflow-hidden">
                            {Object.entries(ar.response).map(([key, value]) => (
                              <AccordionItem key={key} value={key} className="border-b border-border/30 last:border-b-0">
                                <AccordionTrigger className="py-1.5 px-2.5 text-[11px] hover:no-underline hover:bg-muted/50 transition-colors">
                                  <span className="font-mono text-muted-foreground">{key}</span>
                                </AccordionTrigger>
                                <AccordionContent className="px-2.5 pb-2">
                                  {Array.isArray(value) ? (
                                    <div className="max-h-48 overflow-y-auto rounded border border-border/40 bg-background/80" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                                      <ul className="space-y-1 p-2 text-xs">
                                        {value.map((item, i) => (
                                          <li key={i} className="text-foreground/90 break-all">
                                            {typeof item === 'string' && item.startsWith('http') ? (
                                              <a href={item} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item}</a>
                                            ) : (
                                              <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <pre className="whitespace-pre-wrap bg-background/80 p-2 rounded border border-border/40 text-foreground/90 text-xs">
{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                                    </pre>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <p className="text-xs text-muted-foreground">No response data</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
              {tsText && (
                <div className={cn("mt-1 text-[10px] opacity-80", isUser ? "text-primary-foreground/80" : "text-muted-foreground")}>{tsText}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
