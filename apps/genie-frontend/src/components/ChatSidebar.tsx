import { MessageSquare, Plus, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";


export interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
}

interface ChatSidebarProps {
  chatHistory: ChatHistory[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSidebar = ({
  chatHistory,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onClose,
}: ChatSidebarProps) => {

  const user = useAppSelector((s) => s.auth.user);
  console.log(user);


  return (
    <aside className={cn(
      "border-r border-border/60 bg-[hsl(var(--sidebar-bg))]/70 backdrop-blur-md flex flex-col shadow-[var(--shadow-sidebar)] transition-all duration-300 ease-in-out",
      "h-full flex-shrink-0",
      isOpen ? "w-64" : "w-0 overflow-hidden"
    )}>

        {/* New Chat Button */}
        <div className="p-3 border-b border-border/60 bg-card/20">
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2 text-sm bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-sm h-9"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">New Chat</span>
          </Button>
        </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            <span>Recent Chats</span>
          </div>

          {chatHistory.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              <MessageSquare className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
              <p>No chats yet</p>
              <p className="text-[10px] mt-1">Start a conversation</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group relative rounded-md transition-colors cursor-pointer ring-1 ring-transparent hover:ring-border/60",
                  currentChatId === chat.id
                    ? "bg-[hsl(var(--sidebar-hover))] ring-border/60"
                    : "hover:bg-[hsl(var(--sidebar-hover))]"
                )}
              >
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="w-full text-left p-2 pr-8"
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-medium truncate mb-0.5">
                        {chat.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {chat.preview}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelativeTime(chat.timestamp)}
                      </p>
                    </div>
                  </div>
                </button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer removed as per request */}
    </aside>
  );
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
