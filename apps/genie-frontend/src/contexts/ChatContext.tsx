import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatSession, ChatHistory, ChatSettings, SearchResult } from '@/types/chat';

interface ChatState {
  messages: Message[];
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  settings: ChatSettings;
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'CREATE_SESSION'; payload: ChatSession }
  | { type: 'UPDATE_SESSION'; payload: { id: string; updates: Partial<ChatSession> } }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'SET_CURRENT_SESSION'; payload: string | null }
  | { type: 'LOAD_SESSION'; payload: { sessionId: string; messages: Message[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResult[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ChatSettings> }
  | { type: 'LOAD_HISTORY'; payload: ChatHistory };

const initialState: ChatState = {
  messages: [],
  sessions: [],
  currentSessionId: null,
  isLoading: false,
  searchQuery: '',
  searchResults: [],
  settings: {
    autoSave: true,
    maxHistoryDays: 30,
    enableSearch: true,
    enableExport: true,
    theme: 'auto',
  },
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ),
      };

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload),
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      };

    case 'CREATE_SESSION':
      return {
        ...state,
        sessions: [action.payload, ...state.sessions],
        currentSessionId: action.payload.id,
      };

    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === action.payload.id ? { ...session, ...action.payload.updates } : session
        ),
      };

    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(session => session.id !== action.payload),
        currentSessionId: state.currentSessionId === action.payload ? null : state.currentSessionId,
      };

    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSessionId: action.payload,
      };

    case 'LOAD_SESSION':
      return {
        ...state,
        messages: action.payload.messages,
        currentSessionId: action.payload.sessionId,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case 'LOAD_HISTORY':
      return {
        ...state,
        sessions: action.payload.sessions,
        currentSessionId: action.payload.currentSessionId,
      };

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  // Helper functions
  createNewSession: (title?: string) => string;
  addMessage: (text: string, isUser: boolean, conversationId?: string) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  switchToSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  searchMessages: (query: string) => void;
  exportSession: (sessionId: string) => void;
  exportAllSessions: () => void;
  clearCurrentSession: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        const history: ChatHistory = JSON.parse(savedHistory);
        dispatch({ type: 'LOAD_HISTORY', payload: history });
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    const history: ChatHistory = {
      sessions: state.sessions,
      currentSessionId: state.currentSessionId,
    };
    localStorage.setItem('chatHistory', JSON.stringify(history));
  }, [state.sessions, state.currentSessionId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (state.currentSessionId && state.messages.length > 0) {
      localStorage.setItem(`messages_${state.currentSessionId}`, JSON.stringify(state.messages));
    }
  }, [state.messages, state.currentSessionId]);

  const createNewSession = (title?: string): string => {
    const sessionId = uuidv4();
    const session: ChatSession = {
      id: sessionId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      isActive: true,
    };
    dispatch({ type: 'CREATE_SESSION', payload: session });
    dispatch({ type: 'CLEAR_MESSAGES' });
    return sessionId;
  };

  const addMessage = (text: string, isUser: boolean, conversationId?: string): string => {
    const messageId = uuidv4();
    const message: Message = {
      id: messageId,
      text,
      isUser,
      timestamp: new Date(),
      conversationId: conversationId || state.currentSessionId || '',
    };
    dispatch({ type: 'ADD_MESSAGE', payload: message });

    // Update session with new message
    if (state.currentSessionId) {
      const session = state.sessions.find(s => s.id === state.currentSessionId);
      if (session) {
        dispatch({
          type: 'UPDATE_SESSION',
          payload: {
            id: state.currentSessionId,
            updates: {
              updatedAt: new Date(),
              messageCount: session.messageCount + 1,
              lastMessage: text.substring(0, 100),
            },
          },
        });
      }
    }

    return messageId;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } });
  };

  const deleteMessage = (id: string) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: id });
  };

  const switchToSession = (sessionId: string) => {
    // Load messages for this session
    const savedMessages = localStorage.getItem(`messages_${sessionId}`);
    const messages = savedMessages ? JSON.parse(savedMessages) : [];
    
    dispatch({ type: 'LOAD_SESSION', payload: { sessionId, messages } });
  };

  const deleteSession = (sessionId: string) => {
    // Remove messages from localStorage
    localStorage.removeItem(`messages_${sessionId}`);
    dispatch({ type: 'DELETE_SESSION', payload: sessionId });
  };

  const searchMessages = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    state.sessions.forEach(session => {
      const savedMessages = localStorage.getItem(`messages_${session.id}`);
      if (savedMessages) {
        const messages: Message[] = JSON.parse(savedMessages);
        messages.forEach(message => {
          if (message.text.toLowerCase().includes(searchTerm)) {
            results.push({
              sessionId: session.id,
              sessionTitle: session.title,
              messageId: message.id,
              messageText: message.text,
              timestamp: new Date(message.timestamp),
              relevanceScore: message.text.toLowerCase().indexOf(searchTerm),
            });
          }
        });
      }
    });

    // Sort by relevance and timestamp
    results.sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return a.relevanceScore - b.relevanceScore;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
  };

  const exportSession = (sessionId: string) => {
    const session = state.sessions.find(s => s.id === sessionId);
    const messages = localStorage.getItem(`messages_${sessionId}`);
    
    if (session && messages) {
      const data = {
        session,
        messages: JSON.parse(messages),
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const exportAllSessions = () => {
    const allData = {
      sessions: state.sessions,
      messages: {} as Record<string, Message[]>,
      exportedAt: new Date().toISOString(),
    };

    state.sessions.forEach(session => {
      const messages = localStorage.getItem(`messages_${session.id}`);
      if (messages) {
        allData.messages[session.id] = JSON.parse(messages);
      }
    });

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-chats-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearCurrentSession = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  const value: ChatContextType = {
    state,
    dispatch,
    createNewSession,
    addMessage,
    updateMessage,
    deleteMessage,
    switchToSession,
    deleteSession,
    searchMessages,
    exportSession,
    exportAllSessions,
    clearCurrentSession,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
