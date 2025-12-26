import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Play, Music, Loader2, X, Volume2, Volume1, VolumeX, Pause, Bot, PanelLeft } from 'lucide-react';
import { apiRequest } from '../services/api_request';

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
  duration: string;
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
      const imageUrl = inner?.image_url || `https://source.unsplash.com/random/300x300/?music,${Date.now()}`;

      const newSong: Song = {
        id: `generated-${Date.now()}`,
        title: audioTitle,
        artist: 'AI Generated',
        imageUrl,
        audioUrl,
        // Duration is unknown from API, use a placeholder label
        duration: '2:30',
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
            imageUrl:
              it.image_url ||
              `https://source.unsplash.com/random/300x300/?music,${it.id ?? it._id ?? 'audio'}`,
            audioUrl: it.audio_url,
            // Duration is not provided by backend, use placeholder label
            duration: '2:30',
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
      setDuration(audioRef.current.duration);
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
        {/* Audio Element (hidden) */}
        <audio
          ref={audioRef}
          src={selectedSong?.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        {/* Popup Overlay */}
        <AnimatePresence>
          {selectedSong && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                onClick={closePopup}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                  <div className="flex p-4">
                    {/* Album Art */}
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      )}
                      <img 
                        src={selectedSong.imageUrl} 
                        alt={selectedSong.title}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setImageLoading(false)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          // target.src = `https://source.unsplash.com/random/300x300/?music,${selectedSong.id}`;
                          setImageLoading(false);
                        }}
                      />
                    </div>
                    
                    {/* Song Info and Controls */}
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate" title={selectedSong.title}>{selectedSong.title}</h3>
                          <p className="text-xs text-gray-400 truncate">{selectedSong.artist}</p>
                        </div>
                        <button 
                          onClick={closePopup}
                          className="ml-2 p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="relative h-1 bg-gray-700 rounded-full mb-1">
                          <div 
                            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                          />
                          <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-2xs text-gray-400">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center justify-between mt-2">
                        <button 
                          onClick={toggleMute}
                          className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700"
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-4 w-4" />
                          ) : volume > 0.5 ? (
                            <Volume2 className="h-4 w-4" />
                          ) : (
                            <Volume1 className="h-4 w-4" />
                          )}
                        </button>
                        
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={togglePlay}
                            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center mx-1"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4 text-white" fill="white" />
                            ) : (
                              <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
                        {isGenerating ? 'Generating…' : 'Generate Pods'}
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
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">AI Generated Podcasts</h1>
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
                    <div className="relative aspect-square">
                      <img 
                        src={song.imageUrl} 
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback image if the original fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = `https://source.unsplash.com/random/300x300/?music,${song.id}`;
                        }}
                      />
                      {hoveredCard === song.id && (
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
                      <h3 className="font-semibold text-lg truncate" title={song.title}>{song.title}</h3>
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{song.duration}</span>
                        <span className="text-xs px-2 py-1 bg-gray-700/50 rounded-full">AI</span>
                      </div>
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
