import { cloudinaryImageUrl } from "@/lib/menu/presentation";
import { MenuImageDisplay } from "@/components/menu-image-display";

export function MenuPhoto({ publicId, version, alt, kind, className }: {
  publicId: string | null; version: number | null; alt: string; kind: "hero" | "logo" | "item"; className: string;
}) {
  const [width, height] = kind === "hero" ? [1280, 600] : kind === "logo" ? [192, 192] : [640, 480];
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const src = cloudinaryImageUrl(cloud, publicId, version, width, height);
  if (!src) return null;
  const widths = kind === "hero" ? [320, 640, 1280] : kind === "logo" ? [96, 192] : [320, 640];
  const srcSet = widths.map(size => `${cloudinaryImageUrl(cloud, publicId, version, size, Math.round(size * height / width))} ${size}w`).join(", ");
  return <MenuImageDisplay key={src} src={src} srcSet={srcSet} alt={alt} width={width} height={height} className={className} loading={kind === "item" ? "lazy" : "eager"}
    sizes={kind === "hero" ? "(max-width: 640px) calc(100vw - 32px), 864px" : kind === "logo" ? "72px" : "(max-width: 640px) calc((100vw - 44px) / 2), 280px"} />;
}
