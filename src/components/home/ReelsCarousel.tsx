import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export function ReelsCarousel({ settings }: { settings?: Record<string, string> }) {
  let reels: string[] = [];
  try {
    if (settings?.reels_array) reels = JSON.parse(settings.reels_array);
  } catch(e) {}
  
  if (reels.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-background overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-foreground/20" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-foreground/70">
              Behind the brand
            </span>
            <div className="h-[1px] w-12 bg-foreground/20" />
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-foreground">
            Watch Our <span className="text-primary italic">Reels</span>
          </h2>
        </div>

        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reels.map((url, i) => (
            <div 
              key={i}
              className="relative w-[180px] sm:w-[220px] lg:w-[260px] aspect-[9/16] rounded-[24px] overflow-hidden group flex-shrink-0 snap-center bg-secondary shadow-sm"
            >
              {url.match(/\.(mp4|webm|ogg)$/i) ? (
                <VideoPlayer url={url} className="w-full h-full" />
              ) : (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ backgroundImage: `url('${url}')` }}
                />
              )}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link 
            href="https://www.instagram.com/rebel_seasonn/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 transition-colors duration-300 font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            <span>Follow us on Instagram</span>
          </Link>
        </div>

      </div>
    </section>
  );
}
