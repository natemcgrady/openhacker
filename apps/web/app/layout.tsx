import type { Metadata } from "next";
import { GeistPixelSquare } from "geist/font/pixel";
import { MESSAGE } from "openhacker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://openhacker.ai"),
  title: "Openhacker",
  description: MESSAGE,
  openGraph: {
    title: "Openhacker",
    description: MESSAGE,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Openhacker",
    description: MESSAGE,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={GeistPixelSquare.className}>{children}</body>
    </html>
  );
}
