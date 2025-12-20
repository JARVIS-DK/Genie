import React, { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Wand2, Upload, Loader2, Trash } from "lucide-react";
import { cn } from "../../../lib/utils";
import { PresentationGenerationApi } from "../services/api/presentation-generation";
import { Skeleton } from "../../../components/ui/skeleton";
import { toast } from "sonner";
import { PreviousGeneratedImagesResponse } from "../services/api/params";
import { trackEvent, MixpanelEvent } from "../../../utils/mixpanel";
import { ImagesApi } from "../services/api/image";
import { ImageAssetResponse } from "../services/api/types";

interface ImageEditorProps {
  initialImage: string | null;
  imageIdx?: number;
  slideIndex: number;
  className?: string;
  promptContent?: string;
  properties?: null | any;
  onClose?: () => void;
  onImageChange?: (newImageUrl: string, prompt?: string) => void;
  onFocusPointClick?: (propertiesData: any) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({
  initialImage,
  imageIdx = 0,
  promptContent,
  properties,
  onClose,
  onFocusPointClick,
  onImageChange,
}) => {
  const [previewImages, setPreviewImages] = useState(initialImage);
  const [previousGeneratedImages, setPreviousGeneratedImages] = useState<
    PreviousGeneratedImagesResponse[]
  >([]);
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<ImageAssetResponse[]>([]);
  const [uploadedImagesLoading, setUploadedImagesLoading] = useState(false);

  const [isFocusPointMode, setIsFocusPointMode] = useState(false);
  const [focusPoint, setFocusPoint] = useState(
    (properties &&
      properties[imageIdx] &&
      properties[imageIdx].initialFocusPoint) || { x: 50, y: 50 }
  );
  const [objectFit, setObjectFit] = useState<"cover" | "contain" | "fill">(
    (properties &&
      properties[imageIdx] &&
      properties[imageIdx].initialObjectFit) ||
      "cover"
  );

  const imageRef = useRef<HTMLImageElement>(null);

  // Sync when initial image updates
  useEffect(() => {
    setPreviewImages(initialImage);
  }, [initialImage]);

  // Fetch history images when sheet opens
  useEffect(() => {
    if (isOpen && !previousGeneratedImages.length) {
      getPreviousGeneratedImage();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getPreviousGeneratedImage = async () => {
    try {
      trackEvent(MixpanelEvent.ImageEditor_GetPreviousGeneratedImages_API_Call);
      const response =
        await PresentationGenerationApi.getPreviousGeneratedImages();
      setPreviousGeneratedImages(response);
    } catch (error: any) {
      toast.error("Failed to get previous generated images. Please try again.");
      setError(error.message || "Failed to get previous generated images.");
    }
  };

  const handleChangeImage = (newImage: string) => {
    if (onImageChange) {
      onImageChange(newImage, promptContent);
      setPreviewImages(newImage);
    }
  };

  // Focus point positioning
  const handleFocusPointClick = (e: React.MouseEvent) => {
    if (!isFocusPointMode || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const y = Math.max(
      0,
      Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
    );

    setFocusPoint({ x, y });
    saveImageProperties(objectFit, { x, y });

    imageRef.current.style.objectPosition = `${x}% ${y}%`;
  };

  const toggleFocusPointMode = () => {
    if (isFocusPointMode) {
      saveImageProperties(objectFit, focusPoint);
    }
    setIsFocusPointMode(!isFocusPointMode);
  };

  const handleFitChange = (fit: "cover" | "contain" | "fill") => {
    setObjectFit(fit);

    if (imageRef.current) {
      imageRef.current.style.objectFit = fit;
    }

    saveImageProperties(fit, focusPoint);
  };

  const saveImageProperties = (
    fit: "cover" | "contain" | "fill",
    focusPoint: { x: number; y: number }
  ) => {
    const propertiesData = {
      initialObjectFit: fit,
      initialFocusPoint: focusPoint,
    };
    onFocusPointClick?.(propertiesData);
  };

  // Generate image with AI
  const handleGenerateImage = async () => {
    if (!prompt) {
      setError("Please enter a prompt");
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      trackEvent(MixpanelEvent.ImageEditor_GenerateImage_API_Call);

      const response = await PresentationGenerationApi.generateImage({
        prompt,
      });
      setPreviewImages(response);
    } catch (err: any) {
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload custom image
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size should be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      trackEvent(MixpanelEvent.ImageEditor_UploadImage_API_Call);

      const result = await ImagesApi.uploadImage(file);
      setUploadedImageUrl(result.path);
    } catch (err: any) {
      setUploadError("Failed to upload image.");
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const getUploadedImages = async () => {
    try {
      setUploadedImagesLoading(true);
      const result = await ImagesApi.getUploadedImages();
      setUploadedImages(result);
    } catch (err: any) {
      toast.error(err.message || "Failed to get uploaded images.");
    } finally {
      setUploadedImagesLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "upload") {
      getUploadedImages();
    }
  };

  const handleDeleteImage = async (image_id: string) => {
    try {
      const result = await ImagesApi.deleteImage(image_id);
      setUploadedImages(uploadedImages.filter((img) => img.id !== image_id));
      toast.success(result.message || "Image deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete image.");
    }
  };

  return (
    <div className="image-editor-container">
      <Sheet open={isOpen} onOpenChange={() => handleClose()}>
        <SheetContent
          side="right"
          className="w-[600px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetHeader>
            <SheetTitle>Update Image</SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <Tabs defaultValue="generate" className="w-full" onValueChange={handleTabChange}>
              <TabsList className="grid bg-blue-100 border border-blue-300 w-full grid-cols-3 mx-auto">
                <TabsTrigger className="font-medium" value="generate">
                  AI Generate
                </TabsTrigger>
                <TabsTrigger className="font-medium" value="upload">
                  Upload
                </TabsTrigger>
                <TabsTrigger className="font-medium" value="edit">
                  Edit
                </TabsTrigger>
              </TabsList>

              {/* ✅ Generate Tab */}
              <TabsContent value="generate" className="mt-4 space-y-4 overflow-y-auto hide-scrollbar h-[85vh]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Current Prompt</h3>
                    <p className="text-sm text-gray-500">{promptContent}</p>
                  </div>

                  <div>
                    <h3 className="text-base font-medium mb-2">Image Description</h3>
                    <Textarea
                      placeholder="Describe the image you want to generate..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button onClick={handleGenerateImage} className="w-full" disabled={!prompt || isGenerating}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate Image"}
                  </Button>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <div className="grid grid-cols-2 gap-4">
                    {isGenerating || !previewImages ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
                      ))
                    ) : (
                      <div
                        onClick={() => handleChangeImage(previewImages)}
                        className="aspect-[4/3] w-full overflow-hidden rounded-lg border cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <img src={previewImages} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {previousGeneratedImages.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">Previous Generated Images</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {previousGeneratedImages.map((image) => (
                          <div
                            key={image.id}
                            onClick={() => handleChangeImage(image.path)}
                            className="aspect-[4/3] w-full overflow-hidden rounded-lg border cursor-pointer hover:border-blue-500 transition-colors"
                          >
                            <img src={image.path} alt={image.extras.prompt} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ✅ Upload Tab */}
              <TabsContent value="upload" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                      isUploading ? "border-gray-400 bg-gray-50" : "border-gray-300 hover:border-blue-400"
                    )}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className={cn("flex flex-col items-center", isUploading ? "cursor-wait" : "cursor-pointer")}
                    >
                      {isUploading ? (
                        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mb-2" />
                      ) : (
                        <Upload className="w-8 h-8 text-gray-500 mb-2" />
                      )}
                      <span className="text-sm text-gray-600">
                        {isUploading ? "Uploading..." : "Click to upload an image"}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">Max file size: 5MB</span>
                    </label>
                  </div>

                  {uploadError && <p className="text-red-500 text-sm text-center">{uploadError}</p>}

                  {(uploadedImageUrl || isUploading) && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">Uploaded Image Preview</h3>
                      <div className="aspect-[4/3] relative rounded-lg overflow-hidden border border-gray-200">
                        {isUploading ? (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <div>
                              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mb-2" />
                              <span className="text-sm text-gray-500">Processing...</span>
                            </div>
                          </div>
                        ) : (
                          uploadedImageUrl && (
                            <div
                              onClick={() => handleChangeImage(uploadedImageUrl)}
                              className="cursor-pointer group w-full h-full"
                            >
                              <img src={uploadedImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="bg-white/90 px-3 py-1 rounded-full text-sm font-medium">Click to use this image</span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium mb-2">Uploaded Images:</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {uploadedImagesLoading ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        uploadedImages.map((image) => (
                          <div key={image.id}>
                            <div
                              onClick={() => handleChangeImage(image.path)}
                              className="cursor-pointer group aspect-[4/3] rounded-lg overflow-hidden relative border border-gray-200"
                            >
                              <Trash
                                className="absolute group-hover:opacity-100 opacity-0 transition-opacity z-10 w-4 h-4 top-2 right-2 text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteImage(image.id);
                                }}
                              />
                              <img src={image.path} className="w-full h-full object-cover group-hover:scale-105 transition" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium">Use</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ✅ Edit Tab */}
              <TabsContent value="edit" className="mt-4 space-y-4">
                <h3 className="text-sm font-medium mb-2">Current Image</h3>

                <div
                  className="aspect-[4/3] rounded-lg overflow-hidden relative border border-gray-200 group"
                  onClick={(e) => isFocusPointMode && handleFocusPointClick(e)}
                >
                  <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-white bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                    Click to Change Focus Point
                  </p>

                  {previewImages && (
                    <img
                      ref={imageRef}
                      src={previewImages}
                      onClick={() => setIsFocusPointMode(true)}
                      style={{
                        objectFit,
                        objectPosition: `${focusPoint.x}% ${focusPoint.y}%`,
                      }}
                      className="w-full h-full"
                    />
                  )}

                  {isFocusPointMode && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="text-white bg-black/50 p-2 rounded text-center">
                        <p className="text-sm">Click anywhere to set focus point</p>
                        <button
                          className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFocusPointMode();
                          }}
                        >
                          Done
                        </button>
                      </div>

                      <div
                        className="absolute w-8 h-8 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${focusPoint.x}%`,
                          top: `${focusPoint.y}%`,
                          boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Object Fit</h3>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className={cn(objectFit === "cover" && "bg-blue-50 border-blue-500")}
                      onClick={() => handleFitChange("cover")}
                    >
                      Cover
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(objectFit === "contain" && "bg-blue-50 border-blue-500")}
                      onClick={() => handleFitChange("contain")}
                    >
                      Contain
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(objectFit === "fill" && "bg-blue-50 border-blue-500")}
                      onClick={() => handleFitChange("fill")}
                    >
                      Fill
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default React.memo(ImageEditor);
