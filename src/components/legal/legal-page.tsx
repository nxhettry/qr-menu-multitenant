import type { ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/landing/site-chrome";
import { eyebrowClass } from "@/components/ui/form";
import { LEGAL_UPDATED, OPERATOR } from "@/lib/legal";

export type LegalSection = { title: string; body: ReactNode };

export function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: ReactNode; sections: LegalSection[] }) {
  return <>
    <SiteNav />
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className={eyebrowClass}>{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-ink-subtle">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 text-[15px] leading-7 text-ink-muted">{intro}</div>
      <nav aria-label="Sections" className="mt-8 rounded-2xl border border-line bg-surface-muted/60 p-5">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">{sections.map((section, index) => <li key={section.title}><a href={`#section-${index + 1}`} className="text-ink-muted hover:text-ink hover:underline">{section.title}</a></li>)}</ol>
      </nav>
      {sections.map((section, index) => <section key={section.title} id={`section-${index + 1}`} className="mt-10 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">{index + 1}. {section.title}</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink-muted [&_li]:mt-1.5 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5">{section.body}</div>
      </section>)}
      <p className="mt-12 border-t border-line pt-6 text-sm leading-6 text-ink-muted">{OPERATOR.name}, {OPERATOR.location} · <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-brand hover:underline">{OPERATOR.email}</a></p>
    </main>
    <SiteFooter />
  </>;
}
