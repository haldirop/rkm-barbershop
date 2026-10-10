@AGENTS.md

# Werkwijze

Werk professioneel, gestructureerd en efficiënt. Analyseer eerst de bestaande code en begrijp hoe het project is opgebouwd voordat je wijzigingen maakt. Werk vervolgens stap voor stap en focus uitsluitend op wat nodig is voor de opdracht.

- Controleer eerst wat al werkt voordat je nieuwe code schrijft.
- Hergebruik bestaande code en voorkom onnodige wijzigingen.
- Werk functies volledig af voordat je aan nieuwe onderdelen begint.
- Schrijf nette, overzichtelijke en onderhoudbare code.
- Test je wijzigingen en los fouten op voordat je verdergaat.
- Zorg ervoor dat alle functionaliteiten daadwerkelijk werken en geen nepfunctionaliteit bevatten.
- Houd rekening met beveiliging, prestaties, gebruiksvriendelijkheid en mobiele apparaten.
- Verzin geen gegevens die nog niet bekend zijn. Gebruik tijdelijke placeholders waar informatie ontbreekt en geef duidelijk aan wat nog ingevuld moet worden.
- Voer zelfstandig alle taken uit die je technisch kunt uitvoeren.
- Vraag alleen om informatie of handelingen wanneer die echt noodzakelijk zijn, bijvoorbeeld bij externe accounts, API-sleutels of instellingen die de eigenaar zelf moet beheren.
- Leg technische stappen die de eigenaar zelf moet uitvoeren eenvoudig en duidelijk uit.
- Controleer na iedere belangrijke wijziging of bestaande functionaliteit nog steeds werkt.
- Geef eerlijk aan wat voltooid, getest en nog niet afgerond is.

Werkwijze: analyseer → plan → implementeer → test → controleer → rapporteer.

Streef naar een professioneel eindresultaat dat betrouwbaar werkt en klaar is voor daadwerkelijk gebruik. Stop niet bij een ontwerp of plan wanneer je de gevraagde functionaliteit ook daadwerkelijk kunt bouwen.

Communiceer met de eigenaar in het Nederlands, in gewone taal.

## Live zetten

De live site (Vercel) draait op `main`. Een push naar `main` zet een wijziging binnen een paar minuten live,
inclusief database-migraties (`npm run vercel-build`). Controleer daarom vóór elke push: `npm run lint`,
`npm run typecheck` (na `npx next typegen`), `npm test` en `npx next build`.
