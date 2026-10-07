import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "RKM Barbershop — Strak geknipt. Zelfverzekerd naar buiten.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The logo doesn't depend on the request: read it once.
const logo = `data:image/png;base64,${await readFile(join(process.cwd(), "src/assets/rkm-mark.png"), "base64")}`;

const line = (direction: "left" | "right") => ({
  width: 150,
  height: 2,
  background: `linear-gradient(to ${direction}, rgba(219,168,92,0), #dba85c)`,
});

/** Social preview image (WhatsApp, Facebook, LinkedIn, …). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 40%, rgba(219,168,92,0.22), transparent 60%), #0b0b0c",
          color: "#f4f1ea",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={logo} width={520} height={241} alt="" />
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 30 }}>
          <div style={line("right")} />
          <div style={{ fontSize: 34, letterSpacing: 16, color: "#f4f1ea" }}>BARBERSHOP</div>
          <div style={line("left")} />
        </div>
        <div style={{ fontSize: 38, marginTop: 34, color: "#f6cf87", fontStyle: "italic" }}>
          Strak geknipt. Zelfverzekerd naar buiten.
        </div>
      </div>
    ),
    size,
  );
}
