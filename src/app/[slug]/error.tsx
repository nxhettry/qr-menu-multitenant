"use client";

export default function MenuError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-md px-6 py-20 text-center">
    <h1 className="font-serif text-4xl">We couldn’t load this menu.</h1>
    <p className="mt-5 leading-7 text-stone-600">Please try again, or ask the restaurant for their menu.</p>
    <button onClick={reset} className="mt-8 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">Try again</button>
  </main>;
}
