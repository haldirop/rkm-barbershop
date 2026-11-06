# Before & after RKM Barbershop

Een korte before/after-video (12,5 s) voor Instagram Reels, TikTok en YouTube Shorts, gemaakt van twee eigen opnames:
`bron/before.mp4` (de klant vóór het knippen) en `bron/after.mp4` (het resultaat).

| Bestand | Waarvoor |
| --- | --- |
| `RKM-before-after.mp4` | De video met eigen beat en geluidseffecten. Klaar om te posten. |
| `RKM-before-after-zonder-muziek.mp4` | Zelfde video met alleen de geluidseffecten, voor als je in de app zelf een populair nummer toevoegt. |
| `RKM-before-after-cover.jpg` | Omslagfoto: before boven, after onder, met het hele hoofd en gezicht scherp in beeld. |

Formaat 1080 × 1920 (9:16), 30 beelden per seconde, 12,5 s. Alle tekst staat buiten het gebied van de knoppen en het
bijschrift in de apps. De muziek is zelf gemaakt (geen nummers van anderen).

## Opbouw

Kort, natuurlijk en scherp: de kleuren precies zoals gefilmd, steeds het hele beeld (niet ingezoomd) en geen tekst
over de beelden.

| Tijd | Wat je ziet |
| --- | --- |
| 0–3 s | De before in echte slow motion (opgenomen met 120 beelden per seconde); de muziek bouwt op |
| 3 s | Een dunne gouden lijn veegt de before weg, op de drop van de muziek |
| 3–9 s | De after van drie kanten: zijkant, achterkant (hand door het haar, de fade) en de andere zijkant met het gezicht |
| 9–12,5 s | Eindkaart: logo, "Ook zo'n frisse look? Maak je afspraak online", **BOEK NU ONLINE**, rkmbarbershop.nl en het adres |

## Scherpte

De opnames kwamen via WhatsApp binnen en zijn daardoor klein (464 × 832 en 576 × 1024 pixels) met
compressieblokjes. Elk beeld is daarom eerst 4× opgeschaald met de AI-opschaler Real-ESRGAN (model
`realesr-general-x4v3`, BSD-3-licentie) en daarna terug verkleind naar 1080 × 1920: scherpe haartjes, een strakke
fade en geen blokjes. Met de originele 4K-bestanden wordt het nog beter: zet ze in `bron/` en maak de video opnieuw.

## Posten

Kies `RKM-before-after-cover.jpg` als omslag en zet de link naar rkmbarbershop.nl in je bio. Voorbeeld-bijschrift:

```
Before ➜ after ✂️ Van lang en ongetemd naar strak en fris.
Ook zo'n frisse look? Boek je afspraak online via rkmbarbershop.nl (link in bio)
📍 De Brink 18, Losser

#beforeandafter #barbershop #barber #kapper #herenkapper #fade #losser #twente #rkmbarbershop
```

## Opnieuw maken of aanpassen

De bron staat in `bron/`. De montage gebruikt bouwstenen van de promovideo (`../promo-reel/bron/montage.py`).
De eindkaart pas je aan in `overlay.html`, de shots en overgangen bovenaan `montage.py`.
Nodig: Python 3 met numpy, scipy, opencv-python-headless, onnx en onnxruntime, ffmpeg en Node met Playwright.

```sh
cd marketing/before-after/bron
curl -L -o werk/realesr-general-x4v3.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
python3 opschalen.py model werk/realesr-general-x4v3.pth werk/realesr-general-x4v3.onnx   # eenmalig
python3 muziek.py werk                       # werk/muziek.wav en werk/effecten.wav
npm install --no-save playwright             # eenmalig, als Playwright er nog niet is
node render-overlay.mjs werk/tekst           # eindkaart, beeld voor beeld
python3 montage.py before.mp4 after.mp4 werk/tekst werk/muziek.wav werk/effecten.wav werk/uit werk/realesr-general-x4v3.onnx
```

Het opschalen kost een paar seconden per beeld; de opgeschaalde beelden worden bewaard in `werk/uit/cache`, dus een
tweede keer gaat snel.
