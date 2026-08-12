import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

const ibm = IBM_Plex_Mono({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Durable Brief",
  description:
    "A briefing desk on Vercel Workflows: parallel research, sequential draft, evaluator-optimizer loop, and a human approval hook that survives deploys.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrument.variable} ${ibm.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-chrome text-paper">{children}</body>
    </html>
  );
}
