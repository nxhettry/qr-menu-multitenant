import type { CSSProperties } from "react";
import { MenuPhoto } from "@/components/menu/photo";

export type PrintLayout = "cards" | "poster";
type SheetProps = {
  layout: PrintLayout; name: string; nameNe: string | null; accent: string; qrMarkup: string; shortUrl: string;
  logoPublicId: string | null; logoVersion: number | null;
};

function Card({ poster, name, nameNe, qrMarkup, shortUrl, logoPublicId, logoVersion }: Omit<SheetProps, "layout" | "accent"> & { poster: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("");
  return <div className={`flex h-full flex-col items-center justify-center text-center ${poster ? "gap-[7mm] p-[20mm]" : "gap-[3.5mm] p-[9mm]"}`}>
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-[var(--sheet-accent)] font-semibold text-white ${poster ? "h-[24mm] w-[24mm] text-[9mm]" : "h-[13mm] w-[13mm] text-[5mm]"}`}>
      <span aria-hidden="true">{initials}</span>
      <MenuPhoto publicId={logoPublicId} version={logoVersion} alt={`${name} logo`} kind="logo" className="absolute inset-0 h-full w-full bg-white object-contain" />
    </div>
    <div>
      <p className={`break-words font-semibold leading-tight tracking-tight ${poster ? "text-[13mm]" : "text-[6mm]"}`}>{name}</p>
      {nameNe && <p lang="ne" className={`text-stone-600 ${poster ? "mt-[2mm] text-[6mm]" : "text-[3.4mm]"}`}>{nameNe}</p>}
    </div>
    <div className={`rounded-[4mm] border border-stone-200 bg-white [&_svg]:block [&_svg]:h-auto [&_svg]:w-full ${poster ? "w-[125mm] p-[4mm]" : "w-[56mm] p-[2mm]"}`} dangerouslySetInnerHTML={{ __html: qrMarkup }} />
    <div>
      <p className={`font-semibold ${poster ? "text-[8mm]" : "text-[4.4mm]"}`}>Scan to view our menu</p>
      <p lang="ne" className={`text-stone-600 ${poster ? "text-[6mm]" : "text-[3.6mm]"}`}>मेनु हेर्न स्क्यान गर्नुहोस्</p>
      <p className={`font-medium text-[var(--sheet-accent)] ${poster ? "mt-[3mm] text-[5mm]" : "mt-[1.5mm] text-[3mm]"}`}>{shortUrl.replace(/^https?:\/\//, "")}</p>
    </div>
    <p className={`text-stone-500 ${poster ? "text-[3.5mm]" : "text-[2.4mm]"}`}>Powered by <span className="font-semibold text-stone-700">RestroFuel</span></p>
  </div>;
}

/** A4 sheet sized in millimetres so browser Print to PDF matches the paper. Colours stay light in both themes. */
export function QrPrintSheet({ layout, accent, ...card }: SheetProps) {
  const poster = layout === "poster";
  return <div style={{ "--sheet-accent": accent } as CSSProperties}
    className="mx-auto h-[297mm] w-[210mm] overflow-hidden bg-white text-stone-900 shadow-lift max-sm:[zoom:0.44] print:shadow-none print:[zoom:1]">
    {poster ? <Card poster {...card} /> : <div className="grid h-full grid-cols-2 grid-rows-2">
      {[0, 1, 2, 3].map(index => <div key={index} className="border border-dashed border-stone-300"><Card poster={false} {...card} /></div>)}
    </div>}
  </div>;
}
