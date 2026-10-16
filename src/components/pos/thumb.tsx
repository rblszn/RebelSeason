import Image from "next/image";

/** Small product picture for lists; a grey square when the product has no image. */
export function Thumb({ src, alt, size = 40 }: { src: string | null; alt: string; size?: number }) {
  return src ? (
    <Image src={src} alt={alt} width={size} height={size} className="rounded object-cover shrink-0 bg-gray-100" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded bg-gray-100 shrink-0" style={{ width: size, height: size }} aria-hidden />
  );
}
