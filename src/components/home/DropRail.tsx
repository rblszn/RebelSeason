"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** A horizontal, swipeable row with arrow buttons for mouse users. Native scroll-snap does the sliding. */
export function DropRail({ children }: { children: React.ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollByPage = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-background backdrop-blur-md transition hover:bg-background hover:text-foreground md:flex";

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="hide-scrollbar -mx-4 flex scroll-pl-4 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:gap-5 sm:px-6 lg:-mx-8 lg:scroll-pl-8 lg:px-8"
      >
        {children}
      </div>
      <button type="button" onClick={() => scrollByPage(-1)} aria-label="Previous pieces" className={`${arrow} -left-2 lg:-left-5`}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => scrollByPage(1)} aria-label="Next pieces" className={`${arrow} -right-2 lg:-right-5`}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
