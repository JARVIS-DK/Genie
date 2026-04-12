import { MessageSquare, Plus, Trash2, History, User, Settings, LogOut, Music, Image, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store";

import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "@/services/api_request";
import { clearUser } from "@/store/authSlice";

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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className={cn(
      "border-r border-border bg-[hsl(var(--sidebar-bg))] flex flex-col shadow-[var(--shadow-sidebar)] transition-all duration-300 ease-in-out",
      "h-full flex-shrink-0",
      isOpen ? "w-64" : "w-0 overflow-hidden"
    )}>
        {/* Brand Header */}
        <div className="px-4 pt-5 pb-7 flex items-center gap-2">
          <img src="/logo.png" alt="OpsMatrix" className="h-7 w-7 rounded-md object-contain" />
          <div className="text-xl font-semibold text-foreground">OpsMatrix</div>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 text-sm rounded-xl px-3 py-2 bg-[hsl(var(--sidebar-accent))] text-foreground border border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-hover))] transition-colors"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]">
              <Plus className="h-3 w-3" />
            </span>
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Primary Nav */}
        <div className="px-3 space-y-1 pb-2">
          {/*
          <SidebarNavItem
            icon={<RotateCcw className="h-4 w-4" />}
            label="Available Agents"
            onClick={() => navigate('/agents')}
            active={location.pathname.startsWith('/agents')}
          />
          */}
          <SidebarNavItem
            icon={<Music className="h-4 w-4" />}
            label="AI Pods"
            onClick={() => navigate('/ai/music')}
            active={location.pathname === '/ai/music'}
          />
          <SidebarNavItem
            icon={<Image className="h-4 w-4" />}
            label="AI Image"
            onClick={() => navigate('/ai/image')}
            active={location.pathname === '/ai/image'}
          />
          <SidebarNavItem
            icon={<Video className="h-4 w-4" />}
            label="AI Video"
            onClick={() => navigate('/ai/video')}
            active={location.pathname === '/ai/video'}
          />
          <SidebarNavItem
            icon={<FileText className="h-4 w-4" />}
            label="AI Slides"
            onClick={() => navigate('/ai/slides')}
            active={location.pathname === '/ai/slides'}
          />
          <SidebarNavItem
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            onClick={() => navigate('/settings')}
            active={location.pathname === '/settings'}
          />
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
                  "group relative rounded-lg transition-all cursor-pointer",
                  currentChatId === chat.id
                    ? "bg-[hsl(var(--sidebar-hover))]"
                    : "hover:bg-[hsl(var(--sidebar-hover))]"
                )}
              >
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="w-full text-left py-2 px-3 pr-10"
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
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Credits Card */}
      {/* <div className="px-3 pb-2">
        <div className="rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))] p-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <div className="flex items-center gap-2 text-foreground"><span className="inline-block h-2.5 w-2.5 rounded-full bg-primary"></span> Credits</div>
            <button className="text-xs text-primary hover:underline">Upgrade</button>
          </div>
          <div className="text-3xl font-semibold text-primary leading-none">7</div>
          <div className="text-[11px] text-muted-foreground mt-1">Research credits remaining</div>
        </div>
      </div> */}

      {/* Footer: user name and Logout */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-foreground">{user?.first_name ?? 'User'}</div>
              <div className="text-xs text-muted-foreground truncate">OpsMatrix Super Agent</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              logout();
              dispatch(clearUser());
              navigate('/login');
            }}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
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

function SidebarNavItem({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors border",
        active
          ? "bg-[hsl(var(--sidebar-hover))] text-foreground border-[hsl(var(--sidebar-border))]"
          : "text-foreground/90 hover:bg-[hsl(var(--sidebar-hover))] border-transparent hover:border-[hsl(var(--sidebar-border))]"
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
