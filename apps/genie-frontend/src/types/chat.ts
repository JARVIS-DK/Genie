export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isTyping?: boolean;
  timestamp: Date;
  conversationId: string;
  metadata?: {
    fileAttachments?: FileAttachment[];
    agentUsed?: string;
    tokensUsed?: number;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
  isActive: boolean;
  tags?: string[];
}

export interface ChatHistory {
  sessions: ChatSession[];
  currentSessionId: string | null;
}

export interface ChatSettings {
  autoSave: boolean;
  maxHistoryDays: number;
  enableSearch: boolean;
  enableExport: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface SearchResult {
  sessionId: string;
  sessionTitle: string;
  messageId: string;
  messageText: string;
  timestamp: Date;
  relevanceScore: number;
}
