import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "RKM Barbershop — Strak geknipt. Zelfverzekerd naar buiten.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The logo doesn't depend on the request: read it once.
const logo = `data:image/png;base64,${await readFile(join(process.cwd(), "src/assets/rkm-mark.png"), "base64")}`;

const line = (direction: "left" | "right") => ({
  width: 120,
  height: 2,
  background: `linear-gradient(to ${direction}, rgba(219,168,92,0), #dba85c)`,
});

const scissors = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#dba85c" stroke-width="1.3" stroke-linecap="round"><path d="M5.2 2.5 15.6 16.4M18.8 2.5 8.4 16.4"/><circle cx="7" cy="18.9" r="2.6"/><circle cx="17" cy="18.9" r="2.6"/><circle cx="12" cy="11.8" r="0.9" fill="#dba85c"/></svg>',
)}`;

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
          background: "#0b0b0c",
          color: "#f4f1ea",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={logo} width={440} height={237} alt="" />
        <div style={{ fontSize: 34, letterSpacing: 18, marginTop: 30, marginRight: -18, color: "#dba85c" }}>BARBERSHOP</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 18 }}>
          <div style={line("right")} />
          <img src={scissors} width={34} height={34} alt="" />
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
