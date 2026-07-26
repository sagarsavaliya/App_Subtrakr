"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Rect = { left: number; top: number; width: number; height: number };

// SSR guard — useLayoutEffect warns when it runs on the server, even
// inside a "use client" component, since these components are still
// rendered once server-side before hydration.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : () => {};

/** Tracks the on-screen box of whichever item currently owns `activeKey`,
 *  relative to a shared container — the basis for every "liquid" sliding
 *  pill/tab indicator in this app (nav bars, chip groups, entity filter).
 *  Measures real DOM rects (not framer-motion's layoutId trick) so the
 *  indicator can use asymmetric left/width springs for a stretchy glide
 *  instead of a rigid rectangle teleporting between positions. */
export function useSlidingRect<T extends HTMLElement = HTMLElement>(activeKey: string) {
  const containerRef = useRef<T>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [rect, setRect] = useState<Rect | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = itemRefs.current[activeKey];
    const container = containerRef.current;
    if (!el || !container) return;

    function measure() {
      const b = el!.getBoundingClientRect();
      const c = container!.getBoundingClientRect();
      setRect({ left: b.left - c.left, top: b.top - c.top, width: b.width, height: b.height });
    }
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeKey]);

  function register(key: string) {
    return (el: HTMLElement | null) => {
      itemRefs.current[key] = el;
    };
  }

  return { containerRef, register, rect };
}

/** Deliberately mismatched spring params per edge — left/top settle
 *  faster than width/height, so the pill's trailing edge briefly lags
 *  and the shape stretches/squashes through the motion instead of
 *  sliding as a rigid block. This asymmetry is what reads as "liquid"
 *  rather than a color crossfade or a snap-to-place jump. */
export const LIQUID_TRANSITION = {
  left: { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.7 },
  top: { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.7 },
  width: { type: "spring" as const, stiffness: 220, damping: 24, mass: 1 },
  height: { type: "spring" as const, stiffness: 220, damping: 24, mass: 1 },
};
