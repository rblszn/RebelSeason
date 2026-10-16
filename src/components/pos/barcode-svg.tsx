import { code128Bars, code128Modules, isEncodable } from "@/lib/barcode";

/** A Code 128 barcode as crisp SVG (server or client). Shows just the text if it can't be encoded. */
export function BarcodeSvg({ value, height = 40, showText = true, className }: { value: string; height?: number; showText?: boolean; className?: string }) {
  if (!isEncodable(value)) return <span className="font-mono text-xs">{value}</span>;
  const quiet = 10;
  const width = code128Modules(value) + quiet * 2;
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={`Barcode ${value}`}>
        <rect width={width} height={height} fill="#fff" />
        {code128Bars(value).map(([x, w]) => (
          <rect key={x} x={x + quiet} y={0} width={w} height={height} fill="#000" />
        ))}
      </svg>
      {showText && <figcaption className="text-center font-mono text-xs tracking-wider mt-0.5">{value}</figcaption>}
    </figure>
  );
}
