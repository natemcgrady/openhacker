import { getSquareLogoSvg } from "../logoSvg";

export function GET() {
  const svg = getSquareLogoSvg();

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
