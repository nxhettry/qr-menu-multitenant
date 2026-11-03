import type { Faq } from "@/lib/seo/faq";

export function FaqList({ faqs, className = "" }: { faqs: Faq[]; className?: string }) {
  return <div className={`divide-y divide-line rounded-2xl border border-line bg-surface ${className}`}>
    {faqs.map(({ question, answer }) => <details key={question} className="group px-5">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">{question}<span aria-hidden="true" className="text-ink-subtle transition-transform group-open:rotate-45">+</span></summary>
      <p className="pb-4 text-sm leading-6 text-ink-muted">{answer}</p>
    </details>)}
  </div>;
}
