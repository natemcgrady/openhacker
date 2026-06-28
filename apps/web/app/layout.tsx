import type { Metadata } from "next";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

const description =
  "Create an OpenHacker account, start a team, and access your workspace at openhacker.ai/team.";

export const metadata: Metadata = {
  metadataBase: new URL("https://openhacker.ai"),
  title: "openhacker",
  description,
  openGraph: { title: "openhacker", description, type: "website" },
  twitter: { card: "summary_large_image", title: "openhacker", description },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${GeistPixelSquare.className} site-shell`}>
        {children}
      </body>
    </html>
  );
}
