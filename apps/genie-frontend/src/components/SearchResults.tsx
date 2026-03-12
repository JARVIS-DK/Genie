import React from 'react';
import { Search, MessageSquare, Clock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';

export const SearchResults = () => {
  const { state, switchToSession } = useChat();

  if (state.searchResults.length === 0) {
    return null;
  }

  const handleResultClick = (sessionId: string) => {
    switchToSession(sessionId);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">
            Search Results ({state.searchResults.length})
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {/* Clear search */}}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="p-2">
        {state.searchResults.map((result, index) => (
          <Card
            key={`${result.sessionId}-${result.messageId}-${index}`}
            className="cursor-pointer hover:shadow-md transition-shadow mb-2"
            onClick={() => handleResultClick(result.sessionId)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">
                    {result.sessionTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(result.timestamp)}</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {highlightText(result.messageText, state.searchQuery)}
              </p>
              
              <div className="flex items-center justify-between mt-2">
                <Badge variant="outline" className="text-xs">
                  Relevance: {Math.round((1 - result.relevanceScore / result.messageText.length) * 100)}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResultClick(result.sessionId);
                  }}
                >
                  View Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
