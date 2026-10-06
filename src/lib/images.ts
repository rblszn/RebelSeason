// Cloudinary delivery helpers. Uploaded originals are often several MB; asking
// Cloudinary for a resized, auto-format (WebP/AVIF), auto-quality rendition cuts
// bandwidth by ~90%. Derived images are cached by Cloudinary after the first
// request, so only a handful of widths are used to keep transformation counts low.

export type ImageWidth = 200 | 400 | 800 | 1200;

const UPLOAD_SEGMENT = /\/(image|video)\/upload\//;

function hasTransformation(url: string): boolean {
  const after = url.split(UPLOAD_SEGMENT)[2] ?? "";
  const firstPart = after.split("/")[0] ?? "";
  // A version segment (v123...) or a folder means no transformation is present.
  return /(^|,)(w|h|c|f|q)_/.test(firstPart);
}

export function cldImage(url: string | null | undefined, width: ImageWidth): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/") || hasTransformation(url)) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

export function cldVideo(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/video/upload/") || hasTransformation(url)) return url;
  return url.replace("/video/upload/", "/video/upload/q_auto,vc_auto,c_limit,w_720/");
}

export function cldVideoPoster(url: string): string {
  const poster = url.replace(/\.(mp4|webm|ogg|mov)$/i, ".jpg");
  if (!poster.includes("res.cloudinary.com") || !poster.includes("/video/upload/") || hasTransformation(poster)) return poster;
  return poster.replace("/video/upload/", "/video/upload/so_0,f_auto,q_auto,c_limit,w_480/");
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes("/video/upload/");
}
