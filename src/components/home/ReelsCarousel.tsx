import { VideoPlayer } from "@/components/ui/VideoPlayer";

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

        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide">
          {reels.map((url, i) => (
            <div 
              key={i}
              className="relative w-[240px] sm:w-[280px] lg:w-[320px] aspect-[9/16] rounded-[24px] overflow-hidden group flex-shrink-0 snap-center bg-secondary shadow-sm"
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

      </div>
    </section>
  );
}
