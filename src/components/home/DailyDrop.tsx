/* eslint-disable @next/next/no-img-element -- Cloudinary already serves resized, optimised images */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DropCountdown } from "@/components/home/DropCountdown";
import { DropRail } from "@/components/home/DropRail";
import { compareSizes } from "@/lib/catalog-config";
import { DROP_TIME_LABEL, formatDropTime, formatDropDateTime, formatDropWeekday } from "@/lib/drop";
import { cldImage } from "@/lib/images";
import type { ProductCardData } from "@/lib/dal/catalog";

export type DropProduct = ProductCardData & { releaseAt: string };

export interface DailyDropData {
  products: DropProduct[];
  /** True once the store has used drops at all; until then the section stays out of the way. */
  enabled: boolean;
  nextDropAt: string;
}

const LOW_STOCK_AT = 3;

function Ticker() {
  const items = ["Daily Drop", "Today only", `New every day at ${DROP_TIME_LABEL}`, "Once it's gone, it's gone"];
  // The list is doubled so the scrolling strip loops without a visible jump.
  const loop = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/10 py-3" aria-hidden="true">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap motion-reduce:animate-none">
        {loop.map((text, i) => (
          <span key={i} className="flex items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.3em] text-background/70">
            {text}
            <span className="text-primary">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DropCard({ product, index }: { product: DropProduct; index: number }) {
  const image = cldImage(product.images[0], 800);
  const hoverImage = product.images.length > 1 ? cldImage(product.images[1], 800) : null;
  const totalStock = product.hasVariants ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0) : product.stock;
  const soldOut = totalStock <= 0;
  const onSale = product.originalPrice !== null && product.originalPrice > product.price;
  const sizes =
    product.category?.type === "CLOTHING" && product.hasVariants
      ? product.variants.filter((v) => v.stock > 0).map((v) => v.size).sort(compareSizes)
      : [];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative block w-[72%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white/5 sm:w-[44%] md:w-[31%] lg:w-[23.5%]"
      style={{ aspectRatio: "3 / 4.3" }}
      aria-label={`${product.name}, ${soldOut ? "sold out" : "view piece"}`}
    >
      {image && (
        <img
          src={image}
          alt=""
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${hoverImage ? "group-hover:opacity-0" : ""} ${soldOut ? "grayscale" : ""}`}
        />
      )}
      {hoverImage && (
        <img
          src={hoverImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
        />
      )}

      {/* Readability for the text at the bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/10" />

      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
        <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow">
          Dropped {formatDropTime(product.releaseAt)}
        </span>
        {soldOut ? (
          <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Sold out</span>
        ) : totalStock <= LOW_STOCK_AT ? (
          <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
            Only {totalStock} left
          </span>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-background">
        <h3 className="font-heading text-lg leading-snug sm:text-xl">{product.name}</h3>
        <p className="mt-1.5 flex items-center gap-2.5 text-sm">
          {onSale && <span className="text-background/55 line-through">₹{product.originalPrice?.toLocaleString("en-IN")}</span>}
          <span className="font-semibold">₹{product.price.toLocaleString("en-IN")}</span>
        </p>
        {sizes.length > 0 && <p className="mt-2 text-[11px] tracking-wide text-background/70">{sizes.join("  ·  ")}</p>}

        <span className="mt-4 flex h-0 items-center gap-1.5 overflow-hidden text-[11px] font-semibold uppercase tracking-[0.2em] opacity-0 transition-all duration-300 group-hover:h-5 group-hover:opacity-100">
          View piece <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * The Daily Drop: today's new pieces in a dark spotlight section right under the
 * hero, with a countdown to the next drop. After 24 hours a piece leaves this
 * section on its own and appears in New Arrivals. Between drops (or when none is
 * live) it shrinks to a "next drop in ..." teaser, and it stays out of the way
 * entirely until the store has used drops at least once.
 */
export function DailyDrop({ drop }: { drop: DailyDropData }) {
  const { products, enabled, nextDropAt } = drop;
  if (products.length === 0 && !enabled) return null;

  const nextLabel = formatDropDateTime(nextDropAt);
  // When this batch came out: the earliest release among today's pieces (they are listed newest first).
  const dropTime = products.length > 0 ? products[products.length - 1].releaseAt : nextDropAt;

  // Nothing live right now: a slim teaser keeps the habit alive.
  if (products.length === 0) {
    return (
      <section className="relative overflow-hidden bg-foreground text-background" aria-label="Next daily drop">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(248,200,220,0.22),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-[1600px] flex-col items-center gap-6 px-4 py-14 text-center sm:px-6 lg:flex-row lg:justify-between lg:px-8 lg:text-left">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Daily Drop</p>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl">The next drop is coming</h2>
            <p className="mt-2 text-sm text-background/65">New pieces land every day at {DROP_TIME_LABEL}. Next one: {nextLabel}.</p>
          </div>
          <DropCountdown target={nextDropAt} />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-foreground text-background" aria-labelledby="daily-drop-heading">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(248,200,220,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(248,200,220,0.10),transparent_50%)]" />

      <Ticker />

      <div className="relative mx-auto max-w-[1600px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-10 flex flex-col gap-8 sm:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="flex items-center gap-4 font-heading text-lg italic text-primary sm:text-xl">
              <span className="h-px w-10 bg-primary/70 sm:w-14" aria-hidden="true" />
              Out {formatDropWeekday(dropTime)} at {formatDropTime(dropTime)}
            </p>
            <h2 id="daily-drop-heading" className="mt-5 font-heading text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              The Daily Drop
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-background/65 sm:text-base">
              Fresh off the rack and here for today only. By tomorrow these pieces move to New Arrivals.
            </p>
          </div>

          <div className="lg:text-right">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-background/60">Next drop · {nextLabel}</p>
            <DropCountdown target={nextDropAt} className="lg:justify-end" />
          </div>
        </div>

        <DropRail>
          {products.map((product, i) => (
            <DropCard key={product.id} product={product} index={i} />
          ))}
        </DropRail>

        <div className="mt-10 flex justify-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 border-b border-background/60 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors hover:border-primary hover:text-primary"
          >
            Browse everything else <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
