import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "openhacker.ai — hacking soon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fontData = await readFile(
    join(process.cwd(), "app/GeistPixelSquare.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "black",
          color: "white",
          fontFamily: "GeistPixelSquare",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 900 }}>openhacker.ai</div>
        <div style={{ fontSize: 48, fontWeight: 900, marginTop: 20 }}>&gt; hacking soon</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "GeistPixelSquare",
          data: fontData,
          style: "normal",
        },
      ],
    }
  );
}
