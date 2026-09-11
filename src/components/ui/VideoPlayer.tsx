"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

export function VideoPlayer({ url, className }: { url: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isWaitingToPlay, setIsWaitingToPlay] = useState(false);
  
  // Generate a stable unique ID for this instance
  const videoId = useRef(Math.random().toString(36)).current;

  // Cloudinary trick: Change .mp4 to .jpg for an instant thumbnail
  const posterUrl = url.replace(/\.(mp4|webm|ogg)$/i, ".jpg");

  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== videoId) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };
    window.addEventListener("videoplayer-play", handleGlobalPlay);
    return () => window.removeEventListener("videoplayer-play", handleGlobalPlay);
  }, [videoId]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsWaitingToPlay(true);
      if (!isLoaded) {
        setIsLoaded(true); // This will trigger the src to be set
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setIsWaitingToPlay(false);
          window.dispatchEvent(new CustomEvent("videoplayer-play", { detail: videoId }));
        });
      }
    }
  };

  // Called automatically when video has loaded enough data to play (triggered by setting isLoaded=true)
  const handleCanPlay = () => {
    if (isWaitingToPlay && videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setIsWaitingToPlay(false);
        window.dispatchEvent(new CustomEvent("videoplayer-play", { detail: videoId }));
      }).catch((e) => {
        console.error("Autoplay failed:", e);
        setIsWaitingToPlay(false);
      });
    }
  };

  return (
    <div className={`relative group ${className}`} onClick={togglePlay}>
      <video
        ref={videoRef}
        src={isLoaded ? url : undefined}
        poster={posterUrl}
        preload="none"
        loop
        playsInline
        muted
        onCanPlay={handleCanPlay}
        onLoadedData={handleCanPlay}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 cursor-pointer"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      
      {/* Dark overlay when paused to make play button visible */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 pointer-events-none" />
      )}

      {/* Play/Pause Button */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
        <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110">
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : isWaitingToPlay ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-6 h-6 ml-1 fill-white" />
          )}
        </div>
      </div>
    </div>
  );
}
