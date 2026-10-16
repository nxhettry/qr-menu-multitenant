export function MenuIcon({ name, className = "h-5 w-5" }: { name: "search" | "bowl" | "flame" | "arrow"; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {name === "search" ? <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></> : name === "flame" ? <path d="M13 3c1 6-5 5-3 10-2-1-3-2-3-4-5 7 0 12 5 12s10-6 1-18Z" /> : name === "arrow" ? <path d="m9 5 7 7-7 7" /> : <><path d="M3 12h18a9 9 0 0 1-18 0ZM7 22h10M8 8c-3-3 3-3 0-6M13 8c-3-3 3-3 0-6M18 8c-3-3 3-3 0-6" /></>}
  </svg>;
}
