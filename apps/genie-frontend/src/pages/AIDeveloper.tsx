import { Button } from "@/components/ui/button";
import { Bot, PanelLeft, Code2 } from "lucide-react";

interface PageProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function AIDeveloperPage({ isSidebarOpen, onToggleSidebar }: PageProps) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {isSidebarOpen ? (
              <Bot className="h-7 w-7 text-primary" />
            ) : (
              <img src="/logo.png" alt="OpsMatrix" className="h-7 w-7 object-contain" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white">OpsMatrix Super Agent</h1>
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

        <div className="h-full overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">AI Developer</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-6">Demo page. Placeholder for developer tools.</p>
            <div className="rounded-xl border border-border bg-card/60 p-6">
              <p className="text-sm text-foreground/90">This is a demo placeholder for AI Developer.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
