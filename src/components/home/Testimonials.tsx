import { Star } from "lucide-react";
import { VideoPlayer } from "@/components/ui/VideoPlayer";

export function Testimonials({ settings }: { settings?: Record<string, string> }) {
  let testimonials: string[] = [];
  try {
    if (settings?.testimonials_array) testimonials = JSON.parse(settings.testimonials_array);
  } catch(e) {}
  
  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 lg:py-32 bg-[#F9F9F9] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col items-center text-center mb-16 lg:mb-24">
          <div className="flex gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-5 h-5 fill-black text-black" />
            ))}
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-foreground leading-tight max-w-3xl">
            Loved by Rebels <br className="hidden sm:block" />
            <span className="text-foreground/50">Everywhere.</span>
          </h2>
        </div>

        <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-8 snap-x snap-mandatory scrollbar-hide">
          {testimonials.map((url, i) => (
            <div 
              key={i}
              className="relative w-[300px] sm:w-[350px] aspect-[4/5] rounded-[24px] overflow-hidden flex-shrink-0 snap-center group shadow-sm"
            >
              {url.match(/\.(mp4|webm|ogg)$/i) ? (
                <VideoPlayer url={url} className="w-full h-full" />
              ) : (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${url}')` }}
                />
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
