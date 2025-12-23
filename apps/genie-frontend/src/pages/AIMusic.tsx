import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Music, Loader2 } from 'lucide-react';

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

export default function AIMusicPage({ isSidebarOpen, onToggleSidebar }: PageProps) {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMusic = async () => {
      try {
        setIsLoading(true);
        // In a real app, replace this with your actual API endpoint
        const response = await fetch('https://api.spotify.com/v1/search?q=genre:electronic&type=track&limit=20', {
          headers: {
            // In a real app, you would include proper authentication here
            // 'Authorization': `Bearer ${yourAuthToken}`
          }
        });

        if (!response.ok) {
          // If using a real API and getting 401/403, handle auth here
          throw new Error('Failed to fetch music data');
        }

        const data: ApiResponse = await response.json();
        
        // Transform the API response to match our Song interface
        const formattedSongs: Song[] = data.tracks.map(track => ({
          id: track.id,
          title: track.name,
          artist: track.artists[0]?.name || 'Unknown Artist',
          imageUrl: track.album.images[0]?.url || 'https://source.unsplash.com/random/300x300/?music,electronic',
          audioUrl: track.preview_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          duration: formatDuration(track.duration_ms)
        }));

        setSongs(formattedSongs);
        setError(null);
      } catch (err) {
        console.error('Error fetching music:', err);
        setError('Failed to load music. Using sample data instead.');
        
        // Fallback to sample data if API fails
        const sampleSongs: Song[] = Array.from({ length: 12 }, (_, i) => ({
          id: (i + 1).toString(),
          title: `AI Melody ${i + 1}`,
          artist: ['Neural Beats', 'Synth Wave', 'Digital Dreams', 'Future Bass'][i % 4],
          imageUrl: `https://source.unsplash.com/random/300x300/?music,electronic,${i}`,
          audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 5) + 1}.mp3`,
          duration: `${Math.floor(Math.random() * 3) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
        }));
        
        setSongs(sampleSongs);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMusic();
  }, []);

  const handleCardClick = (song: Song) => {
    navigate(`/music/${song.id}`, { state: { song } });
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg hover:bg-muted/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="3" x2="21" y1="6" y2="6" />
                <line x1="3" x2="21" y1="12" y2="12" />
                <line x1="3" x2="21" y1="18" y2="18" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">AI Music</h2>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">AI Generated Music</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {songs.map((song) => (
                <motion.div
                  key={song.id}
                  className="relative bg-gray-800/50 rounded-lg overflow-hidden cursor-pointer group hover:bg-gray-700/50 transition-colors"
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
          )}
        </div>
      </div>
    </div>
  );
}
