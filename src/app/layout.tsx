import type { ReactNode } from "react";
import { Sora, Manrope } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${sora.variable} ${manrope.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}