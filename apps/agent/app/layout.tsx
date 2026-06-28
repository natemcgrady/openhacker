import type { Metadata } from "next";
import { IBM_Plex_Mono, Syne } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "openhacker",
  description: "Analyze a GitHub repo for vulnerabilities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("dark", syne.variable, ibmPlexMono.variable)}
    >
      <body className="terminal-shell min-h-dvh antialiased">{children}</body>
    </html>
  );
}
