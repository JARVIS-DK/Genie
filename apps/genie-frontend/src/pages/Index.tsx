import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChatInterface, Message, AgentExecutedResult, StreamingAgent } from "@/components/ChatInterface";
import { ChatSidebar, ChatHistory } from "@/components/ChatSidebar";
import { FileAttachment } from "@/services/api";
import { apiRequest, apiStreamRequest, StreamChunk } from "@/services/api_request";
import SettingsPage from "./Settings";
import AvailableAgents from "./AvailableAgents"
import AISlidesPage from "./AISlides";
import AIImagePage from "./AIImage";
import AIChatDemoPage from "./AIChat";
import AIDeveloperPage from "./AIDeveloper";
import AIPodsPage from "./AIMusic";
import AIVideoPage from "./AIVideo";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface Chat {
  id: string;
  messages: Message[];
  conversationId: string;
}

const unwrapData = (resp: any) => {
  const d = resp?.data;
  if (d && typeof d === 'object' && 'data' in d) return d.data;
  return d;
};

const Index = () => {
  const genConversationId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const [chats, setChats] = useState<Chat[]>([{ id: "1", messages: [], conversationId: genConversationId() }]);
  const [currentChatId, setCurrentChatId] = useState("1");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [browserSessionUrl, setBrowserSessionUrl] = useState<string | null>(null);
  const [browserTaskId, setBrowserTaskId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<{
    _id: number;
    conversation_id: string;
    conversation_name: string;
    created_at: string;
    id: number;
    updated_at: string;
    user_id: number;
  }>>([]);
  const hasRestoredConversationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();

  const currentChat = chats.find((c) => c.id === currentChatId);
  const messages = currentChat?.messages || [];

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

  useLayoutEffect(() => {
    scrollToBottom("auto");
    const t1 = setTimeout(() => scrollToBottom("auto"), 50);
    const t2 = setTimeout(() => scrollToBottom("auto"), 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [currentChatId, messages.length]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const resp = await apiRequest<any>({
          url: "/chat/get-conversations",
          method: "GET",
          isAuth: true,
        });
        setConversations(unwrapData(resp) ?? []);
      } catch (e) {
        console.error("Failed to fetch conversations", e);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (conversationId && conversationId !== 'new') {
      try { localStorage.setItem('last_conversation_id', conversationId); } catch {}
      void loadChatHistory(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (hasRestoredConversationRef.current) return;
    if (conversationId && conversationId !== 'new') return;
    if (!conversations || conversations.length === 0) return;
    const lastId = localStorage.getItem('last_conversation_id');
    if (lastId && conversations.some((c) => c.conversation_id === lastId)) {
      hasRestoredConversationRef.current = true;
      void loadChatHistory(lastId);
    } else {
      hasRestoredConversationRef.current = true;
    }
  }, [conversations, conversationId]);

  const loadChatHistory = async (cid: string) => {
    try {
      const resp = await apiRequest<any>({
        url: `/chat/get-chat-history/${cid}`,
        method: 'GET',
        isAuth: true,
      });

      const histData = unwrapData(resp) || {};
      const hist = histData?.history || {};
      const flattened = Object.values(hist).flatMap((entries: any) => entries.map((e: any) => ({
        createdAtMs: new Date(e.created_at).getTime(),
        role: e.role === 'user' ? 'user' as const : 'assistant' as const,
        content: e.message,
        files: e.files || undefined,
        agents_executed_results: e.agents_executed_results || undefined,
      })));
      flattened.sort((a, b) => a.createdAtMs - b.createdAtMs);
      const items: Message[] = flattened.map((e, idx) => {
        const rawResults = e.agents_executed_results;
        const agentResults: AgentExecutedResult[] | undefined =
          Array.isArray(rawResults) && rawResults.length > 0
            ? rawResults.map((ar: any) => ({
                agent_id: ar?.agent_id ?? "",
                agent_name: ar?.agent_name ?? "",
                agent_status: ar?.agent_status ?? "FAILED",
                completed_at: ar?.completed_at,
                started_at: ar?.started_at,
                query: ar?.query,
                response: ar?.response ?? null,
                response_error: ar?.response_error ?? null,
              }))
            : undefined;
        return {
          id: `${e.createdAtMs}-${idx}`,
          role: e.role,
          content: e.content,
          isStreaming: false,
          files: e.files,
          agentResults,
        };
      });

      let nextCurrentId: string | null = null;
      setChats((prev) => {
        const existing = prev.find((c) => c.conversationId === cid);
        if (existing) {
          nextCurrentId = existing.id;
          return prev.map((c) => (c.conversationId === cid ? { ...c, messages: items } : c));
        }
        const newChat = { id: Date.now().toString(), messages: items, conversationId: cid };
        nextCurrentId = newChat.id;
        return [...prev, newChat];
      });
      if (nextCurrentId) {
        setCurrentChatId(nextCurrentId);
        try {
          requestAnimationFrame(() => scrollToBottom());
        } catch {
          setTimeout(() => scrollToBottom(), 0);
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  };

  const sendApiRequest = async (userMessage: string, files?: FileAttachment[], optionalAgent?: string) => {
    // Branch: browser_use has its own streaming endpoint and flow
    if (optionalAgent === "BROWSER_USE") {
      return sendBrowserUseRequest(userMessage, files);
    }

    setIsTyping(true);
    setStreamingStatus("");

    const assistantMsgId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const chatId = currentChatId;

    try {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) throw new Error("Chat not found");
      try { localStorage.setItem('last_conversation_id', chat.conversationId); } catch {}

      // Insert a placeholder streaming assistant message
      const placeholderMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
        streamingAgents: [],
        createdAtMs: Date.now(),
      };
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, placeholderMsg] } : c))
      );

      let finalMessage = "";
      const collectedAgentResults: AgentExecutedResult[] = [];
      const liveAgents: StreamingAgent[] = [];

      const updateAssistantMsg = (opts?: { typingDone?: boolean }) => {
        const typingDone = opts?.typingDone ?? false;
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== chatId) return c;
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== assistantMsgId) return m;
                return {
                  ...m,
                  content: finalMessage,
                  isStreaming: finalMessage ? !typingDone : true,
                  streamingAgents: liveAgents.length > 0 ? [...liveAgents] : undefined,
                  agentResults: collectedAgentResults.length > 0 ? [...collectedAgentResults] : undefined,
                };
              }),
            };
          })
        );
      };

      await apiStreamRequest({
        url: "/chats/execute",
        isAuth: true,
        payload: {
          message: userMessage,
          conversation_id: chat.conversationId,
          files: files || [],
          optional_agent: optionalAgent,
        },
        onChunk: (chunk: StreamChunk) => {
          const agentName = chunk.agent_name;
          const isOrchestrator = agentName === "orchestrator";

          if (chunk.status !== "COMPLETED") {
            setStreamingStatus(chunk.message || `${agentName} running...`);
          }

          if (!isOrchestrator) {
            const existingIdx = liveAgents.findIndex((a) => a.agent_name === agentName);
            if (existingIdx >= 0) {
              const existing = liveAgents[existingIdx];
              if (chunk.message && existing.messages[existing.messages.length - 1] !== chunk.message) {
                existing.messages.push(chunk.message);
              }
              existing.status = chunk.status as StreamingAgent["status"];
              existing.message = chunk.message;
              existing.agent_results = chunk.agent_results ?? existing.agent_results;
            } else {
              liveAgents.push({
                agent_name: agentName,
                status: chunk.status as StreamingAgent["status"],
                message: chunk.message,
                messages: chunk.message ? [chunk.message] : [],
                agent_results: chunk.agent_results ?? undefined,
              });
            }
          }

          if (!isOrchestrator && chunk.status === "COMPLETED" && chunk.agent_results) {
            const existingIdx = collectedAgentResults.findIndex((a) => a.agent_name === agentName);
            const agentResult: AgentExecutedResult = {
              agent_id: "",
              agent_name: agentName,
              agent_status: "SUCCESS",
              response: chunk.agent_results ?? null,
              response_error: null,
            };
            if (existingIdx >= 0) {
              collectedAgentResults[existingIdx] = agentResult;
            } else {
              collectedAgentResults.push(agentResult);
            }
          }

          if (isOrchestrator && chunk.status === "COMPLETED") {
            finalMessage = chunk.message;
            setStreamingStatus("");
          }

          updateAssistantMsg();
        },
      });

      finalMessage = finalMessage || "I received your message but couldn't process it properly.";
      updateAssistantMsg();

      const wordCount = finalMessage.split(/\s+/).length;
      const estimatedTypingMs = wordCount * 10 + 300;
      setTimeout(() => {
        updateAssistantMsg({ typingDone: true });
      }, estimatedTypingMs);

      setConversations((prev) => {
        const ch = chats.find((c) => c.id === chatId);
        if (!ch) return prev;
        const exists = prev.some((co) => co.conversation_id === ch.conversationId);
        if (exists) return prev;
        const nowIso = new Date().toISOString();
        return [
          ...prev,
          {
            _id: Date.now(),
            id: Date.now(),
            conversation_id: ch.conversationId,
            conversation_name: 'Untitled Conversation',
            created_at: nowIso,
            updated_at: nowIso,
            user_id: 0,
          },
        ];
      });

      if (conversationId === 'new') {
        try { localStorage.setItem('last_conversation_id', chat.conversationId); } catch {}
        navigate(`/chat/${chat.conversationId}`, { replace: true });
        try {
          const resp = await apiRequest<any>({
            url: "/chat/get-conversations",
            method: "GET",
            isAuth: true,
          });
          setConversations(unwrapData(resp) ?? []);
        } catch {}
      }
    } catch (error) {
      console.error('API request failed:', error);

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const hasPlaceholder = c.messages.some((m) => m.id === assistantMsgId);
          if (hasPlaceholder) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: "Sorry, I encountered an error while processing your request. Please try again.", isStreaming: false }
                  : m
              ),
            };
          }
          return {
            ...c,
            messages: [
              ...c.messages,
              {
                id: assistantMsgId,
                role: "assistant" as const,
                content: "Sorry, I encountered an error while processing your request. Please try again.",
                isStreaming: false,
              },
            ],
          };
        })
      );
    } finally {
      setIsTyping(false);
      setStreamingStatus("");
    }
  };

  const sendBrowserUseRequest = async (userMessage: string, files?: FileAttachment[]) => {
    setIsTyping(true);
    setStreamingStatus("");

    const assistantMsgId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const chatId = currentChatId;

    try {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) throw new Error("Chat not found");
      try { localStorage.setItem('last_conversation_id', chat.conversationId); } catch {}

      const placeholderMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
        isBrowserUse: true,
        streamingAgents: [],
        createdAtMs: Date.now(),
      };
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, placeholderMsg] } : c))
      );

      let finalMessage = "";
      const liveAgents: StreamingAgent[] = [];

      const updateAssistantMsg = (opts?: { typingDone?: boolean }) => {
        const typingDone = opts?.typingDone ?? false;
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== chatId) return c;
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== assistantMsgId) return m;
                return {
                  ...m,
                  content: finalMessage,
                  isStreaming: finalMessage ? !typingDone : true,
                  isBrowserUse: true,
                  streamingAgents: liveAgents.length > 0 ? [...liveAgents] : undefined,
                };
              }),
            };
          })
        );
      };

      await apiStreamRequest({
        url: "/chats/execute/browser-use",
        isAuth: true,
        payload: {
          message: userMessage,
          conversation_id: chat.conversationId,
          files: files || [],
        },
        onChunk: (chunk: StreamChunk) => {
          if (chunk.status !== "COMPLETED") {
            setStreamingStatus(chunk.message || "Browser working...");
          }

          // Check for session_url in agent_results — open iframe
          if (chunk.agent_results && typeof chunk.agent_results === "object") {
            const results = chunk.agent_results as Record<string, any>;
            if (results.session_url && typeof results.session_url === "string") {
              setBrowserSessionUrl(results.session_url);
              setIsSidebarOpen(false);
            }
            if (results.task_id && typeof results.task_id === "string") {
              setBrowserTaskId(results.task_id);
            }
          }

          // Track live agent steps
          const agentName = chunk.agent_name;
          const existingIdx = liveAgents.findIndex((a) => a.agent_name === agentName);
          if (existingIdx >= 0) {
            const existing = liveAgents[existingIdx];
            if (chunk.message && existing.messages[existing.messages.length - 1] !== chunk.message) {
              existing.messages.push(chunk.message);
            }
            existing.status = chunk.status as StreamingAgent["status"];
            existing.message = chunk.message;
            existing.agent_results = chunk.agent_results ?? existing.agent_results;
          } else {
            liveAgents.push({
              agent_name: agentName,
              status: chunk.status as StreamingAgent["status"],
              message: chunk.message,
              messages: chunk.message ? [chunk.message] : [],
              agent_results: chunk.agent_results ?? undefined,
            });
          }

          // Final COMPLETED
          if (chunk.status === "COMPLETED") {
            finalMessage = chunk.message;
            setStreamingStatus("");
          }

          updateAssistantMsg();
        },
      });

      finalMessage = finalMessage || "Browser task completed.";
      updateAssistantMsg();

      const wordCount = finalMessage.split(/\s+/).length;
      const estimatedTypingMs = wordCount * 10 + 300;
      setTimeout(() => {
        updateAssistantMsg({ typingDone: true });
      }, estimatedTypingMs);

      // Update conversations
      setConversations((prev) => {
        const ch = chats.find((c) => c.id === chatId);
        if (!ch) return prev;
        const exists = prev.some((co) => co.conversation_id === ch.conversationId);
        if (exists) return prev;
        const nowIso = new Date().toISOString();
        return [
          ...prev,
          {
            _id: Date.now(),
            id: Date.now(),
            conversation_id: ch.conversationId,
            conversation_name: 'Untitled Conversation',
            created_at: nowIso,
            updated_at: nowIso,
            user_id: 0,
          },
        ];
      });

      if (conversationId === 'new') {
        try { localStorage.setItem('last_conversation_id', chat.conversationId); } catch {}
        navigate(`/chat/${chat.conversationId}`, { replace: true });
        try {
          const resp = await apiRequest<any>({
            url: "/chat/get-conversations",
            method: "GET",
            isAuth: true,
          });
          setConversations(unwrapData(resp) ?? []);
        } catch {}
      }
    } catch (error) {
      console.error('Browser use request failed:', error);
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const hasPlaceholder = c.messages.some((m) => m.id === assistantMsgId);
          if (hasPlaceholder) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: "Browser task failed. Please try again.", isStreaming: false, isBrowserUse: true }
                  : m
              ),
            };
          }
          return {
            ...c,
            messages: [
              ...c.messages,
              {
                id: assistantMsgId,
                role: "assistant" as const,
                content: "Browser task failed. Please try again.",
                isStreaming: false,
                isBrowserUse: true,
              },
            ],
          };
        })
      );
    } finally {
      setIsTyping(false);
      setStreamingStatus("");
    }
  };

  const handleCloseBrowserUse = async () => {
    const taskId = browserTaskId;
    const convId = currentChat?.conversationId || "";
    setBrowserSessionUrl(null);
    setBrowserTaskId(null);
    if (taskId) {
      try {
        await apiRequest({
          url: "/chats/execute/browser-use-cancel",
          method: "POST",
          isAuth: true,
          payload: { task_id: taskId, conversation_id: convId, message: "Browser task cancelled by user." },
        });
      } catch (e) {
        console.error("Failed to cancel browser use task:", e);
      }
    }
  };

  const handleSendMessage = (content: string, files?: FileAttachment[], optional_agent?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      files: files || [],
      createdAtMs: Date.now(),
    };

    setChats((prev) => prev.map((c) => (c.id === currentChatId ? { ...c, messages: [...c.messages, userMessage] } : c)));
    sendApiRequest(content, files, optional_agent);
  };

  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const newConversationId = genConversationId();
    setChats((prev) => [...prev, { id: newChatId, messages: [], conversationId: newConversationId }]);
    setCurrentChatId(newChatId);
    try { localStorage.setItem('last_conversation_id', newConversationId); } catch {}
    navigate('/chat/new');
  };

  const handleSelectChat = (cid: string) => {
    try { localStorage.setItem('last_conversation_id', cid); } catch {}
    navigate(`/chat/${cid}`);
  };

  const handleDeleteChat = (cid: string) => {
    setChats((prev) => {
      const filtered = prev.filter((c) => c.conversationId !== cid);
      if (filtered.length === 0) {
        return [{ id: Date.now().toString(), messages: [], conversationId: genConversationId() }];
      }
      return filtered;
    });
    setConversations((prev) => prev.filter((c) => c.conversation_id !== cid));
    const current = chats.find((c) => c.id === currentChatId);
    if (current?.conversationId === cid) {
      try { localStorage.removeItem('last_conversation_id'); } catch {}
      handleNewChat();
      return;
    }
    try {
      const last = localStorage.getItem('last_conversation_id');
      if (last === cid) localStorage.removeItem('last_conversation_id');
    } catch {}
    void apiRequest<{
      meta: { status: boolean; message: string };
      data: { message: string };
    }>({
      url: `/chat/delete-conversation/${cid}`,
      method: 'GET',
      isAuth: true,
    }).then(() => {
      void apiRequest<any>({
        url: "/chat/get-conversations",
        method: "GET",
        isAuth: true,
      }).then((resp) => setConversations(unwrapData(resp) ?? [])).catch(() => {});
    }).catch(() => {});
  };

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);

  const chatHistory: ChatHistory[] = conversations
    .map((c) => ({
      id: c.conversation_id,
      title: c.conversation_name || "Untitled Conversation",
      timestamp: new Date(c.created_at),
      preview: "",
    }))
    .reverse();

  return (
    <div className="flex flex-1 overflow-hidden h-screen w-full">
      <ChatSidebar
        chatHistory={chatHistory}
        currentChatId={currentChat?.conversationId || null}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onClose={toggleSidebar}
      />

      <div className="flex-1 min-w-0">
        {location.pathname === "/settings" ? (
          <SettingsPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/agents" ? (
          <AvailableAgents isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/ai/slides" ? (
          <AISlidesPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/ai/image" ? (
          <AIImagePage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/ai/chat" ? (
          <AIChatDemoPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/ai/developer" ? (
          <AIDeveloperPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/ai/podcasts" ? (
          <AIPodsPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/ai/video" ? (
          <AIVideoPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : browserSessionUrl ? (
          <div className="flex h-full w-full">
            <div className="w-1/3 min-w-0 h-full">
              <ChatInterface
                messages={messages}
                isTyping={isTyping}
                streamingStatus={streamingStatus}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={toggleSidebar}
                onNewChat={handleNewChat}
                onSendMessage={handleSendMessage}
              />
            </div>
            <div className="w-2/3 min-w-0 h-full relative border-l border-border bg-background">
              <button
                onClick={handleCloseBrowserUse}
                className="absolute top-3 left-3 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
                title="Close browser view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <iframe
                src={browserSessionUrl}
                className="w-full h-full border-0"
                title="Browser Use Session"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              />
            </div>
          </div>
        ) : (
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            streamingStatus={streamingStatus}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
            onNewChat={handleNewChat}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
