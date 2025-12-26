import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bot, PanelLeft, Image as ImageIcon } from "lucide-react";
import { apiRequest, apiDownload } from '../services/api_request';

interface PageProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface ImageData {
  url: string;
  caption: string;
}

const AIImage: React.FC<PageProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChatBox, setShowChatBox] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async (imageUrl: string, caption: string) => {
    // Helper to create a safe filename
    const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_\-\.]/gi, '_').slice(0, 128);
    const getExtensionFromUrl = (url: string) => {
      try {
        const m = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        return m ? `.${m[1]}` : '';
      } catch {
        return '';
      }
    };

    try {
      // Attempt to fetch the image as a blob (may fail if CORS headers are missing)
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;

      // Prefer extension from the URL, fallback to blob MIME type
      const ext = getExtensionFromUrl(imageUrl) || (blob.type ? `.${blob.type.split('/')[1]}` : '');
      const baseName = caption ? sanitizeFilename(caption) : 'image';
      link.download = `${baseName}${ext}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.warn('Fetch failed locally, attempting backend proxy download:', error);
      try {
        // Ask backend to fetch the resource and return it so browser can download directly
        const blob = await apiDownload({ url: '/chat/download-proxy', payload: { url: imageUrl }, isAuth: true });
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        const extMatch = imageUrl.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        const ext = extMatch ? `.${extMatch[1]}` : '';
        const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_\-\.]/gi, '_').slice(0, 128);
        link.download = `${sanitizeFilename(caption)}${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      } catch (proxyErr) {
        console.error('Proxy download failed as well:', proxyErr);
        // Fallback to opening in new tab if proxy also fails
        const link = document.createElement('a');
        link.href = imageUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  useEffect(() => {
    const fetchGenerated = async () => {
      try {
        setLoading(true);
        const resp = await apiRequest<any>({ url: '/chat/get-generated-images', method: 'GET', isAuth: true });
        const data = resp?.data;
        if (!data) {
          setImages([]);
          return;
        }
        const items = Array.isArray(data) ? data : [data];
        const generated: ImageData[] = items
          .slice()
          .reverse()
          .map((it: any) => ({
          url:
            it.image_url ||
            'https://source.unsplash.com/random/800x1000/?ai,generative,abstract',
          caption:
            it.enhanced_query ||
            it.image_title ||
            it.user_query ||
            it.image_query ||
            'Generated Image',
          }));

        setImages(generated);
      } catch (err) {
        console.error('Error fetching generated images:', err);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGenerated();
  }, []);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      const resp = await apiRequest<any>({
        url: '/chat/execute/generate-image',
        method: 'POST',
        isAuth: true,
        payload: {
          query: prompt,
          image_model: 'gemini-3-pro-image-preview',
          image_size: '1K',
          aspect_ratio: '1:1',
          number_of_images: 1,
          image_urls: [],
        },
      });

      const imageUrls = resp?.data?.data?.image_urls ?? [];
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;

      const newImages: ImageData[] = imageUrls.map((url: string) => ({
        url,
        caption: `Generated: ${prompt}`,
      }));

      setImages((prev) => [...newImages, ...prev]);
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsGenerating(false);
      setShowChatBox(false);
      setPrompt('');
    }
  };

  if (loading) {
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
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

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

      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-gray-900 to-black">
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

        <div className="h-full overflow-y-auto p-8 relative">
          <div className="max-w-[1920px] mx-auto h-full">
            {/* Empty state: no generated images */}
            {!loading && images.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">No generated images yet</h2>
                  <p className="text-muted-foreground max-w-md text-sm">
                    Click the button below to create wonderful AI-generated images and start your gallery.
                  </p>
                </div>
                <Button
                  onClick={() => setShowChatBox(true)}
                  className="px-8 py-3 shadow-md hover:shadow-lg"
                >
                  Create
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">AI Generated Images</h2>
                      <p className="text-muted-foreground text-sm">Explore and download AI generated visuals.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowChatBox(true)}
                    className="px-6 py-2 shadow-md hover:shadow-lg"
                  >
                    Create
                  </Button>
                </div>

                <div className="grid grid-cols-5 gap-6">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-slate-700 group"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-slate-700 relative">
                        <img
                          src={image.url}
                          alt={image.caption}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://source.unsplash.com/random/800x1000/?ai,generative,abstract';
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(image.url, image.caption);
                          }}
                          className="absolute top-3 right-3 bg-slate-900/80 hover:bg-blue-600 text-white p-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm"
                          title="Download image"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="p-4">
                        <p className="text-white text-sm font-medium line-clamp-3 leading-relaxed">
                          {image.caption}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {showChatBox && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/80"
                  onClick={() => {
                    if (!isGenerating) setShowChatBox(false);
                  }}
                />
                <div className="relative w-full max-w-md bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Generate New Image</h3>
                    <button
                      onClick={() => {
                        if (!isGenerating) setShowChatBox(false);
                      }}
                      className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isGenerating}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to create..."
                    className="w-full h-32 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isGenerating}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleGenerateImage}
                      className="px-4 py-2"
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating…' : 'Generate Image'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIImage;