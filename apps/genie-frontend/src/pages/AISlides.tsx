import { Button } from "@/components/ui/button";
import { Bot, PanelLeft } from "lucide-react";

interface PageProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function AISlidesPage({ isSidebarOpen, onToggleSidebar }: PageProps) {
  // Replace this with the static URL you want to display in fullscreen
  const IFRAME_URL = 'https://www.openstreetmap.org/export/embed.html?bbox=-0.004017949104309083%2C51.47612752641776%2C0.00030577182769775396%2C51.478569861898606&amp;layer=mapnik';

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {isSidebarOpen ? (
              <Bot className="h-7 w-7 text-primary" />
            ) : (
              <img src="/logo.png" alt="opsMatrix" className="h-7 w-7 object-contain" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white">opsMatrix Super Agent</h1>
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
            sandbox="allow-scripts allow-same-origin allow-forms"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
