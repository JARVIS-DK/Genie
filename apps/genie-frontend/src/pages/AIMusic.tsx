import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Play, Music, Loader2, X, Volume2, Volume1, VolumeX, Pause, Bot, PanelLeft } from 'lucide-react';
import { apiRequest } from '../services/api_request';
import AIMediaPopup from "@/components/AIMediaPopup";
import AIMediaCard from "@/components/AIMediaCard";

interface PageProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  audioUrl: string;
  duration: string; // formatted duration label shown in the card, e.g. "2:30"
}

// Sample API response interface
interface ApiResponse {
  tracks: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      images: Array<{ url: string }>;
    };
    preview_url: string;
    duration_ms: number;
  }[];
}

// Helper function to format duration from milliseconds to MM:SS
const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
};

export default function AIPodsPage({ isSidebarOpen, onToggleSidebar }: PageProps) {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  // Track which songs already had their durations preloaded
  const preloadedDurationsRef = useRef<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [showChatBox, setShowChatBox] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerateMusic = useCallback(async () => {
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      const resp = await apiRequest<any>({
        url: '/chat/execute/generate-audio',
        method: 'POST',
        isAuth: true,
        payload: { query: prompt },
      });

      const inner = resp?.data?.data || resp?.data || resp;
      const audioTitle = inner?.audio_title || `Generated: ${prompt}`;
      const audioUrl = inner?.audio_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      const imageUrl = inner?.image_url || '/no_preview_image.png';

      const newSong: Song = {
        id: `generated-${Date.now()}`,
        title: audioTitle,
        artist: 'AI Generated',
        imageUrl,
        audioUrl,
        // Duration is initially unknown; will be updated when metadata loads
        duration: '0:00',
      };

      setSongs((prevSongs) => [newSong, ...prevSongs]);
      setError(null);
    } catch (err) {
      console.error('Error generating music:', err);
      setError('Failed to generate music. Please try again.');
    } finally {
      // Close the chat box and reset the prompt
      setIsGenerating(false);
      setShowChatBox(false);
      setPrompt('');
    }
  }, [prompt]);

  // Load saved volume and mute state from localStorage
  useEffect(() => {
    const savedVolume = localStorage.getItem('musicPlayerVolume');
    const savedMuted = localStorage.getItem('musicPlayerMuted');
    
    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      setVolume(volume);
    }
    
    if (savedMuted) {
      setIsMuted(savedMuted === 'true');
    }
  }, []);

  // Preload audio metadata so durations are populated in cards
  useEffect(() => {
    const controllers: HTMLAudioElement[] = [];

    songs.forEach((song) => {
      // Skip if we already computed duration for this song or it already has a non-default label
      if (preloadedDurationsRef.current.has(song.id) || song.duration !== '0:00') return;

      const audio = new Audio();
      audio.src = song.audioUrl;

      const onLoadedMetadata = () => {
        const durationLabel = formatDuration(audio.duration * 1000);
        setSongs((prev) =>
          prev.map((s) => (s.id === song.id ? { ...s, duration: durationLabel } : s))
        );
        preloadedDurationsRef.current.add(song.id);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      controllers.push(audio);
    });

    // Cleanup created audio elements and listeners
    return () => {
      controllers.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [songs]);

  // Update audio element when volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
      // Save volume to localStorage
      localStorage.setItem('musicPlayerVolume', volume.toString());
      localStorage.setItem('musicPlayerMuted', isMuted.toString());
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const fetchMusic = async () => {
      try {
        setIsLoading(true);
        const resp = await apiRequest<any>({
          url: '/chat/get-generated-audios',
          method: 'GET',
          isAuth: true,
        });

        const data = resp?.data;
        if (!data) {
          setSongs([]);
          setError(null);
          return;
        }

        const items = Array.isArray(data) ? data : [data];
        const formattedSongs: Song[] = items
          .slice()
          .reverse()
          .map((it: any) => ({
            id: String(it.id ?? it._id ?? Date.now()),
            title: it.audio_title || 'AI Generated Audio',
            artist: 'AI Generated',
            imageUrl: it.image_url || '/no_preview_image.png',
            audioUrl: it.audio_url,
            // Duration is not provided by backend; will be updated when metadata loads
            duration: '0:00',
          }))
          .filter((song) => !!song.audioUrl);

        setSongs(formattedSongs);
        setError(null);
      } catch (err) {
        console.error('Error fetching generated audios:', err);
        setSongs([]);
        setError('Failed to load music. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMusic();
  }, []);

  const handleCardClick = (song: Song) => {
    setSelectedSong(song);
    setIsPlaying(false);
    setImageLoading(true); // Reset image loading state
    // Reset audio time when selecting a new song
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const closePopup = () => {
    setSelectedSong(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      // Save volume state to localStorage
      localStorage.setItem('musicPlayerVolume', isMuted ? volume.toString() : '0');
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      setDuration(audioDuration);

      // Update the selected song's duration label in the cards
      if (selectedSong) {
        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            song.id === selectedSong.id
              ? { ...song, duration: formatTime(audioDuration) }
              : song
          )
        );
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = false;
      setIsMuted(false);
      // Save volume to localStorage
      localStorage.setItem('musicPlayerVolume', newVolume.toString());
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Effect to handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSong) {
        closePopup();
      } else if (e.key === ' ' && selectedSong) {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSong, isPlaying]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {isSidebarOpen ? (
              <Bot className="h-7 w-7 text-primary" />
            ) : (
              <img src="/logo.png" alt="opsMatrix" className="h-7 w-7 object-contain" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white">opsMatrix Super Agent</h1>
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

          <div className="h-full overflow-y-auto p-8 relative">
            {/* Song detail popup via shared component */}
            <AIMediaPopup
              open={!!selectedSong}
              title={selectedSong?.title ?? ''}
              imageUrl={selectedSong?.imageUrl}
              audioUrl={selectedSong?.audioUrl}
              onClose={closePopup}
            />

            {/* Create Music Chat Box */}
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
                    onClick={(e) => {
                      if (!isGenerating) e.stopPropagation();
                    }}
                  >
                    <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Generate New Podcast</h3>
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
                          placeholder="Describe the podcast you want to create..."
                          className="w-full h-32 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isGenerating}
                        />
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={handleGenerateMusic}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Generating…</span>
                              </span>
                            ) : (
                              'Generate Pods'
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
              ) : !isLoading && songs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Music className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white">No generated podcasts yet</h2>
                    <p className="text-muted-foreground max-w-md text-sm">
                      Click the button below to create wonderful AI-generated tracks and start your playlist.
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
                        <Music className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold text-white">AI Generated Podcasts</h2>
                        <p className="text-muted-foreground text-sm">
                          Explore and listen to AI generated podcasts and tracks.
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
                    {songs.map((song) => (
                      <motion.div
                        key={song.id}
                        className="relative bg-gray-800/50 rounded-lg overflow-hidden cursor-pointer group hover:bg-gray-700/50 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
                        onClick={() => handleCardClick(song)}
                        onMouseEnter={() => setHoveredCard(song.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <AIMediaCard
                          imageUrl={song.imageUrl}
                          fallbackImageUrl="/no_preview_image.png"
                          title={song.title}
                          aspect="square"
                          outerClassName=""
                          hoverOverlay={
                            hoveredCard === song.id ? (
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
                          <h3 className="font-semibold text-lg truncate" title={song.title}>{song.title}</h3>
                          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">{song.duration}</span>
                            <span className="text-xs px-2 py-1 bg-gray-700/50 rounded-full">AI</span>
                          </div>
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
