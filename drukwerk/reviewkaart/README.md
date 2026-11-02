# Reviewkaart RKM Barbershop

Een kaartje om aan klanten mee te geven (of bij de kassa neer te zetten). Met de QR-code komen ze
direct bij Google om een review te schrijven.

Formaat **85 × 55 mm** (zelfde als het visitekaartje), met **3 mm afloop** rondom: de bestanden zijn 91 × 61 mm.
De voorkant is Nederlands, de achterkant Engels en Duits. Op beide kanten staat dezelfde QR-code.

| Bestand | Waarvoor |
| --- | --- |
| `RKM-reviewkaart-drukklaar.pdf` | Uploaden bij de drukker. Pagina 1 = voorkant, pagina 2 = achterkant. Tekst en QR-code als vector, achtergrond 600 dpi. |
| `RKM-reviewkaart-voorkant.png` / `-achterkant.png` | Voor drukkers die per kant een afbeelding willen. 600 dpi, met afloop. |
| `RKM-reviewkaart-voorbeeld.png` | Zo ziet het kaartje eruit na het snijden (om te bekijken of te delen, niet om te drukken). |

Kies bij de drukker: 85 × 55 mm, dubbelzijdig, met afloop (3 mm). Liefst mat papier: glans kan de QR-code laten weerkaatsen.

## Hoe de QR-code werkt

De QR-code opent **https://www.rkmbarbershop.nl/review**. Die pagina stuurt de klant direct door naar Google:

1. naar de link bij **Beheer → Instellingen → Link om een review te schrijven** (aanbevolen);
2. is die leeg, dan naar de **Google-reviewlink**;
3. is die ook leeg, dan naar een Google-zoekopdracht naar de zaak.

Zo hoeven de kaartjes nooit opnieuw gedrukt te worden als de Google-link verandert.

**De link van Google ophalen:** open je Google Bedrijfsprofiel (zoek op Google naar "RKM Barbershop" terwijl je
bent ingelogd, of ga naar business.google.com) → **Vraag om reviews** → **Kopieer link**. Plak die link in Beheer.

**Test vóór het drukken:** scan de QR-code op je scherm met je telefoon en controleer dat Google opent met het
venster om een review te schrijven.

## Aanpassen

De bron staat in `bron/`. Lettertypen, logo en het marmer-script komen uit `../visitekaartje/bron`.
Nodig: Python 3 met numpy, Pillow en segno (`pip install numpy pillow segno`), en Node met Playwright.

```sh
cd drukwerk/reviewkaart/bron
python3 maak-qr.py                    # QR-code in card.html zetten (andere link: python3 maak-qr.py https://…)
python3 ../../visitekaartje/bron/marble.py 11 marble-front.png
python3 ../../visitekaartje/bron/marble.py 31 marble-back.png
npm install --no-save playwright      # eenmalig, als Playwright er nog niet is
node render.mjs all                   # maakt out.pdf, out-front.png en out-back.png
node fit.mjs                          # controleert of alle tekst binnen de veilige zone staat
```

Kopieer daarna `out.pdf`, `out-front.png` en `out-back.png` naar de bestanden hierboven.
