import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, PanelLeft } from "lucide-react";

type Agent = {
  id: number;
  flow_name: string;
  flow_description: string;
  flow_type: string;
  project_id: number;
  call_type: string;
};

const agents: Agent[] = [
  {
    id: 7320,
    flow_name: "GenIE Super Agent",
    flow_description:
      "Diagnoses business problems and delivers structured, actionable strategies. Requires validated data from database agents (e.g., PostgreSQL, MongoDB) and user inputs before proposing solutions. Coordinates specialized agents and only uses research when internal data is insufficient.",
    flow_type: "AGENT",
    project_id: 5229,
    call_type: "api",
  },
  {
    id: 7304,
    flow_name: "Postgres Database Agent",
    flow_description:
      "Provides sales order details from PostgreSQL. Always invoked; the GenIE Super Agent depends on it for authoritative internal data.",
    flow_type: "AGENT",
    project_id: 5229,
    call_type: "api",
  },
  
  {
    id: 7357,
    flow_name: "MongoDB Database Agent",
    flow_description:
      "Provides sales details from MongoDB. Always invoked; the GenIE Super Agent depends on it for operational insights.",
    flow_type: "AGENT",
    project_id: 5229,
    call_type: "api",
  },
  {
    id: 7408,
    flow_name: "Data Analyst Agent",
    flow_description:
      "Processes CSV and Excel files to generate summaries, dashboards, visualizations, and answers to data-driven questions across current and prior uploads.",
    flow_type: "AGENT",
    project_id: 5229,
    call_type: "api",
  },
  {
    id: 7409,
    flow_name: "Enterprise Search Agent",
    flow_description:
      "Searches and ingests enterprise documents (PDF) with natural language queries, returning comprehensive results with context, metadata, and sources for deeper understanding.",
    flow_type: "AGENT",
    project_id: 5229,
    call_type: "api",
  },
  {
    id: 7410,
    flow_name: "Research Analyst Agent",
    flow_description:
      "Conducts deep research across multiple sources, analyzes findings, and provides accurate, well-structured insights to support decision-making.",
    flow_type: "AGENT",
    project_id: 5229,
    call_type: "api",
  },
];

interface AvailableAgentsProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function AvailableAgents({ isSidebarOpen, onToggleSidebar }: AvailableAgentsProps) {
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

        <div className="h-full overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground">Available Agents</h1>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Explore the available agents. Select the right data and analysis capabilities for your strategy workflows.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((a) => (
                <Card key={a.id} className="border-border bg-card/70 h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{a.flow_name}</CardTitle>
                    <CardDescription>
                      {a.flow_type} • {a.call_type.toUpperCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-foreground/90 mb-3">{a.flow_description}</p>
                    <Button variant="outline" size="sm" className="border-border" disabled>
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

