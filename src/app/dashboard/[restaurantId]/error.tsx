"use client";

export default function EditorError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg px-6 py-16"><h1 className="font-serif text-3xl">We couldn’t load this workspace.</h1><p className="mt-4 leading-7 text-stone-600">Please try again shortly. Your saved menu is still in place.</p><button onClick={reset} className="mt-7 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">Try again</button></main>;
}
