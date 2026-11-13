"use client";
export function LocalTime({ iso }: { iso: string }) {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return <time dateTime={iso} suppressHydrationWarning>{sameDay ? t : `${d.toLocaleDateString()} ${t}`}</time>;
}
