import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store";
import { useState } from "react";
import { Bot, PanelLeft } from "lucide-react";

interface SettingsProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function SettingsPage({ isSidebarOpen, onToggleSidebar }: SettingsProps) {
  const user = useAppSelector((s) => s.auth.user);
  const [firstName, setFirstName] = useState<string>(user?.first_name ?? "");
  const [lastName, setLastName] = useState<string>(user?.last_name ?? "");
  const [phone, setPhone] = useState<string>((user as any)?.phone ?? "");
  const email = user?.email ?? "";

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
          <h1 className="text-xl font-bold text-white">
            OpsMatrix Super Agent
          </h1>
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
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your profile and subscription</p>

            <div className="mt-5">
              <Tabs defaultValue="profile">
                <TabsList className="w-full justify-start rounded-lg bg-secondary/40 border border-border mb-4">
                  <TabsTrigger value="profile" className="data-[state=active]:bg-card data-[state=active]:text-foreground">Profile</TabsTrigger>
                  <TabsTrigger value="subscription" className="data-[state=active]:bg-card data-[state=active]:text-foreground">Subscription</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card className="bg-card/60 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Profile Information</CardTitle>
                      <p className="text-sm text-muted-foreground">Manage your personal information and account details</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="mt-1" />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" value={email} placeholder="email@example.com" className="mt-1" disabled />
                          <p className="text-xs text-muted-foreground mt-1">Email cannot be modified</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button className="bg-primary text-primary-foreground">Save Changes</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="subscription">
                  <Card className="bg-card/60 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Subscription</CardTitle>
                      <p className="text-sm text-muted-foreground">Manage your plan and billing details</p>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">No subscription details available.</div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
