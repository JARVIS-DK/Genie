import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChatSidebar, ChatHistory } from "./ChatSidebar";
import { Bot, Cpu, PanelLeft, Plus, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FileAttachment } from "@/services/api";
import { apiRequest, logout } from "@/services/api_request";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/store";
import { clearUser } from "@/store/authSlice";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  files?: FileAttachment[];
}

interface Chat {
  id: string;
  messages: Message[];
  conversationId: string;
}

export const ChatInterface = () => {
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
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

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

  // Route-driven loading: whenever URL changes to a conversation id, load it
  useEffect(() => {
    if (routeConversationId && routeConversationId !== 'new') {
      try { localStorage.setItem('last_conversation_id', routeConversationId); } catch {}
      void loadChatHistory(routeConversationId);
    }
  }, [routeConversationId]);

  // Initial restore when there is no conversation id in URL
  useEffect(() => {
    if (hasRestoredConversationRef.current) return;
    if (routeConversationId && routeConversationId !== 'new') return; // handled by route effect
    if (!conversations || conversations.length === 0) return;
    const lastId = localStorage.getItem('last_conversation_id');
    if (lastId && conversations.some((c) => c.conversation_id === lastId)) {
      hasRestoredConversationRef.current = true;
      void loadChatHistory(lastId);
    } else {
      hasRestoredConversationRef.current = true;
    }
  }, [conversations, routeConversationId]);

  // Load chat history for a given conversation_id and update/create a local chat bound to it
  const loadChatHistory = async (conversationId: string) => {
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
        url: `/chat/get-chat-history/${conversationId}`,
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
      // Sort by created_at ascending
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
        const existing = prev.find((c) => c.conversationId === conversationId);
        if (existing) {
          nextCurrentId = existing.id;
          return prev.map((c) => (c.conversationId === conversationId ? { ...c, messages: items } : c));
        }
        const newChat = { id: Date.now().toString(), messages: items, conversationId };
        nextCurrentId = newChat.id;
        return [...prev, newChat];
      });
      if (nextCurrentId) {
        setCurrentChatId(nextCurrentId);
        // Ensure scroll after render updates with loaded history
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

  const sendApiRequest = async (userMessage: string, files?: FileAttachment[]) => {
    setIsTyping(true);

    try {
      const chat = chats.find((c) => c.id === currentChatId);
      if (!chat) throw new Error("Chat not found");
      try { localStorage.setItem('last_conversation_id', chat.conversationId); } catch {}

      const response = await apiRequest<{
        meta: { status: boolean; message: string };
        data: { message: string };
      }>({
        url: "/chat/execute",
        method: "POST",
        isAuth: true,
        payload: {
          query: userMessage,
          conversation_id: chat.conversationId,
          files: files || [],
        },
      });

      const messageContent = response?.data?.message || "I received your message but couldn't process it properly.";
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: messageContent,
        isStreaming: false,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, assistantMessage] }
            : chat
        )
      );

      // If this was initiated from /chat/new, switch URL to this conversation and update history list
      if (routeConversationId === 'new') {
        try { localStorage.setItem('last_conversation_id', chat.conversationId); } catch {}
        // Ensure the conversation appears in the sidebar list if missing
        setConversations((prev) => {
          const exists = prev.some((c) => c.conversation_id === chat.conversationId);
          if (exists) return prev;
          const nowIso = new Date().toISOString();
          const newEntry = {
            _id: Date.now(),
            id: Date.now(),
            conversation_id: chat.conversationId,
            conversation_name: 'Untitled Conversation',
            created_at: nowIso,
            updated_at: nowIso,
            user_id: 0,
          };
          return [...prev, newEntry];
        });
        navigate(`/chat/${chat.conversationId}`, { replace: true });
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
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (content: string, files?: FileAttachment[]) => {
    // Debug: Log files being sent
    if (files && files.length > 0) {
      console.log('Files being sent from ChatInterface:', files.map(f => ({
        name: f.name,
        path: f.path,
        type: f.type,
        size: f.size
      })));
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      files: files || [],
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    );
    sendApiRequest(content, files);
  };

  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const newConversationId = genConversationId();
    setChats((prev) => [...prev, { id: newChatId, messages: [], conversationId: newConversationId }]);
    setCurrentChatId(newChatId);
    try { localStorage.setItem('last_conversation_id', newConversationId); } catch {}
    navigate('/chat/new');
  };

  const handleSelectChat = (conversationId: string) => {
    // Load history from server and switch to that conversation
    try { localStorage.setItem('last_conversation_id', conversationId); } catch {}
    navigate(`/chat/${conversationId}`);
  };

  const handleDeleteChat = (conversationId: string) => {
    // Remove local chat bound to this conversation
    setChats((prev) => {
      const filtered = prev.filter((c) => c.conversationId !== conversationId);
      if (filtered.length === 0) {
        return [{ id: Date.now().toString(), messages: [], conversationId: genConversationId() }];
      }
      return filtered;
    });
    // Optimistically remove from fetched conversations list
    setConversations((prev) => prev.filter((c) => c.conversation_id !== conversationId));
    // If current chat belonged to this conversation, switch to another
    const current = chats.find((c) => c.id === currentChatId);
    if (current?.conversationId === conversationId) {
      const remaining = chats.filter((c) => c.conversationId !== conversationId);
      setCurrentChatId(remaining[0]?.id || Date.now().toString());
      const nextConvId = remaining[0]?.conversationId;
      if (nextConvId) {
        try { localStorage.setItem('last_conversation_id', nextConvId); } catch {}
      } else {
        try { localStorage.removeItem('last_conversation_id'); } catch {}
      }
    }
    try {
      const last = localStorage.getItem('last_conversation_id');
      if (last === conversationId) localStorage.removeItem('last_conversation_id');
    } catch {}
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const chatHistory: ChatHistory[] = conversations
    .map((c) => ({
      id: c.conversation_id,
      title: c.conversation_name || "Untitled Conversation",
      timestamp: new Date(c.created_at),
      preview: "",
    }))
    .reverse();

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 border-b border-border/60 bg-card/60 backdrop-blur-md flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            GenIE Super Agent
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted/60 border border-border/60"
              >
                <User className="h-4 w-4" />
                <span className="sr-only">Open profile menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => {}}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  dispatch(clearUser());
                  navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chatHistory={chatHistory}
          currentChatId={currentChat?.conversationId || null}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          isOpen={isSidebarOpen}
          onClose={toggleSidebar}
        />

        <div className="flex flex-col flex-1 relative overflow-hidden">
          {/* Sidebar Toggle Button */}
          <div className="absolute top-5 left-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 hover:bg-muted/60 bg-background/70 backdrop-blur-md border border-border/70 shadow-sm"
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
                onClick={handleNewChat}
                className="h-8 w-8 hover:bg-muted/60 bg-background/70 backdrop-blur-md border border-border/70 shadow-sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

        {/* Messages Container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 min-h-0"
        >
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-border/40 flex items-center justify-center backdrop-blur-sm shadow-sm">
                    <Cpu className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2 tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  How can I help you today?
                </h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  Start a conversation by typing a message below
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    isStreaming={message.isStreaming}
                    files={message.files}
                  />
                ))}
                {isTyping && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

          {/* Input Area */}
          <div className="">
            <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
          </div>
        </div>
      </div>
    </div>
  );
};
