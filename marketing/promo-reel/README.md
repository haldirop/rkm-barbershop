# Promo-reel RKM Barbershop

Een korte promovideo (17 s) voor Instagram Reels, TikTok en YouTube Shorts, gemaakt van de eigen opname in de zaak.

| Bestand | Waarvoor |
| --- | --- |
| `RKM-promo-reel.mp4` | De video met eigen beat en geluidseffecten. Klaar om te posten. |
| `RKM-promo-reel-zonder-muziek.mp4` | Zelfde video, alleen met de geluidseffecten (whooshes, klappen). Gebruik deze als je in Instagram of TikTok zelf een populair nummer toevoegt. |
| `RKM-promo-cover.jpg` | Omslagfoto ("Strak geknipt.") om als cover te kiezen. |

Formaat 1080 × 1920 (9:16), 30 beelden per seconde. Alle tekst staat binnen het gebied dat apps niet afdekken
met knoppen of het bijschrift. De muziek is zelf gemaakt (geen nummers van anderen), dus er zijn geen
auteursrechtproblemen en het geluid wordt niet gedempt.

## Opbouw

| Tijd | Beeld | Tekst | Overgang naar volgende |
| --- | --- | --- | --- |
| 0–2 s | close-up van het knippen | STRAK GEKNIPT. | zoom-punch |
| 2–4 s | overzicht van achteren | ZELFVERZEKERD NAAR BUITEN. | whip pan |
| 4–6 s | camera beweegt naar binnen | KNIPPEN · FADES · BAARD (op de beat) | gouden lichtflits |
| 6–8 s | detail in slow motion | VAKMANSCHAP — tot in de details | spin |
| 8–11 s | draaiend shot met het hexagon-plafond | LOSSER — De Brink 18 | glitch |
| 11–13 s | uitzoomen, gouden spiegel | KLAAR VOOR EEN FRISSE LOOK? | vervagen + flits |
| 13–17 s | eindkaart | logo, BOEK NU ONLINE, rkmbarbershop.nl, De Brink 18 · Losser | — |

## Posten

1. Post als **Reel** (Instagram) of gewone video (TikTok/Shorts) en kies `RKM-promo-cover.jpg` als omslag.
2. Wil je een populair nummer gebruiken (vaak meer bereik)? Upload dan `RKM-promo-reel-zonder-muziek.mp4` en
   voeg in de app het nummer toe.
3. Zet de link naar rkmbarbershop.nl in je bio, dan klopt "link in bio" in het bijschrift.

Voorbeeld-bijschrift:

```
Strak geknipt. Zelfverzekerd naar buiten. ✂️
Knippen, fades en baardverzorging bij RKM Barbershop.
📍 De Brink 18, Losser
📅 Boek je afspraak online via rkmbarbershop.nl (link in bio)

#barbershop #barber #kapper #herenkapper #fade #skinfade #losser #twente #rkmbarbershop
```

## Opnieuw maken of aanpassen

De bron staat in `bron/`: de originele opname, de tekstanimaties (`overlay.html`), de muziek (`muziek.py`) en de
montage (`montage.py`). Teksten pas je aan in `overlay.html`, de shots en overgangen bovenaan `montage.py`.
Nodig: Python 3 met numpy, scipy en opencv-python-headless, ffmpeg en Node met Playwright.

```sh
cd marketing/promo-reel/bron
python3 muziek.py werk                       # werk/muziek.wav en werk/effecten.wav
npm install --no-save playwright             # eenmalig, als Playwright er nog niet is
node render-overlay.mjs werk/tekst           # tekstlaag, beeld voor beeld
python3 montage.py origineel.mov werk/tekst werk/muziek.wav werk/effecten.wav werk/uit
```

De video's en de omslag staan daarna in `werk/uit`.
