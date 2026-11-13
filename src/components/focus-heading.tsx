"use client";
import { useEffect, useRef } from "react";

/** After navigation, focus moves to the page H1 (experience §4). */
export function FocusHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <h1 ref={ref} tabIndex={-1}>{children}</h1>;
}
