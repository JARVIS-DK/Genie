import { Button } from '@/components/ui/button';
import { Bot, PanelLeft, MessageSquare, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PageProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
}

export default function AIChatDemoPage({ isSidebarOpen, onToggleSidebar }: PageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      content: input,
      sender: 'user',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, content: 'This is an AI response placeholder.', sender: 'ai' },
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {isSidebarOpen ? (
              <Bot className="h-7 w-7 text-primary" />
            ) : (
              <img src="/logo.png" alt="GenIE" className="h-7 w-7 object-contain" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white">GenIE Super Agent</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
          <PanelLeft className="h-4 w-4" />
        </Button>
      </header>

      {/* Chat Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden p-6">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
            >
              <div
                className={`rounded-xl p-4 max-w-xs md:max-w-md break-words ${
                  msg.sender === 'user' ? 'bg-primary text-white' : 'bg-card/60 text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Centered Typing Input */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-border bg-background/80 p-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button onClick={handleSend} className="h-12 w-12 flex items-center justify-center">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}