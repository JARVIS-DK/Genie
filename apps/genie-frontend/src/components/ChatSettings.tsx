import React from 'react';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Palette,
  Clock,
  Search,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useChat } from '@/contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSettings = ({ isOpen, onClose }: ChatSettingsProps) => {
  const { state, dispatch, exportAllSessions } = useChat();
  const { toast } = useToast();

  const handleSettingChange = (key: keyof typeof state.settings, value: any) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  };

  const handleExportSettings = () => {
    const settings = {
      ...state.settings,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Settings exported",
      description: "Your chat settings have been exported successfully.",
    });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target?.result as string);
          dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
          toast({
            title: "Settings imported",
            description: "Your chat settings have been imported successfully.",
          });
        } catch (error) {
          toast({
            title: "Import failed",
            description: "Failed to import settings. Please check the file format.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all chat data? This action cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Chat Settings
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-save">Auto-save conversations</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save your chat history to local storage
                </p>
              </div>
              <Switch
                id="auto-save"
                checked={state.settings.autoSave}
                onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-search">Enable search</Label>
                <p className="text-sm text-muted-foreground">
                  Allow searching through your chat history
                </p>
              </div>
              <Switch
                id="enable-search"
                checked={state.settings.enableSearch}
                onCheckedChange={(checked) => handleSettingChange('enableSearch', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-export">Enable export</Label>
                <p className="text-sm text-muted-foreground">
                  Allow exporting chat sessions and data
                </p>
              </div>
              <Switch
                id="enable-export"
                checked={state.settings.enableExport}
                onCheckedChange={(checked) => handleSettingChange('enableExport', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Display</h3>
            
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={state.settings.theme}
                onValueChange={(value) => handleSettingChange('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-history">Max history days</Label>
              <Input
                id="max-history"
                type="number"
                min="1"
                max="365"
                value={state.settings.maxHistoryDays}
                onChange={(e) => handleSettingChange('maxHistoryDays', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Number of days to keep chat history (1-365)
              </p>
            </div>
          </div>

          <Separator />

          {/* Data Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Data Management</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={exportAllSessions}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export All Chats
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportSettings}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Export Settings
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-settings">Import Settings</Label>
              <Input
                id="import-settings"
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="cursor-pointer"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleClearAllData}
              className="w-full flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Data
            </Button>
          </div>

          <Separator />

          {/* Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Statistics</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Total Chats</p>
                <p className="text-2xl font-bold">{state.sessions.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">
                  {state.sessions.reduce((sum, session) => sum + session.messageCount, 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
