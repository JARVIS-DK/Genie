import React, { useState, useEffect } from 'react';
import { apiRequest, apiDownload } from '../services/api_request';

interface ImageData {
  url: string;
  caption: string;
}

const AIImage: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChatBox, setShowChatBox] = useState(false);
  const [prompt, setPrompt] = useState('');

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
    // Sample data for demonstration
    const sampleImages: ImageData[] = [
      {
        url: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba",
        caption: "Warner Bros Favors Netflix Offer Over $10B Paramount Bid"
      },
      {
        url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19",
        caption: "8-Day British Virgin Islands Sailing Adventure"
      },
      {
        url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8",
        caption: "Trump's Rush to Build Nuclear Reactors Across the U.S. Raises Safety Concerns"
      },
      {
        url: "https://images.unsplash.com/photo-1484723091739-30a097e8f929",
        caption: "Exploring Pittsburgh: A Weekend of Adventure, Culture, and Culinary Delights"
      },
      {
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
        caption: "US Economy Flashes Warning Signs in New Data, Some Analysts Say"
      },
      {
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        caption: "Madrid to Bilbao: A 7-Day Spanish Road Trip Adventure"
      },
      {
        url: "https://images.unsplash.com/photo-1518235506717-e1ed3306a89b",
        caption: "Exploring Mexico: A 2-Week Journey of Culture, Ruins, and Beaches"
      },
      {
        url: "https://imgs.search.brave.com/sqYtRdrzWoH2AZrlyWME0ovNtttM8H2SLTK5473aHiw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/cGl4YWJheS5jb20v/cGhvdG8vMjAyNC8w/Ny8zMS8xMi8yMC9z/eWRuZXktb3BlcmEt/aG91c2UtODkzNDU3/MF82NDAuanBn",
        caption: "Copenhagen in Five Days: A Comprehensive Itinerary"
      },
      {
        url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
        caption: "Exploring Siem Reap: A 3-Day Adventure Itinerary"
      },
      {
        url: "https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b",
        caption: "A Culinary and Cultural Journey Through Charleston and St. Petersburg"
      },
    ];

    // setImages(sampleImages);
    setLoading(false);

    // Fetch generated images from backend and merge with sample data
    const fetchGenerated = async () => {
      try {
        const resp = await apiRequest<any>({ url: '/chat/get-generated-images', method: 'GET', isAuth: true});
        const data = resp?.data;
        if (!data) return;
        const items = Array.isArray(data) ? data : [data];
        const generated: ImageData[] = items.map((it: any) => ({
          url: it.image_url,
          caption: it.enhanced_query || it.image_title || it.user_query || 'Generated Image',
        }));
        setImages((prev) => [...generated, ...prev]);
      } catch (err) {
        console.error('Error fetching generated images:', err);
      }
    };

    fetchGenerated();
  }, []);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;

    const newImage: ImageData = {
      url: `https://source.unsplash.com/random/800x1000/?ai,${Date.now()}`,
      caption: `Generated: ${prompt}`,
    };

    setImages((prev) => [newImage, ...prev]);
    setShowChatBox(false);
    setPrompt('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Header */}
      <div className="max-w-[1920px] mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">AI Generated Images</h1>
          <button
            onClick={() => setShowChatBox(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
          >
            Create
          </button>
        </div>
        <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-32"></div>
      </div>

      {/* Generate Image Modal */}
      {showChatBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowChatBox(false)}
          />
          <div className="relative w-full max-w-md bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Generate New Image</h3>
              <button
                onClick={() => setShowChatBox(false)}
                className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="w-full h-32 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleGenerateImage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Generate Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Container - FIXED 5 CARDS PER ROW, BIGGER CARDS */}
      <div className="max-w-[1920px] mx-auto">
        <div className="grid grid-cols-5 gap-6">
          {images.map((image, index) => (
            <div
              key={index}
              className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-slate-700 group"
            >
              {/* Image Container - Bigger */}
              <div className="aspect-[3/4] overflow-hidden bg-slate-700 relative">
                <img
                  src={image.url}
                  alt={image.caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Download Button */}
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
              
              {/* Caption below the image */}
              <div className="p-4">
                <p className="text-white text-sm font-medium line-clamp-3 leading-relaxed">
                  {image.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIImage;