# Google-reviewbordje

Een plat, staand bordje voor op de toonbank, aan de muur of op het raam. Klanten scannen de QR-code en komen
direct bij Google om een review te schrijven (via rkmbarbershop.nl/review, zie `../reviewkaart/README.md`).

Nederlands, met onderaan een korte regel in het Engels en Duits. Enkelzijdig.
Hetzelfde ontwerp in twee formaten:

| Bestand | Waarvoor |
| --- | --- |
| `RKM-google-reviewbordje-A5-printen.pdf` | **Zelf printen.** Eén A4-vel met het bordje op A5 (14,8 × 21 cm) en snijtekens. Past in een A5-standaard (acryl kaarthouder) of A5-lijstje. |
| `RKM-google-reviewbordje-A4-drukklaar.pdf` | **Copyshop of drukker**, voor een groter bordje op A4 (21 × 29,7 cm): aan de muur, op het raam of in een A4-lijst. Met 3 mm afloop rondom. |
| `RKM-google-reviewbordje-voorbeeld.png` | Zo ziet het eruit (om te bekijken of te delen, niet om te printen). |

Tekst en QR-code staan als vector in de PDF's (altijd scherp), de marmerachtergrond is 300 dpi op A4.

## A5 zelf printen

1. **Papier:** stevig A4, 200–250 g/m² (mat fotopapier of printkarton). Mat werkt beter dan glans: glans kan de
   QR-code laten weerkaatsen.
2. **Printen:** open `RKM-google-reviewbordje-A5-printen.pdf` en kies
   - papier **A4**, stand **staand**;
   - **Werkelijke grootte / 100%** (niet "Aanpassen aan pagina");
   - kwaliteit **Hoog / Beste**, en bij fotopapier de juiste papiersoort.
3. **Knippen:** knip of snijd langs de streepjes in de vier hoeken (vier rechte sneden). Met een liniaal en een
   hobbymes worden de randen het strakst. Er zit 3 mm extra zwart buiten de snijlijn, dus een klein beetje scheef
   geeft geen witte randjes.
4. Zet het in een A5-standaard of -lijstje. Die zijn te koop bij bijvoorbeeld de Action, HEMA of online
   ("A5 acryl standaard").

## A4 bij de copyshop

Neem `RKM-google-reviewbordje-A4-drukklaar.pdf` mee of upload het, en vraag om:
**A4, enkelzijdig, op 100% met afloop (3 mm), afsnijden op A4**, liefst op 250–300 g/m² mat papier.
Voor het raam of buiten kun je ook vragen om het te lamineren of op foamboard te plakken.

Heb je thuis een printer die **randloos** kan printen, dan kan het ook zelf: kies randloos, A4 en "Aanpassen aan
pagina". Zonder randloos printen krijg je een witte rand; dan liever de A5-versie.

## Hoe de QR-code werkt

De QR-code opent **https://www.rkmbarbershop.nl/review**, en die pagina stuurt door naar Google. Welke Google-link
dat is, stel je in onder **Beheer → Instellingen → Link om een review te schrijven**. Verandert de Google-link
ooit, dan hoef je het bordje dus niet opnieuw te printen.

## Aanpassen

De bron staat in `bron/`. Lettertypen, logo en het marmer-script komen uit `../visitekaartje/bron`, het
QR-script uit `../reviewkaart/bron`. Nodig: Python 3 met numpy, Pillow en segno, en Node met Playwright.

```sh
cd drukwerk/google-reviewbordje/bron
python3 ../../reviewkaart/bron/maak-qr.py https://www.rkmbarbershop.nl/review bordje.html
python3 ../../visitekaartje/bron/marble.py 47 marble.png 2572 3608 424
npm install --no-save playwright      # eenmalig, als Playwright er nog niet is
node render.mjs all                   # maakt out-a5.pdf/png, out-a4.pdf/png en guides.png
node fit.mjs                          # controleert of alle tekst binnen de veilige zone staat
python3 voorbeeld.py                  # maakt voorbeeld.png uit out-a4.png
```

Kopieer daarna `out-a5.pdf`, `out-a4.pdf` en `voorbeeld.png` naar de bestanden hierboven.
