# Before & after RKM Barbershop

Een before/after-video (19 s) voor Instagram Reels, TikTok en YouTube Shorts, gemaakt van twee eigen opnames:
`bron/before.mp4` (de klant vóór het knippen) en `bron/after.mp4` (het resultaat).

| Bestand | Waarvoor |
| --- | --- |
| `RKM-before-after.mp4` | De video met eigen beat en geluidseffecten. Klaar om te posten. |
| `RKM-before-after-zonder-muziek.mp4` | Zelfde video met alleen de geluidseffecten, voor als je in de app zelf een populair nummer toevoegt. |
| `RKM-before-after-cover.jpg` | Omslagfoto: before en after boven elkaar, met het hele hoofd en gezicht in beeld. |

Formaat 1080 × 1920 (9:16), 30 beelden per seconde, 19 s. Alle tekst staat buiten het gebied van de knoppen en het
bijschrift in de apps. De muziek is zelf gemaakt (geen nummers van anderen).

## Opbouw

Natuurlijk en rustig: de kleuren precies zoals gefilmd, steeds het hele beeld (niet ingezoomd) en geen tekst over
de beelden.

| Tijd | Wat je ziet |
| --- | --- |
| 0–4 s | De before in echte slow motion (opgenomen met 120 beelden per seconde); de muziek bouwt op |
| 4 s | Een dunne gouden lijn veegt de before weg, op de drop van de muziek |
| 4–13 s | De after van drie kanten: zijkant, achterkant (hand door het haar, de fade) en de andere zijkant, met zachte overgangen |
| 13–15 s | Before en after boven elkaar, dezelfde kant op, het hele hoofd met gezicht in beeld |
| 15–19 s | Eindkaart: logo, "Ook zo'n frisse look? Maak je afspraak online", **BOEK NU ONLINE**, rkmbarbershop.nl en het adres |

De opnames kwamen via WhatsApp binnen (464 × 832 en 576 × 1024 pixels); ze zijn met Lanczos opgeschaald naar
1080 × 1920 en licht verscherpt. Met de originele 4K-bestanden wordt het nog scherper: zet ze in `bron/` en maak de
video opnieuw.

## Posten

Kies `RKM-before-after-cover.jpg` als omslag en zet de link naar rkmbarbershop.nl in je bio. Voorbeeld-bijschrift:

```
Before ➜ after ✂️ Van lang en ongetemd naar strak en fris.
Ook zo'n frisse look? Boek je afspraak online via rkmbarbershop.nl (link in bio)
📍 De Brink 18, Losser

#beforeandafter #barbershop #barber #kapper #herenkapper #fade #losser #twente #rkmbarbershop
```

## Opnieuw maken of aanpassen

De bron staat in `bron/`. De montage gebruikt de bouwstenen van de promovideo (`../promo-reel/bron/montage.py`).
De eindkaart pas je aan in `overlay.html`, de shots en overgangen bovenaan `montage.py`.
Nodig: Python 3 met numpy, scipy en opencv-python-headless, ffmpeg en Node met Playwright.

```sh
cd marketing/before-after/bron
python3 muziek.py werk                       # werk/muziek.wav en werk/effecten.wav
npm install --no-save playwright             # eenmalig, als Playwright er nog niet is
node render-overlay.mjs werk/tekst           # tekstlaag, beeld voor beeld
python3 montage.py before.mp4 after.mp4 werk/tekst werk/muziek.wav werk/effecten.wav werk/uit
```
