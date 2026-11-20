# MIDFIELD

Tabletoptimierter American-Football-Scoring-Prototyp mit Nuxt **4.6.1**, Vue 3 und TypeScript. Flat Design, drei Clubfarben, Fokusmodus, Play-by-Play-Erfassung und direkt abgeleitete Statistiken. Keine Tarifstufen.

## Lokal starten

Node 22.23.1 wurde verwendet (Nuxt CLI benötigt Node 22.21+ oder eine unterstützte neuere Linie).

```sh
npm ci
npm run dev
```

Der Server bindet ausschließlich `127.0.0.1`. Nutzt Port 3000 oder den nächsten freien Port. Die Produktionsvorschau startet mit `npm run build && npm run preview` auf **http://localhost:3002/**. Offline-Funktionen sind nur im Produktionsbuild aktiv.

```sh
npm run test
npm run typecheck
npm run build
```

## Arbeitsstand

- Live: Run, Pass, Sack, Kneel, Spike, Grounding, Bad Snap, Punt, FG, PAT, 2-Point und Kickoff. Strukturierte Strafen, Returns, Recovery-Ketten und Laterals über „Ruling“.
- Down, Distanz, First Down, Ballwechsel und Score werden weitergeführt.
- Dashboard: Team-/Spielerwerte, Conversions, Red Zone, NCAA Pass Efficiency, Richtungs-Splits, Air Yards/YAC, Coaching-Metriken.
- Offense-/Defense-Startseite, editierbare Playbooks, Personnel und Teambegriffe, Halbzeitfilter und Halftime-Vergleich.
- Spieler hinzufügen sowie Name/Position bearbeiten, Clubfarben via Hex/Farbwähler, JPEG-/PNG-Logo, Tag-/Nachtmodus.
- Manuelle Scoreboard-/Feldpositionskorrektur, Quarterlängen 8/10/12/15 Minuten, optionale Playdauer-Schätzung.
- Verlauf filtern und frühere Plays mit Begründung korrigieren. Folgespielzüge werden atomar neu berechnet; unvereinbare Folgen blockieren die Änderung. Revisionen im JSON-Export.
- NCAA-Overtime mit Serienwechsel, 2-Point-Pflicht ab OT2, Try-Shootout ab OT3, Timeoutkontingenten und Final-Sperre.
- Tablet-App-Shell mit direkter Spielerwahl, kompakter Spielanzeige, Bottom-Navigation, kurzen Buttons und fest erreichbarer Speicheraktion. Einheitliche Tag-/Nachtflächen und kontrastberechnete Clubfarben.
- Browserlokale Persistenz, sofortige Updates zwischen Tabs derselben Origin, CSV-/JSON-Export. Validierter JSON-Import mit Vorschau und Sicherung des vorherigen Stands. Speicherfehler bleiben sichtbar und der Arbeitsspeicher exportierbar. Ein schreibender Tab; weitere Tabs als Zuschauer.
- Schriftdateien und Icons werden lokal ausgeliefert. Keine externen Assets zur Laufzeit erforderlich.
- Der erste Start lädt ein synthetisches Demospiel. Keine echten Spieler- oder Live-Matchdaten.

[Recherche, Quellen, Statistikmatrix und offene Produktanforderungen](docs/STATISTICS-AND-UX.md) · [Prüfprotokoll](docs/VALIDATION.md) · [Produktqualität](docs/PRODUCT-QUALITY.md) · [Design & Imagegen](docs/design/DESIGN.md)

## Offline auf dem Tablet

1. Produktionsbuild über **HTTPS** bereitstellen (lokal ist `localhost` die Browser-Ausnahme). Der lokale Vorschau-Link ist nicht vom Tablet aus erreichbar.
2. Im Tablet-Browser einmal online öffnen und **„Offline bereit“** abwarten. Erst dann sind HTML, JavaScript, Icons und Schriften vollständig gespeichert.
3. iPad: über das Teilen-Menü zum Home-Bildschirm hinzufügen; Android: im Browser „App installieren“. Die installierte Ansicht einmal online öffnen und die Bereitschaft erneut prüfen.
4. Danach lassen sich App, Erfassung, Auswertung und Korrekturen ohne Netz verwenden. Auch ein ungespeicherter Play-Entwurf wird lokal wiederhergestellt.
5. Updates erscheinen in den Einstellungen als **„Update laden“** und werden bewusst aktiviert. Kein automatischer Austausch während einer laufenden Erfassung.

Der Service Worker hält eine versionierte App-Kopie. Spiele, Revisionen, Clubdaten und Entwürfe bleiben im lokalen Browserprofil. Browserdaten können vom System oder Nutzer entfernt werden; JSON-Exporte bleiben deshalb wichtig. Ein physischer iPad-/Android-Installationstest und HTTPS-Deployment wurden noch nicht durchgeführt.

## Grenzen

Dies ist eine bedienbare lokale Grundlage, keine produktionsfertige Liga- oder NCAA-zertifizierte Plattform. Noch offen sind die Abdeckung sämtlicher seltenen Regelkombinationen, ein Mehrspielarchiv. Die konkret unterstützten Sonderfälle und manuelle Officials-Entscheidungen sind im Recherchedokument abgegrenzt. Cloud-Synchronisierung und Authentifizierung sind im gewählten On-device-Scope nicht vorgesehen. Der v0-Chat einschließlich beider Konzeptanhänge wurde im angemeldeten Chrome gelesen und einbezogen. Die dort ausdrücklich gewählte lokale Speicherung ist umgesetzt. Siehe die vollständige Matrix im Recherchedokument.

`shared/game.ts` enthält die reine Scoring-Logik; `app/composables/useGame.ts` verwaltet Persistenz; `app/app.vue` die Arbeitsansichten. Die Abhängigkeiten sind über `package-lock.json` reproduzierbar. `simple-git` wird wegen veröffentlichter Sicherheitsmeldungen auf 4.0.2 überschrieben; Nuxt Devtools sind deaktiviert. Es verbleiben transitive npm-Audit-Meldungen, siehe Prüfprotokoll. Kein Deployment wurde vorgenommen.
