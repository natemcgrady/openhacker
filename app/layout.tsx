import { GeistPixelSquare } from "geist/font/pixel";

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
