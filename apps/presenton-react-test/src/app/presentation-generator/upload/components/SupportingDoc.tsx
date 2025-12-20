import React, { useRef, useState } from "react";
import { File, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../../lib/utils";

interface FileWithId extends File {
  id: string;
}

interface SupportingDocProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const SupportingDoc: React.FC<SupportingDocProps> = ({ files, onFilesChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for each file
  const filesWithIds: FileWithId[] = files.map((file) => {
    const id = `${file.name}-${file.lastModified}-${file.size}`;
    return Object.assign(file, { id });
  });

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);

    const validTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const hasPdf = files.some((file) => file.type === "application/pdf");

    // Block invalid file types
    const invalidFiles = droppedFiles.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error("Invalid file type", {
        description: "Upload only PDF, TXT, PPTX or DOCX",
      });
      return;
    }

    // Block multiple PDFs
    if (hasPdf && droppedFiles.some((f) => f.type === "application/pdf")) {
      toast.error("Multiple PDFs not allowed", {
        description: "Only one PDF can be uploaded.",
      });
      return;
    }

    const validFiles = droppedFiles.filter((f) => !(hasPdf && f.type === "application/pdf"));
    const updated = [...files, ...validFiles];

    if (validFiles.length > 0) {
      onFilesChange(updated);
      toast.success("Files added", { description: `${validFiles.length} file(s) added` });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const hasPdf = files.some((f) => f.type === "application/pdf");

    const validFiles = selectedFiles.filter((f) => !(hasPdf && f.type === "application/pdf"));
    const updated = [...files, ...validFiles];

    if (validFiles.length > 0) {
      onFilesChange(updated);
      toast.success("Files added", { description: `${validFiles.length} file(s) added` });
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((file) => `${file.name}-${file.lastModified}-${file.size}` !== id));
  };

  return (
    <div className="w-full">
      <h2 className="text-[#444] font-instrument_sans pt-4 text-lg mb-4">
        Supporting Documents
      </h2>

      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "w-full border-2 border-dashed border-gray-400 rounded-lg",
          "transition-all min-h-[300px] flex flex-col mb-8",
          isDragging && "border-purple-400 bg-purple-50"
        )}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDrop={handleDrop}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Upload className={cn("w-12 h-12 mb-4", isDragging ? "text-purple-400" : "text-gray-400")} />

          <p className="text-gray-600 text-center mb-2">
            {isDragging ? "Drop your file here" : "Drag and drop or click below"}
          </p>

          <p className="text-gray-400 text-sm mb-4">PDF, TXT, PPTX, DOCX</p>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            multiple
            accept=".pdf,.txt,.pptx,.docx"
            onChange={handleFileInput}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
          >
            Choose Files
          </button>
        </div>

        {files.length > 0 && (
          <div className="border-t bg-gray-50 rounded-b-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Selected Files ({files.length})
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {filesWithIds.map((file) => (
                  <div key={file.id} className="border rounded-lg bg-white relative group">
                    <div className="p-4 bg-purple-50 group-hover:bg-purple-100 relative flex justify-center">
                      <File className="w-8 h-8 text-purple-600" />

                      <button
                        aria-label="Remove file"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="absolute top-1 right-2 p-1 bg-white/80 rounded-full hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportingDoc;
