/**
 * English and German texts for the starting treatments and slogan. Used for new installs
 * (seed.ts) and filled in once for existing ones by migration 0011 (same texts), but only
 * where the Dutch text was never changed.
 */
export const DEFAULT_SERVICE_TRANSLATIONS: Array<{
  name: string;
  description: string;
  nameEn: string;
  nameDe: string;
  descriptionEn: string;
  descriptionDe: string;
}> = [
  {
    name: "Knippen",
    description: "Klassiek of modern, afgestemd op je haartype. Inclusief wassen en styling.",
    nameEn: "Haircut",
    nameDe: "Haarschnitt",
    descriptionEn: "Classic or modern, tailored to your hair type. Including wash and styling.",
    descriptionDe: "Klassisch oder modern, abgestimmt auf deinen Haartyp. Inklusive Waschen und Styling.",
  },
  {
    name: "Skin Fade",
    description: "Strakke fade tot op de huid met een naadloze overgang. Afgewerkt met scheermes.",
    nameEn: "Skin Fade",
    nameDe: "Skin Fade",
    descriptionEn: "A sharp fade down to the skin with a seamless transition. Finished with a razor.",
    descriptionDe: "Sauberer Fade bis auf die Haut mit nahtlosem Übergang. Mit dem Rasiermesser vollendet.",
  },
  {
    name: "Knippen + Baard",
    description: "Complete behandeling: knipbeurt en baard in model, met strakke contouren.",
    nameEn: "Haircut + Beard",
    nameDe: "Haarschnitt + Bart",
    descriptionEn: "The complete treatment: a haircut and a shaped beard with sharp lines.",
    descriptionDe: "Das Komplettpaket: Haarschnitt und Bart in Form, mit sauberen Konturen.",
  },
  {
    name: "Baard",
    description: "Baard trimmen en in model brengen, contouren met het mes en verzorgende olie.",
    nameEn: "Beard",
    nameDe: "Bart",
    descriptionEn: "Beard trimmed and shaped, lines with the razor and nourishing oil.",
    descriptionDe: "Bart trimmen und in Form bringen, Konturen mit dem Messer und pflegendes Öl.",
  },
  {
    name: "Kinderen t/m 12 jaar",
    description: "Rustig en met aandacht geknipt, voor de jongste gasten.",
    nameEn: "Kids up to 12",
    nameDe: "Kinder bis 12 Jahre",
    descriptionEn: "Cut calmly and with care, for our youngest guests.",
    descriptionDe: "Ruhig und mit Sorgfalt geschnitten, für unsere jüngsten Gäste.",
  },
  {
    name: "Hot Towel Shave",
    description: "Traditioneel scheren met warme handdoeken, scheerzeep en mes.",
    nameEn: "Hot Towel Shave",
    nameDe: "Hot Towel Shave",
    descriptionEn: "A traditional shave with hot towels, shaving soap and a razor.",
    descriptionDe: "Traditionelle Rasur mit heißen Handtüchern, Rasierseife und Messer.",
  },
];

export const DEFAULT_TAGLINE = "Strak geknipt. Zelfverzekerd naar buiten.";
export const DEFAULT_TAGLINE_EN = "Sharp cuts. Walk out confident.";
export const DEFAULT_TAGLINE_DE = "Sauber geschnitten. Selbstbewusst unterwegs.";
