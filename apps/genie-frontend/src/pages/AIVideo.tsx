import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Play, Loader2, X, Bot, PanelLeft, Clapperboard } from 'lucide-react';
import { apiRequest } from '../services/api_request';

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
        url: '/chat/execute/generate-video',
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
      const thumbnailUrl = `https://source.unsplash.com/random/640x360/?video,${id}`;

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
            const thumbnailUrl = `https://source.unsplash.com/random/640x360/?video,${id}`;

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
          {/* Video modal */}
          <AnimatePresence>
            {selectedVideo && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                  onClick={() => setSelectedVideo(null)}
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full max-w-3xl bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clapperboard className="h-5 w-5 text-primary" />
                        <h3 className="text-sm font-semibold truncate" title={selectedVideo.title}>
                          {selectedVideo.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedVideo(null)}
                        className="p-1 rounded-full hover:bg-gray-800 transition-colors"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="bg-black">
                      <video
                        src={selectedVideo.videoUrl}
                        controls
                        className="w-full h-auto max-h-[70vh]"
                      />
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

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
                          {isGenerating ? 'Generating…' : 'Generate Video'}
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
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
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
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-4xl font-bold">AI Generated Videos</h1>
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
                      <div className="relative aspect-video">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://source.unsplash.com/random/640x360/?video,${video.id}`;
                          }}
                        />
                        {hoveredCard === video.id && (
                          <motion.div
                            className="absolute inset-0 bg-black/60 flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                              <Play className="text-white h-6 w-6 ml-1" fill="white" />
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg truncate" title={video.title}>
                          {video.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">{video.duration}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
