/**
 * Shared e-mail layout. Deliberately old-fashioned HTML (tables, inline styles,
 * bgcolor attributes) because that is what renders reliably in Gmail, Outlook
 * (desktop and web), Apple Mail and mobile mail apps.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const C = {
  page: "#0b0b0c",
  card: "#141416",
  line: "#2a2a2e",
  text: "#f4f1ea",
  muted: "#c4beb3",
  faint: "#8a857c",
  gold: "#dba85c",
};

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailContent {
  /** Short preview text shown next to the subject in the inbox. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  details?: Array<[label: string, value: string]>;
  /** Highlighted note below the details, e.g. "Je afspraak is nog niet definitief." */
  note?: string;
  button?: EmailButton;
  secondary?: EmailButton;
  closing?: string[];
  footer: string[];
  /** Absolute URL of the logo image (see EMAIL_LOGO_PATH); without it the header is plain text. */
  logoUrl?: string;
}

/** Logo for the e-mail header, served from the website (public/brand). */
export const EMAIL_LOGO_PATH = "/brand/rkm-logo-email.png";

function paragraph(text: string, color = C.muted) {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:24px;color:${color};">${escapeHtml(text)}</p>`;
}

function detailsTable(rows: Array<[string, string]>) {
  const cells = rows
    .map(
      ([label, value], i) => `<tr><td style="padding:14px 0;${i ? `border-top:1px solid ${C.line};` : ""}">
<div style="font-family:${SANS};font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:${C.faint};">${escapeHtml(label)}</div>
<div style="font-family:${SANS};font-size:17px;line-height:24px;font-weight:600;color:${C.text};">${escapeHtml(value)}</div>
</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">${cells}</table>`;
}

function primaryButton({ label, url }: EmailButton) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px;"><tr>
<td align="center" bgcolor="${C.gold}" style="background-color:${C.gold};border-radius:999px;">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:15px;font-weight:700;color:#111111;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function secondaryLink({ label, url }: EmailButton) {
  return `<p style="margin:4px 0 16px;font-family:${SANS};font-size:14px;line-height:22px;"><a href="${escapeHtml(url)}" target="_blank" style="color:${C.gold};text-decoration:underline;">${escapeHtml(label)}</a></p>`;
}

export function renderEmail(subject: string, content: EmailContent): { subject: string; html: string; text: string } {
  const body = [
    `<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:28px;line-height:34px;font-weight:normal;color:${C.text};">${escapeHtml(content.heading)}</h1>`,
    ...content.paragraphs.map((p) => paragraph(p)),
    content.details?.length ? detailsTable(content.details) : "",
    content.note
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td style="padding:14px 16px;border-left:3px solid ${C.gold};background-color:#1b1a17;" bgcolor="#1b1a17">${paragraph(content.note, C.text).replace("margin:0 0 16px", "margin:0")}</td></tr></table>`
      : "",
    content.button ? primaryButton(content.button) : "",
    content.secondary ? secondaryLink(content.secondary) : "",
    ...(content.closing ?? []).map((p) => paragraph(p, C.text)),
  ].join("\n");

  const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};" bgcolor="${C.page}">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};">
<tr><td align="center" style="padding:36px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td align="center" style="padding:0 0 28px;">
${
  content.logoUrl
    ? `<img src="${escapeHtml(content.logoUrl)}" width="180" height="88" alt="RKM" style="display:block;width:180px;height:auto;margin:0 auto 6px;border:0;outline:none;text-decoration:none;font-family:${SERIF};font-size:30px;letter-spacing:8px;color:${C.gold};">`
    : `<div style="font-family:${SERIF};font-size:30px;line-height:34px;letter-spacing:8px;color:${C.text};">RKM</div>`
}
<div style="font-family:${SERIF};font-size:12px;line-height:16px;letter-spacing:7px;color:${C.text};">BARBERSHOP</div>
</td></tr>
<tr><td bgcolor="${C.card}" style="background-color:${C.card};border:1px solid ${C.line};border-radius:16px;padding:36px 32px;">
${body}
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.faint};">
${content.footer.map(escapeHtml).join("<br>")}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    ...content.paragraphs,
    "",
    ...(content.details ?? []).map(([label, value]) => `${label}: ${value}`),
    ...(content.note ? ["", content.note] : []),
    "",
    ...(content.button ? [`${content.button.label}: ${content.button.url}`] : []),
    ...(content.secondary ? [`${content.secondary.label}: ${content.secondary.url}`] : []),
    ...(content.closing?.length ? ["", ...content.closing] : []),
    "",
    "—",
    ...content.footer,
  ].join("\n");

  return { subject, html, text };
}
