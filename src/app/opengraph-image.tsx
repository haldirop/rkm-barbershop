import { ImageResponse } from "next/og";

export const alt = "RKM Barbershop — Strak geknipt. Zelfverzekerd naar buiten.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview image (WhatsApp, Facebook, LinkedIn, …), generated at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "radial-gradient(circle at 85% 15%, rgba(200,169,106,0.25), transparent 55%), #0b0b0c",
          color: "#f4f1ea",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 1, background: "#c8a96a" }} />
          <div style={{ fontSize: 26, letterSpacing: 8, color: "#c8a96a", fontFamily: "sans-serif" }}>BARBERSHOP</div>
        </div>
        <div style={{ fontSize: 118, marginTop: 28, lineHeight: 1 }}>RKM Barbershop</div>
        <div style={{ fontSize: 46, marginTop: 28, color: "#dec28c", fontStyle: "italic" }}>
          Strak geknipt. Zelfverzekerd naar buiten.
        </div>
        <div style={{ fontSize: 28, marginTop: 48, color: "#b3ac9f", fontFamily: "sans-serif" }}>
          Maak eenvoudig online een afspraak
        </div>
      </div>
    ),
    size,
  );
}
