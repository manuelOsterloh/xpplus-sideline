# Prüfprotokoll

Stand: 12. Oktober 2026. Lokaler Nuxt-Prototyp, keine Freigabe für offiziellen Wettkampfbetrieb.

## Automatische Prüfungen

- `npm run typecheck`: erfolgreich.
- `npm test`: 75 Tests erfolgreich. Geprüft werden unter anderem Down/Distanz, Ballwechsel, NCAA-Sack-Zuordnung, Passversuche, TD/PAT/Kickoff, Safety, Strafstatistik, Red Zone, Pass Efficiency, Fumbles, Halbzeitfilter und geteilte Defense-Credits.
- `npm run build`: erfolgreich, Nuxt 4.6.1 / Nitro; Statisches Produktionsartefakt in `.output/public`, inklusive versioniertem Offline-Bundle mit 44 Dateien.
- `git diff --check`: erfolgreich.

## Im Browser überprüft

- Viewports 390 × 844, 768 × 1024, 1024 × 768 und 1440 × 1000 ohne horizontalen Seitenüberlauf; Tablet-Fokusmodus mit Speichern im sichtbaren Bereich.
- Lauf +5: Total Yards 167 → 172, First Down, Speicherung nach Reload; Undo stellt den vorherigen Zustand wieder her.
- Incomplete: Down steigt, Yardage bleibt unverändert; Persistenz und Undo geprüft.
- Playbook-Begriff umbenannt, im Call ausgewählt, Play gespeichert und zugehörige Playcall-Auswertung geprüft.
- Quarter auf Q3 und Uhr auf 08:00 korrigiert, +3-Yard-Play erfasst; Filter zweite Halbzeit zeigt ausschließlich diese 3 Yards. Testplay zurückgenommen und Demo-Spielstand wiederhergestellt.
- Zwei Tabs derselben Origin: neuer +1-Yard-Play aktualisiert Zuschauer-Dashboard von 167 auf 168; Undo aktualisiert zurück auf 167.
- Clubfarbe geändert und nach Reload geprüft, anschließend Standardtheme wiederhergestellt. Tag-/Nachtmodus visuell geprüft.
- Lokales JPEG als Logo gewählt, daraus erzeugtes Bild angezeigt und anschließend wieder entfernt.
- CSV über UI heruntergeladen, Kopfzeile und Ereigniszeilen gelesen. Enthält Call-Tags und Defense-Zuordnungen. JSON-Download ist implementiert, wurde nicht separat im Browser geprüft.
- Mobile Menünavigation und Kaderansicht geprüft.

Screenshots: [Tablet-Fokus](screenshots/tablet-focus.jpg), [Tablet-Hochformat](screenshots/tablet-portrait.jpg), [Gameday](screenshots/gameday.jpg), [Dashboard](screenshots/dashboard.jpg), [Mobil](screenshots/mobile.jpg).

## Abhängigkeiten und Grenzen

`npm audit` meldet nach dem Override von `simple-git` auf 4.0.2 **0 critical / 11 high**. Verbleibende Meldungen betreffen transitive Abhängigkeiten, unter anderem braces/micromatch/glob sowie node-forge/listhen in Nuxt-/Nitro-Werkzeugketten. Kein pauschales `audit fix --force`, da die vorgeschlagene Auflösung einen Nuxt-Downgrade beinhaltet. Vor einem Deployment sind die verbleibenden Meldungen und ihre Erreichbarkeit im konkreten Betriebsmodell zu bewerten und zu beheben. Der Entwicklungsserver bindet nur localhost.

Keine Prüfung auf physischen Tablets, kein gehostetes Deployment und keine Cloud-Synchronisierung. Offline-Neustart im Browser wurde inzwischen nachgewiesen (siehe Ergänzung). Lokal heißt Browserdaten auf diesem Gerät; mehrere gleichzeitig schreibende Tabs sind nicht abgesichert. Abdeckung und Grenzen bei NCAA-Sonderfällen, Return-Statistiken, Overtime und früheren Playkorrekturen stehen im [Recherche- und Konzeptdokument](STATISTICS-AND-UX.md).

## Ergänzung: NCAA, native Tablet-Bedienung und Offline

- 75 Tests decken nun zusätzlich OT-Serien, Timeoutkontingente, OT2/OT3-Trys, defensive Scores, Try-Loss-of-Down, Strafübertrag nach Ballwechsel, Half Distance, Annullierung, Return-Ketten, Laterals, Grounding, Bad Snap, Special Teams, Reviews und Service-Worker-Caching ab.
- Review-Neuberechnung prüft geänderte Folgeplays atomar; bei Konflikten bleiben die ursprünglichen Daten erhalten. Manuelle Zustandskorrekturen zwischen Plays bleiben beim Replay berücksichtigt.
- Service-Worker-Tests prüfen vollständiges Precache, Navigation ohne Netz, fehlgeschlagene Installation ohne Zerstörung älterer Caches sowie bewusst aktivierte Updates.
- Im Produktionsbrowser: Netz offline geschaltet, App neu geladen, +3-Yard-Play gespeichert und Analyse mit 170 Yards überprüft.
- Zusätzlich den lokalen Server vollständig gestoppt, App-Tab geschlossen und einen neuen Tab geöffnet: App startete aus dem Cache und zeigte den zuvor gespeicherten Spielstand. Eine nachträgliche Änderung des Plays auf +4 Yards war ebenfalls ohne Server möglich.
- OT durch die Oberfläche: Q4/0:00/Gleichstand → OT1 → TD → PAT → zweite Serie → FG miss → Final. Danach ist Speichern gesperrt.
- Return-TD nach Interception erfasst: Gastscore 7 → 13 und passende Conversion-Phase. Testplay anschließend zurückgenommen.
- Ungespeicherter +5-Yard-Entwurf über Reload erhalten. Produktionsupdate über „Update laden“ aktiviert, Demo-Daten erhalten und „Offline bereit“ wieder angezeigt.
- Neue App-Shell bei 390×844, 768×1024, 1024×768 und 1440×1000 geprüft. Keine horizontalen Seitenüberläufe; mobile Speicheraktion und Bottom-Navigation bleiben erreichbar.

Neue Screenshots: [Tablet quer](screenshots/tablet-native-landscape.jpg), [Tablet hoch](screenshots/tablet-native-portrait.jpg), [Mobil](screenshots/mobile-native.jpg). Die älteren Screenshots dokumentieren die erste Ausbaustufe.

Die Netz- und Cache-Nachweise stammen aus dem lokalen Chromium-Browser. Ein echter Flugmodus-/Home-Bildschirm-Test unter iPadOS/Safari und Android sowie Prüfung von Speicherbereinigung und OS-Neustart steht aus. Für die Installation am physischen Tablet braucht der Build einen HTTPS-Host; dieser wurde nicht eingerichtet. Es ist keine vollständige NCAA-Zertifizierung behauptet.

## Ergänzung: Produktpolish vom 22. Oktober 2026

- **93 Tests bestanden**, einschließlich 17 neuen Speicher-/Import-/Composable-Prüfungen und einer Farbkontrastprüfung mit 4.096 RGB-Stichproben. Typecheck und statischer Produktionsbuild bestanden. Das Offline-Bundle enthält nun 27 Dateien.
- Produktionsupdate über „Update laden“ aktiviert: vorheriger OT-Spielstand blieb erhalten. Neue Oberfläche, direkte Spielerkacheln und Demo-Kennzeichnung erschienen danach.
- JSON über die Oberfläche heruntergeladen und wieder ausgewählt. Importvorschau zeigte DUS/CGN, 30 Plays, 12 Spieler und Demo. „Übernehmen“ stellte 14:7, Q1/04:12 und 2nd & 5 auf OPP 48 wieder her. Eine fehlerhafte JSON-Datei wurde zuvor abgelehnt, ohne das Spiel zu verändern.
- Neues Spiel mit Bestätigung: 0:0, Q1/15:00, keine Demo-Markierung, Undo deaktiviert. Demo anschließend über die Bestätigung wieder geladen.
- Produktionsbrowser ohne Netzwerk neu geladen, +3 Yards gespeichert: Analyse zeigte 170 Total Yards. Weiterer Offline-Reload erhielt 170 Yards und die Analyse-Ansicht. Netzwerk danach wieder aktiviert und Testplay zurückgenommen.
- Pass +5, direkte Receiverwahl, Review auf +4 mit Pflichtbegründung und Undo geprüft. Playbook-Validierung bei leerem Begriff, Korrektur und Speicherung geprüft.
- Drawer-Schließen gibt den Fokus an „Clubfarben einstellen“ zurück. Navigation fokussiert den Hauptinhalt; Ansichten bleiben nach Reload erhalten.
- 390×844, 768×1024, 1024×768 und 1440×1000 ohne horizontalen Seitenüberlauf. Speichern bei 390px, Tablet hoch und quer im sichtbaren Bereich. Tag/Nacht visuell geprüft; ein zu heller Icon-Hover wurde anschließend korrigiert.
- Die Anleitung ist auch aus den Einstellungen erreichbar, wenn auf kleinen Displays das separate Hilfe-Icon entfällt.

Aktuelle Screenshots: [Tablet quer](screenshots/polish-tablet-landscape.png), [Tablet hoch](screenshots/polish-tablet-portrait.png), [Mobil](screenshots/polish-mobile.png). [Imagegen-Konzept und Designentscheidungen](design/DESIGN.md).

Der neue Offline-Nachweis betrifft Chromium und emulierten Netzverlust. Ein Schließen aller Browserprozesse, echter Geräte-Flugmodus, OS-Neustart und iPadOS-/Android-Installation wurden in diesem Durchlauf nicht geprüft. Die älteren Nachweise oben bleiben als historische Evidenz eingeordnet. Keine vollständige Screenreader-, WCAG- oder NCAA-Zertifizierung. Der aktuelle Audit bleibt bei 0 critical / 11 high; siehe [Produktqualität](PRODUCT-QUALITY.md).
