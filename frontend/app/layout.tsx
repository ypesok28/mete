import type { Metadata } from "next";
import "./globals.css";
import { plexSans, plexMono } from "./fonts";

// Self-hosted type only (next/font/local → bundled woff2). NO Google Fonts / CDN — the demo
// must run fully offline (airplane-mode). plexSans provides --font-sans; plexMono --font-mono.
export const metadata: Metadata = {
  title: "METE — the mission decides the airframe",
  description:
    "A deterministic, fully-offline build optimizer: given one printer and a finite budget of filament, hours, and energy, METE returns exactly which drones to build tonight — and names the constraint that decided it.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-canvas text-foreground antialiased">{children}</body>
    </html>
  );
}
