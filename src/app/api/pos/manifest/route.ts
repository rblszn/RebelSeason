/** Web app manifest so the POS can be installed on a phone / iPad home screen and open full-screen. */
export function GET() {
  return Response.json(
    {
      name: "Rebel Season POS",
      short_name: "Rebel POS",
      description: "Billing counter for The Rebel Season",
      id: "/pos",
      start_url: "/pos",
      scope: "/pos",
      display: "standalone",
      orientation: "any",
      background_color: "#FAF8F5",
      theme_color: "#1A1A1A",
      icons: [
        { src: "/api/pos/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/pos/icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/api/pos/icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } }
  );
}
