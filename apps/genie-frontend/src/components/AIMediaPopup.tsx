import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, Volume2, VolumeX } from "lucide-react";

export interface AIMediaPopupProps {
  open: boolean;
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  onClose: () => void;
  onDownloadImage?: () => void;
}

const AIMediaPopup: React.FC<AIMediaPopupProps> = ({
  open,
  title,
  imageUrl,
  videoUrl,
  audioUrl,
  onClose,
  onDownloadImage,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset audio state when popup closes
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsMuted(false);
    }
  }, [open]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const formatTime = (time: number) => {
    if (!time || Number.isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const progressPercent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-full ${videoUrl ? 'max-w-3xl' : 'max-w-md'} bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700`}>
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white truncate" title={title}>
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 flex flex-col gap-4">
                {imageUrl && !videoUrl && (
                  <div className="w-full rounded-lg overflow-hidden bg-slate-900">
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-full h-auto object-contain max-h-[60vh]"
                    />
                  </div>
                )}

                {videoUrl && (
                  <div className="w-full rounded-lg overflow-hidden bg-black">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-auto max-h-[60vh]"
                    />
                  </div>
                )}

                {audioUrl && (
                  <div className="w-full mt-2 space-y-2">
                    {/* Hidden native audio element controlled via custom UI */}
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      className="hidden"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                    />

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors text-xs"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>

                      <div className="flex-1 flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={duration || 0}
                          step={0.1}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-gray-700/80"
                          style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progressPercent}%, rgba(55,65,81,0.8) ${progressPercent}%, rgba(55,65,81,0.8) 100%)`,
                          }}
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {onDownloadImage && imageUrl && !videoUrl && (
                  <div className="flex justify-end">
                    <Button
                      onClick={onDownloadImage}
                      size="icon"
                      variant="outline"
                      className="rounded-full bg-gray-900/70 border-gray-700 hover:bg-gray-800"
                      aria-label="Download image"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIMediaPopup;
