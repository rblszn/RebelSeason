import { ImageResponse } from "next/og";

/** App icon for the installed POS (home-screen / PWA). GET ?size=192|512|180 */
export function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("size"));
  const size = [180, 192, 512].includes(requested) ? requested : 192;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1A1A1A", color: "#F8C8DC" }}>
        <div style={{ fontSize: size * 0.52, fontWeight: 700, lineHeight: 1 }}>R</div>
        <div style={{ fontSize: size * 0.12, letterSpacing: size * 0.02, color: "#ffffff", marginTop: size * 0.02 }}>POS</div>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=86400" } }
  );
}
