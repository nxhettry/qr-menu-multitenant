"use client";
import { useState } from "react";
import Image from "next/image";

export function MenuImageDisplay({ src, srcSet, sizes, alt, width, height, className, loading = "lazy" }: {
  src: string; srcSet?: string; sizes?: string; alt: string; width: number; height: number; className: string; loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span role={alt ? "img" : undefined} aria-label={alt ? `${alt} image unavailable` : undefined}
    className={`${className} inline-block bg-surface-muted`} style={{ aspectRatio: `${width}/${height}` }} />;
  return <picture>
    {srcSet && <source srcSet={srcSet} sizes={sizes} />}
    <Image src={src} alt={alt} width={width} height={height} unoptimized loading={loading} className={className} onError={() => setFailed(true)} />
  </picture>;
}
