# Before & after RKM Barbershop

Een before/after-video (18,5 s) voor Instagram Reels, TikTok en YouTube Shorts, gemaakt van twee eigen opnames:
`bron/before.mp4` (de klant vóór het knippen) en `bron/after.mp4` (het resultaat).

| Bestand | Waarvoor |
| --- | --- |
| `RKM-before-after.mp4` | De video met eigen beat en geluidseffecten. Klaar om te posten. |
| `RKM-before-after-zonder-muziek.mp4` | Zelfde video met alleen de geluidseffecten, voor als je in de app zelf een populair nummer toevoegt. |
| `RKM-before-after-cover.jpg` | Omslagfoto: before en after boven elkaar. |

Formaat 1080 × 1920 (9:16), 30 beelden per seconde. Alle tekst staat buiten het gebied van de knoppen en het
bijschrift in de apps. De muziek is zelf gemaakt (geen nummers van anderen).

## Opbouw

Geen tekst over de beelden: alleen de before en de after, daarna de eindkaart om te boeken.

| Tijd | Wat je ziet |
| --- | --- |
| 0–4 s | De before, in grijze, matte kleuren (de muziek klinkt gedempt en bouwt op) |
| 4 s | Een gouden lijn veegt de before weg, op de drop van de muziek |
| 4–12 s | De after van alle kanten: zijkant, achterkant, de fade van dichtbij, andere zijkant |
| 12–14 s | Before en after boven elkaar, gescheiden door een gouden lijn |
| 14–18,5 s | Eindkaart: logo, "Ook zo'n frisse look? Maak je afspraak online", **BOEK NU ONLINE**, rkmbarbershop.nl en het adres |

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
