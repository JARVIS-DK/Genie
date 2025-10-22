import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileAttachment, apiService } from "@/services/api";

interface ChatInputProps {
  onSendMessage: (message: string, files?: FileAttachment[]) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled = false }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
      setMessage("");
      setAttachedFiles([]);
      setUploadErrors([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      // Reset file input after sending
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsUploading(true);
      setUploadErrors([]);
      
      // Create temporary file attachments for immediate display
      const tempFiles: FileAttachment[] = Array.from(files).map(file => ({
        name: file.name,
        path: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      // Add temporary files immediately
      setAttachedFiles(prev => [...prev, ...tempFiles]);
      
      try {
        // Upload each file to the server
        type UploadOk = { success: true; file: FileAttachment; tempId: string };
        type UploadErr = { success: false; tempId: string; fileName: string };
        type UploadResult = UploadOk | UploadErr;

        const uploadPromises: Promise<UploadResult>[] = Array.from(files).map(async (file, index) => {
          try {
            const uploadResult = await apiService.uploadFile(file);
            return {
              success: true,
              file: apiService.createUploadedFileAttachment(file, uploadResult),
              tempId: tempFiles[index].id,
            } as UploadOk;
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            return {
              success: false,
              tempId: tempFiles[index].id,
              fileName: file.name,
            } as UploadErr;
          }
        });

        const uploadResults = await Promise.all(uploadPromises);
        
        // Collect failed uploads for error display
        const failedFiles = uploadResults
          .filter((result): result is UploadErr => !result.success)
          .map(result => result.fileName);
        
        if (failedFiles.length > 0) {
          setUploadErrors(failedFiles);
        }
        
        // Remove failed uploads and replace successful ones
        setAttachedFiles(prev => {
          let newFiles = [...prev];
          
          uploadResults.forEach(result => {
            if (result.success) {
              // Replace temp file with uploaded file
              const tempIndex = newFiles.findIndex(f => f.id === result.tempId);
              if (tempIndex !== -1) {
                newFiles[tempIndex] = result.file;
              }
            } else {
              // Remove failed upload
              newFiles = newFiles.filter(f => f.id !== result.tempId);
            }
          });
          
          return newFiles;
        });
        
      } catch (error) {
        console.error('File upload process failed:', error);
        // Remove all temporary files if the entire process fails
        setAttachedFiles(prev => prev.filter(file => !tempFiles.some(temp => temp.id === file.id)));
        setUploadErrors(['Upload process failed']);
      } finally {
        setIsUploading(false);
        // Reset the file input to allow selecting the same files again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const clearErrors = () => {
    setUploadErrors([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl mx-auto px-4 pb-3 pt-4"
    >
      {/* File Attachments Display */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Status */}
      {isUploading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Uploading files...</span>
        </div>
      )}

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-destructive font-medium">
              Failed to upload {uploadErrors.length} file{uploadErrors.length > 1 ? 's' : ''}:
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearErrors}
              className="h-6 w-6 p-0 hover:bg-destructive/20 text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <ul className="text-xs text-destructive/80 space-y-1">
            {uploadErrors.map((fileName, index) => (
              <li key={index}>• {fileName}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative bg-[hsl(var(--chat-input-bg))]/80 backdrop-blur-md rounded-2xl border border-border/60 ring-1 ring-border/40 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-primary/30 focus-within:shadow-md">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-12 py-3 pr-20 resize-none outline-none placeholder:text-muted-foreground disabled:opacity-50 max-h-32 overflow-y-auto text-sm"
        />
        
        {/* File Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="absolute left-2 bottom-2 h-8 w-8 rounded-lg hover:bg-muted/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 text-[hsl(var(--primary-foreground))] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        Press <kbd className="px-1  rounded bg-muted text-muted-foreground font-mono text-[10px]">Enter</kbd> to send, 
        <kbd className="px-1  rounded bg-muted text-muted-foreground font-mono text-[10px]">Shift + Enter</kbd> for new line
      </p>
    </form>
  );
};
