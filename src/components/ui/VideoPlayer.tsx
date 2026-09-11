"use client";

import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cloudinary trick: Change .mp4 to .jpg for an instant thumbnail
  const posterUrl = url.replace(/\.(mp4|webm|ogg)$/i, ".jpg");

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        setIsLoaded(true);
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <video
        ref={videoRef}
        src={isLoaded ? url : undefined}
        poster={posterUrl}
        preload="none"
        loop
        playsInline
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Dark overlay when paused to make play button visible */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 pointer-events-none" />
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity"
      >
        <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110">
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-white opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <Play className="w-6 h-6 ml-1 fill-white" />
          )}
        </div>
      </button>
    </div>
  );
}
