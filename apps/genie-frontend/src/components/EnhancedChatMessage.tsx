import React, { useState } from 'react';
import { 
  Bot, 
  User, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  MoreVertical,
  Edit3,
  Trash2,
  Download,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';

interface EnhancedChatMessageProps {
  message: Message;
  onEdit?: (id: string, newText: string) => void;
  onDelete?: (id: string) => void;
  onRate?: (id: string, rating: 'up' | 'down') => void;
}

export const EnhancedChatMessage = ({ 
  message, 
  onEdit, 
  onDelete, 
  onRate 
}: EnhancedChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      toast({
        title: "Copied to clipboard",
        description: "Message text has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy message to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedText(message.text);
  };

  const handleSaveEdit = () => {
    if (onEdit && editedText.trim() !== message.text) {
      onEdit(message.id, editedText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(message.text);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleRate = (newRating: 'up' | 'down') => {
    setRating(newRating);
    if (onRate) {
      onRate(message.id, newRating);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chat Message',
          text: message.text,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to copying
      handleCopy();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(timestamp));
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-500 group",
        message.isUser ? "justify-end" : "justify-start"
      )}
    >
      {!message.isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm relative",
          message.isUser
            ? "bg-chat-user text-chat-user-foreground rounded-br-md"
            : "bg-chat-ai text-chat-ai-foreground rounded-bl-md border border-border"
        )}
      >
        {message.isTyping ? (
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></span>
          </div>
        ) : (
          <>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.text}
                </p>
                
                {/* Message metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.metadata?.agentUsed && (
                    <Badge variant="outline" className="text-xs">
                      {message.metadata.agentUsed}
                    </Badge>
                  )}
                </div>

                {/* File attachments */}
                {message.metadata?.fileAttachments && message.metadata.fileAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.metadata.fileAttachments.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <Download className="h-3 w-3" />
                        <span className="text-xs truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)}KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        {!message.isTyping && !isEditing && (
          <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 bg-background border border-border shadow-sm"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {message.isUser && onEdit && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Rating buttons for AI messages */}
        {!message.isUser && !message.isTyping && !isEditing && onRate && (
          <div className="flex gap-1 mt-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                rating === 'up' && "text-green-600 bg-green-100 dark:bg-green-900"
              )}
              onClick={() => handleRate('up')}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                rating === 'down' && "text-red-600 bg-red-100 dark:bg-red-900"
              )}
              onClick={() => handleRate('down')}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {message.isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-foreground" />
        </div>
      )}
    </div>
  );
};
