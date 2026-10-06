"use client";
/* eslint-disable @next/next/no-img-element -- Cloudinary already serves resized, optimised images */

import { useRef, useState } from "react";
import { cldImage } from "@/lib/images";

// Main photos sit in a native scroll-snap strip: swipe on phones, thumbnails or
// dots to jump. No carousel library and no extra JS beyond tracking the index.
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const hasMany = images.length > 1;

  const goTo = (index: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollTo({ left: index * strip.clientWidth, behavior: "smooth" });
    setActive(index);
  };

  const handleScroll = () => {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    if (index !== active) setActive(Math.min(images.length - 1, Math.max(0, index)));
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 w-full">
      {hasMany && (
        <div className="flex lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar lg:w-20 shrink-0">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-pressed={i === active}
              className={`relative w-14 lg:w-full bg-secondary overflow-hidden shrink-0 touch-manipulation ${i === active ? "ring-1 ring-foreground" : "opacity-60 hover:opacity-100 transition-opacity"}`}
              style={{ aspectRatio: "3/4" }}
            >
              <img src={cldImage(img, 200)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 w-full min-w-0">
        <div
          ref={stripRef}
          onScroll={hasMany ? handleScroll : undefined}
          className="flex w-full overflow-x-auto snap-x snap-mandatory hide-scrollbar overscroll-x-contain bg-secondary"
          style={{ aspectRatio: "3/4" }}
          aria-roledescription={hasMany ? "carousel" : undefined}
          aria-label={hasMany ? `${name} photos` : undefined}
        >
          {images.map((img, i) => (
            <div key={img + i} className="relative w-full h-full shrink-0 snap-center overflow-hidden group">
              <img
                src={cldImage(img, 1200)}
                alt={hasMany ? `${name} – photo ${i + 1} of ${images.length}` : name}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out lg:group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        {hasMany && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2 lg:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-foreground" : "w-2 bg-foreground/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
