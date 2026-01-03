import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChatInterface, Message, AgentExecutedResult } from "@/components/ChatInterface";
import { ChatSidebar, ChatHistory } from "@/components/ChatSidebar";
import { FileAttachment } from "@/services/api";
import { apiRequest } from "@/services/api_request";
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

const Index = () => {
  const genConversationId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const [chats, setChats] = useState<Chat[]>([{ id: "1", messages: [], conversationId: genConversationId() }]);
  const [currentChatId, setCurrentChatId] = useState("1");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
        const resp = await apiRequest<{
          meta: { status: boolean; message: string };
          data: Array<{
            _id: number;
            conversation_id: string;
            conversation_name: string;
            created_at: string;
            id: number;
            updated_at: string;
            user_id: number;
          }>;
        }>({
          url: "/chat/get-conversations",
          method: "GET",
          isAuth: true,
        });
        setConversations(resp?.data ?? []);
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
      const resp = await apiRequest<{
        meta: { status: boolean; message: string };
        data: {
          _id: number;
          available_dates: string[];
          conversation_id: string;
          conversation_name: string;
          created_at: string;
          history: Record<string, Array<{
            created_at: string;
            files: Array<{ id: string; name: string; path: string; size: number; type: string }> | null;
            role: 'user' | 'assistant';
            message: string;
            updated_at: string;
          }>>;
          id: number;
          updated_at: string;
          user_id: number;
        };
      }>({
        url: `/chat/get-chat-history/${cid}`,
        method: 'GET',
        isAuth: true,
      });

      const hist = resp?.data?.history || {};
      const flattened = Object.values(hist).flatMap((entries) => entries.map((e) => ({
        createdAtMs: new Date(e.created_at).getTime(),
        role: e.role === 'user' ? 'user' as const : 'assistant' as const,
        content: e.message,
        files: e.files || undefined,
      })));
      flattened.sort((a, b) => a.createdAtMs - b.createdAtMs);
      const items: Message[] = flattened.map((e, idx) => ({
        id: `${e.createdAtMs}-${idx}`,
        role: e.role,
        content: e.content,
        isStreaming: false,
        files: e.files,
      }));

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
    setIsTyping(true);

    try {
      const chat = chats.find((c) => c.id === currentChatId);
      if (!chat) throw new Error("Chat not found");
      try { localStorage.setItem('last_conversation_id', chat.conversationId); } catch {}

      const response = await apiRequest<{
        meta: { status: boolean; message: string };
        data: {
          message: string;
          agents_executed_results: any[] | null;
        };
      }>({
        url: "/chat/execute",
        method: "POST",
        isAuth: true,
        payload: {
          query: userMessage,
          conversation_id: chat.conversationId,
          files: files || [],
          optional_agent: optionalAgent,
        },
      });

      const inner = response?.data || {};

      const rawAgentResults = inner?.agents_executed_results ?? [];
      const agentResults: AgentExecutedResult[] = Array.isArray(rawAgentResults)
        ? rawAgentResults.map((ar: any) => ({
            agent_id: ar?.agent_id,
            agent_name: ar?.agent_name,
            agent_status: !!ar?.agent_status,
            agent_type: ar?.agent_type,
            completed_at: ar?.completed_at,
            started_at: ar?.started_at,
            response_error: ar?.response_error ?? null,
            response_message: Array.isArray(ar?.response_message)
              ? ar.response_message.map((m: any) => (typeof m === 'string' ? m : JSON.stringify(m)))
              : ar?.response_message
              ? [typeof ar.response_message === 'string' ? ar.response_message : JSON.stringify(ar.response_message)]
              : [],
          }))
        : [];

      const finalMessage: string = 
        inner?.message ??
        "I received your message but couldn't process it properly.";

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: finalMessage,
        isStreaming: false,
        agentResults: Array.isArray(agentResults) && agentResults.length > 0 ? agentResults : undefined,
        createdAtMs: Date.now(),
      };

      setChats((prev) =>
        prev.map((c) => (c.id === currentChatId ? { ...c, messages: [...c.messages, assistantMessage] } : c))
      );

      setConversations((prev) => {
        const ch = chats.find((c) => c.id === currentChatId);
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
          const resp = await apiRequest<{
            meta: { status: boolean; message: string };
            data: Array<{
              _id: number;
              conversation_id: string;
              conversation_name: string;
              created_at: string;
              id: number;
              updated_at: string;
              user_id: number;
            }>;
          }>({
            url: "/chat/get-conversations",
            method: "GET",
            isAuth: true,
          });
          setConversations(resp?.data ?? []);
        } catch {}
      }
    } catch (error) {
      console.error('API request failed:', error);

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        isStreaming: false,
      };

      setChats((prev) =>
        prev.map((c) => (c.id === currentChatId ? { ...c, messages: [...c.messages, errorMessage] } : c))
      );
    } finally {
      setIsTyping(false);
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
      void apiRequest<{
        meta: { status: boolean; message: string };
        data: Array<{
          _id: number;
          conversation_id: string;
          conversation_name: string;
          created_at: string;
          id: number;
          updated_at: string;
          user_id: number;
        }>;
      }>({
        url: "/chat/get-conversations",
        method: "GET",
        isAuth: true,
      }).then((resp) => setConversations(resp?.data ?? [])).catch(() => {});
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
        ) : location.pathname === "/ai/music" ? (
          <AIPodsPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : location.pathname === "/ai/video" ? (
          <AIVideoPage isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        ) : (
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
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
