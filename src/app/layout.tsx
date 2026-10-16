import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Menu — a menu for every table",
  description: "A fast, phone-friendly QR menu for Nepal’s restaurants.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
