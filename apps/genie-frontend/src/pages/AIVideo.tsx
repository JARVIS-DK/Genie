import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Play, Loader2, X, Bot, PanelLeft, Clapperboard } from 'lucide-react';
import { apiRequest } from '../services/api_request';
import AIMediaPopup from "@/components/AIMediaPopup";
import AIMediaCard from "@/components/AIMediaCard";

interface PageProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
}

export default function AIVideoPage({ isSidebarOpen, onToggleSidebar }: PageProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showChatBox, setShowChatBox] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateVideo = useCallback(async () => {
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      const resp = await apiRequest<any>({
        url: '/chats/execute/generate-video',
        method: 'POST',
        isAuth: true,
        payload: { query: prompt, video_model: "veo-3.1-fast-generate-preview" },
      });

      const inner = resp?.data?.data || resp?.data || resp;
      const videoUrl: string | undefined = inner?.video_url;
      if (!videoUrl) {
        throw new Error('No video URL returned from backend');
      }

      const id = `generated-${Date.now()}`;
      const thumbnailUrl = '/no_preview_image.png';

      const newVideo: VideoItem = {
        id,
        title: `Generated: ${prompt}`,
        videoUrl,
        thumbnailUrl,
        // Duration is unknown from backend, placeholder label
        duration: 'Short',
      };

      setVideos((prev) => [newVideo, ...prev]);
      setError(null);
    } catch (err) {
      console.error('Error generating video:', err);
      setError('Failed to generate video. Please try again.');
    } finally {
      setIsGenerating(false);
      setShowChatBox(false);
      setPrompt('');
    }
  }, [prompt]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const resp = await apiRequest<any>({
          url: '/chat/get-generated-videos',
          method: 'GET',
          isAuth: true,
        });

        const data = resp?.data;
        if (!data) {
          setVideos([]);
          setError(null);
          return;
        }

        const items = Array.isArray(data) ? data : [data];
        const formatted: VideoItem[] = items
          .slice()
          .reverse()
          .map((it: any) => {
            const rawId = it.id ?? it._id ?? Date.now();
            const id = String(rawId);
            const videoUrl: string | undefined = it.video_url;
            if (!videoUrl) return null;
            const title = it.video_title || 'AI Generated Video';
            const thumbnailUrl = '/no_preview_image.png';

            return {
              id,
              title,
              videoUrl,
              thumbnailUrl,
              duration: 'Short',
            } as VideoItem;
          })
          .filter((v): v is VideoItem => !!v);

        setVideos(formatted);
        setError(null);
      } catch (err) {
        console.error('Error fetching generated videos:', err);
        setVideos([]);
        setError('Failed to load videos. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 relative overflow-hidden">
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

          <div className="h-full overflow-y-auto p-8 relative" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
          {/* Video modal */}
          <AIMediaPopup
            open={!!selectedVideo}
            title={selectedVideo?.title ?? ''}
            videoUrl={selectedVideo?.videoUrl}
            onClose={() => setSelectedVideo(null)}
          />

          {/* Create Video Chat Box */}
          <AnimatePresence>
            {showChatBox && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                  onClick={() => {
                    if (!isGenerating) setShowChatBox(false);
                  }}
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Generate New Video</h3>
                      <button
                        onClick={() => {
                          if (!isGenerating) setShowChatBox(false);
                        }}
                        className="p-1 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGenerating}
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the video you want to create..."
                        className="w-full h-32 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGenerating}
                      />
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleGenerateVideo}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Generating…</span>
                            </span>
                          ) : (
                            'Generate Video'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="max-w-7xl mx-auto h-full">
            {isLoading ? (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-5 w-56 bg-gray-700/60 rounded animate-pulse" />
                      <div className="h-4 w-64 bg-gray-700/40 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-9 w-24 bg-blue-600/60 rounded-lg animate-pulse" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="relative bg-gray-800/50 rounded-lg overflow-hidden shadow-lg animate-pulse"
                    >
                      <div className="aspect-square bg-gray-700/80" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-700/70 rounded" />
                        <div className="h-3 w-1/2 bg-gray-700/50 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : !isLoading && videos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Clapperboard className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">No generated videos yet</h2>
                  <p className="text-muted-foreground max-w-md text-sm">
                    Click the button below to create wonderful AI-generated videos and start your library.
                  </p>
                </div>
                <button
                  onClick={() => setShowChatBox(true)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                >
                  Create
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                      <Clapperboard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">AI Generated Videos</h2>
                      <p className="text-muted-foreground text-sm">
                        Explore and watch AI generated videos in your library.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChatBox(true)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                  >
                    Create
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {videos.map((video) => (
                    <motion.div
                      key={video.id}
                      className="relative bg-gray-800/50 rounded-lg overflow-hidden cursor-pointer group hover:bg-gray-700/50 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
                      onClick={() => setSelectedVideo(video)}
                      onMouseEnter={() => setHoveredCard(video.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AIMediaCard
                        imageUrl={video.thumbnailUrl}
                        fallbackImageUrl="/no_preview_image.png"
                        title={video.title}
                        aspect="square"
                        outerClassName=""
                        hoverOverlay={
                          hoveredCard === video.id ? (
                            <motion.div
                              className="absolute inset-0 bg-black/60 flex items-center justify-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Play className="text-white h-6 w-6 ml-1" fill="white" />
                              </div>
                            </motion.div>
                          ) : null
                        }
                      >
                        <h3 className="font-semibold text-lg truncate" title={video.title}>
                          {video.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">{video.duration}</p>
                      </AIMediaCard>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
