# Visitekaartje RKM Barbershop

Formaat **85 × 55 mm** (standaard visitekaartje), met **3 mm afloop** rondom: de bestanden zijn 91 × 61 mm.
De drukker snijdt de rand van 3 mm eraf; alle tekst staat minstens 4 mm binnen de snijlijn.

| Bestand | Waarvoor |
| --- | --- |
| `RKM-visitekaartje-drukklaar.pdf` | Uploaden bij de drukker. Pagina 1 = voorkant, pagina 2 = achterkant. Tekst als vector (haarscherp), achtergrond 600 dpi. |
| `RKM-visitekaartje-voorkant.png` / `-achterkant.png` | Voor drukkers die per kant een afbeelding willen. 600 dpi, met afloop. |
| `RKM-visitekaartje-voorbeeld.png` | Zo ziet het kaartje eruit na het snijden (om te bekijken of te delen, niet om te drukken). |

Kies bij de drukker: 85 × 55 mm, dubbelzijdig, met afloop (3 mm). Kleuren staan in RGB; drukkers zetten dat zelf om naar CMYK.

## Aanpassen (bijvoorbeeld openingstijden)

De bron staat in `bron/`. Pas de tekst aan in `bron/card.html` en maak de bestanden opnieuw (Python 3 met numpy en Pillow, en Node met Playwright):

```sh
cd drukwerk/visitekaartje/bron
python3 marble.py 7 marble-front.png && python3 marble.py 23 marble-back.png   # marmer, 600 dpi
npm install --no-save playwright   # eenmalig, als Playwright er nog niet is
node render.mjs all                 # maakt out.pdf, out-front.png en out-back.png
node fit.mjs                        # controleert of alle tekst binnen de veilige zone staat
```

Kopieer daarna `out.pdf`, `out-front.png` en `out-back.png` naar de bestanden hierboven.
