import { starterTemplateHref, starterTemplates } from "@/lib/editor/starter-templates";

export function StarterTemplates() {
  return <section aria-label="Ready-made starter menus" className="space-y-3">
    <div>
      <h3 className="font-semibold">Start from a ready-made list</h3>
      <p className="mt-1 text-sm leading-6 text-ink-muted">Common dishes with Nepali names and categories. Prices are left blank: enter yours and delete what you don’t serve.</p>
    </div>
    <ul className="grid gap-3 sm:grid-cols-2">
      {starterTemplates.map(template => <li key={template.slug} className="rounded-xl border border-line bg-surface p-4">
        <p className="font-medium">{template.label}</p>
        <p className="mt-1 text-sm text-ink-muted">{template.description}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          <a href={starterTemplateHref(template.slug, "xlsx")} download className="inline-flex min-h-11 items-center text-brand hover:underline">Excel ↓</a>
          <a href={starterTemplateHref(template.slug, "csv")} download className="inline-flex min-h-11 items-center text-brand hover:underline">CSV ↓</a>
        </p>
      </li>)}
    </ul>
  </section>;
}
