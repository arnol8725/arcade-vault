"use client";

import { useEffect } from "react";

/**
 * Runs the IntersectionObserver that adds the `.in` class to `.reveal`
 * sections as they scroll into view. Renders nothing — drop it once
 * anywhere in a Server Component tree to enable the scroll-reveal effect
 * for that page.
 */
export function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
