import { Button } from "@/components/ui/button";
import { Bot, PanelLeft } from "lucide-react";

interface PageProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function AISlidesPage({ isSidebarOpen, onToggleSidebar }: PageProps) {
  // Replace this with the static URL you want to display in fullscreen
  const IFRAME_URL = 'https://theuselessweb.com/';

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
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
      </header>

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-5 left-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-8 w-8 hover:bg-muted/50 bg-background/80 backdrop-blur-sm border border-border shadow-sm"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-full relative">
          {/* Fullscreen iframe occupying the page area below the header */}
          <iframe
            src={IFRAME_URL}
            title="AI Slides - Fullscreen"
            className="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
