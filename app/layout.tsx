import type { Metadata } from "next";
import { GeistPixelSquare } from "geist/font/pixel";

export const metadata: Metadata = {
  metadataBase: new URL("https://openhacker.ai"),
  title: "openhacker.ai",
  description: "hacking soon",
  openGraph: {
    title: "openhacker.ai",
    description: "hacking soon",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "openhacker.ai",
    description: "hacking soon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className={GeistPixelSquare.className}>{children}</body>
    </html>
  );
}
