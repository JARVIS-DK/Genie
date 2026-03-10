import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Settings, 
  Download, 
  MoreVertical,
  Menu,
  X,
  Edit3,
  Archive,
  Trash2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useChat } from '@/contexts/ChatContext';
import { SearchResults } from './SearchResults';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onCreateNewChat: () => void;
}

export const ChatHeader = ({ onToggleSidebar, sidebarOpen, onCreateNewChat }: ChatHeaderProps) => {
  const { state, searchMessages, exportSession, exportAllSessions, clearCurrentSession } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const currentSession = state.sessions.find(s => s.id === state.currentSessionId);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchMessages(query);
  };

  const handleExportCurrent = () => {
    if (state.currentSessionId) {
      exportSession(state.currentSessionId);
    }
  };

  const handleClearCurrent = () => {
    clearCurrentSession();
  };

  const handleEditTitle = () => {
    if (currentSession) {
      setEditedTitle(currentSession.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = () => {
    if (currentSession && editedTitle.trim()) {
      // Update session title logic would go here
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="md:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">opsMatrix Super Agent</h1>
              <p className="text-sm text-muted-foreground">Your intelligent business advisor</p>
            </div>
          </div>

          {/* Center - Session Info */}
          {currentSession && (
            <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveTitle}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium text-foreground">
                    {currentSession.title}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {currentSession.messageCount} messages
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* New Chat Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCreateNewChat}
                  className="h-9 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">New Chat</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create new chat (Ctrl+N)</p>
              </TooltipContent>
            </Tooltip>

            {/* Search */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(!showSearch)}
                className="h-9 w-9"
              >
                <Search className="h-4 w-4" />
              </Button>
              
              {showSearch && (
                <div className="absolute top-full right-0 mt-2 w-80">
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pr-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setShowSearch(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <SearchResults />
                </div>
              )}
            </div>

            {/* Export */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportCurrent}
              className="h-9 w-9"
              disabled={!currentSession}
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleEditTitle}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Rename Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCurrent}>
                  <Download className="h-4 w-4 mr-2" />
                  Export This Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAllSessions}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Chats
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearCurrent}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Messages
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
