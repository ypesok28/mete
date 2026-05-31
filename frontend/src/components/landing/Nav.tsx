"use client";

// Sticky top bar — transparent over the hero, then settles onto a translucent blurred surface
// with a hairline once you scroll. The wordmark links home; the primary action is always the
// one-click hop into the working console.
//
// The section links are a segmented "tab" control: a grouped pill with hover states and an active
// highlight that tracks which section is in view (IntersectionObserver scroll-spy). At the very
// top (hero) nothing is highlighted, which is correct — you haven't reached a section yet.

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { MeteMarkTile, MeteWordmark } from "@/components/MeteBrand";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#specs", label: "Airframes" },
  { href: "#capabilities", label: "Capabilities" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the tab whose section is crossing a thin band near the top of the
  // viewport. The rootMargin squeezes the observer's root to that band so exactly one section
  // (the one you're reading) reports as intersecting at a time.
  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.href.slice(1))).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inBand = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inBand[0]) setActive(inBand[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300",
        scrolled ? "border-line bg-surface/80 backdrop-blur-md" : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <a href="#top" className="flex items-center gap-2.5" aria-label="METE — top">
          <MeteMarkTile />
          <MeteWordmark size="text-[17px]" />
        </a>

        <nav
          aria-label="Sections"
          className="hidden items-center gap-1 rounded-full border border-line/80 bg-surface/70 p-1 shadow-card backdrop-blur-sm md:flex"
        >
          {LINKS.map((l) => {
            const on = active === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                  on
                    ? "bg-gate-wash text-gate shadow-card"
                    : "text-ink-soft hover:bg-base hover:text-ink"
                )}
              >
                {l.label}
              </a>
            );
          })}
        </nav>

        <a
          href="/console"
          className="group inline-flex items-center gap-2 rounded-lg bg-gate px-3.5 py-2 text-[13px] font-semibold text-white shadow-card transition-all duration-150 hover:-translate-y-px hover:shadow-pop"
        >
          Open the console
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
      </div>
    </header>
  );
}
