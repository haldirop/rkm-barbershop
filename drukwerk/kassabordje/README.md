# Reviewbordje voor de kassa

Een staand kaartje voor op de toonbank, om zelf te printen. Klanten scannen de QR-code en komen direct bij Google
om een review te schrijven (via rkmbarbershop.nl/review, zie `../reviewkaart/README.md`).

Voorkant Nederlands, achterkant Engels en Duits. Uitgeknipt en gevouwen is het **12,5 × 17,7 cm** en staat het
vanzelf, zoals een wenskaart.

| Bestand | Waarvoor |
| --- | --- |
| `RKM-reviewbordje-A4-printen.pdf` | Printen op één A4-vel. Tekst, QR-code en snijtekens als vector, achtergrond 300 dpi. |
| `RKM-reviewbordje-voorbeeld.png` | Zo ziet het eruit na knippen en vouwen (voorkant links, achterkant rechts). |

## Zo maak je hem

1. **Papier:** stevig A4, 200–250 g/m² (bijvoorbeeld mat fotopapier of printkarton). Op gewoon printpapier wordt
   het zwart minder diep en gaat het vel bol staan.
2. **Printen:** open de PDF en kies
   - papier **A4**, stand **liggend**;
   - **Werkelijke grootte / 100%** (niet "Aanpassen aan pagina");
   - kwaliteit **Hoog / Beste**, en bij fotopapier de juiste papiersoort;
   - **enkelzijdig**.
3. **Knippen:** knip of snijd langs de streepjes in de vier hoeken (vier rechte sneden). Met een liniaal en een
   hobbymes worden de randen het strakst. Er zit 3 mm extra zwart buiten de snijlijn, dus een klein beetje
   scheef geeft geen witte randjes.
4. **Vouwen:** leg een liniaal langs de twee streepjes in het midden en trek met de achterkant van een mes of een
   lege pen een lijn (rillen). Vouw dan dubbel met de bedrukte kant naar buiten.
5. Zet hem bij de kassa met de Nederlandse kant naar de klant.

Geen printer? Een copyshop kan de PDF op dezelfde manier printen op 250 g/m² A4 (vraag: enkelzijdig, 100%).

## Aanpassen

De bron staat in `bron/`. Lettertypen, logo en het marmer-script komen uit `../visitekaartje/bron`, het
QR-script uit `../reviewkaart/bron`. Nodig: Python 3 met numpy, Pillow en segno, en Node met Playwright.

```sh
cd drukwerk/kassabordje/bron
python3 ../../reviewkaart/bron/maak-qr.py https://www.rkmbarbershop.nl/review bordje.html
python3 ../../visitekaartje/bron/marble.py 47 marble.png 3024 2161 300
npm install --no-save playwright      # eenmalig, als Playwright er nog niet is
node render.mjs all                   # maakt out.pdf en out.png
node fit.mjs                          # controleert of alle tekst binnen de veilige zone staat
```

Kopieer daarna `out.pdf` naar `RKM-reviewbordje-A4-printen.pdf`.
