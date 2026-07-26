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

/** Deliberately underdamped (bouncy) springs, with position (x/y)
 *  oscillating at a different rate than size (width/height) — the pill's
 *  trailing edge overshoots and wobbles back rather than the whole shape
 *  settling in lockstep, which is what actually reads as "liquid" rather
 *  than a quick, barely-there snap. Consumers animate `x`/`y` (transform,
 *  GPU-composited) for position instead of `left`/`top`, so the position
 *  half of the motion is never at the mercy of layout/paint scheduling —
 *  only width/height (unavoidable for the pill to resize correctly) touch
 *  layout, and only for this one small absolutely-positioned element. */
export const LIQUID_TRANSITION = {
  x: { type: "spring" as const, stiffness: 300, damping: 15, mass: 1 },
  y: { type: "spring" as const, stiffness: 300, damping: 15, mass: 1 },
  width: { type: "spring" as const, stiffness: 160, damping: 12, mass: 1.3 },
  height: { type: "spring" as const, stiffness: 160, damping: 12, mass: 1.3 },
};
