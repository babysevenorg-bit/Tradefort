import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Newsreader, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-newsreader",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meridian — Forex, Crypto & Binary Terminal",
  description:
    "Real-market pricing, live signals and a demo account for learning. Deposit with M-Pesa, USDT, Mastercard or Visa.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${archivo.variable} ${plex.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
