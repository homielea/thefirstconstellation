import type { Metadata, Viewport } from "next";
import { brand } from "@/brand";
import "./globals.css";

export const metadata: Metadata = { title: { default: brand.productName, template: `%s · ${brand.productName}` }, description: brand.tagline };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#050609" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
