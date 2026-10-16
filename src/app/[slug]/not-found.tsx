import Link from "next/link";

export default function MenuNotFound() {
  return <main className="mx-auto max-w-md px-6 py-20 text-center">
    <h1 className="font-serif text-4xl">Menu not found.</h1>
    <p className="mt-5 leading-7 text-stone-600">Check the address or scan the restaurant’s QR code again.</p>
    <Link href="/" className="mt-8 inline-block text-sm underline">QR Menu home</Link>
  </main>;
}
