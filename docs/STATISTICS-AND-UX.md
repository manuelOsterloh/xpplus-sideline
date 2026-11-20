# MIDFIELD — Statistikmodell und Bedienkonzept

Stand: 12. Oktober 2026. Keine Basic-/Advanced-/Premium-Trennung. Alle verfügbaren Funktionen befinden sich im selben Workspace.

## Recherche und Quellen

Die fachliche Referenz ist das von der NCAA aktuell verlinkte [Football Statisticians’ Manual](https://s3.amazonaws.com/fs.ncaa.org/Docs/stats/Stats_Manuals/Football.pdf), zugänglich über die [NCAA-Statistikseite](https://www.ncaa.org/championships/statistics-and-records/football/). Das PDF nennt kein eindeutig sichtbares aktuelles Ausgabejahr; es wird deshalb nicht als „2026-Regelbuch“ bezeichnet.

Für die Umsetzung besonders relevant:

- Sacks gehören zur Rushing-Bilanz. Kneeldowns und Spikes werden dem Team zugerechnet.
- Passing Yards enthalten den Raumgewinn nach dem Fang; derselbe Gewinn wird dem Receiver zugeschrieben.
- Straf-Yards sind die tatsächliche Distanz, einschließlich Half-the-distance. Strafen sind keine pauschalen Laufverluste.
- Third-Down-Effizienz berücksichtigt besondere Strafsituationen; ein allein durch Strafe erzieltes First Down ist kein Conversion-Versuch.
- Red-Zone-Chancen werden pro Ballbesitz gezählt. Ein späterer Raumverlust entfernt eine bereits erreichte Chance nicht.
- NCAA Pass Efficiency: `(8.4 × Yards + 100 × Completions + 330 × TD − 200 × INT) / Attempts`.
- First Downs und Touchdowns sind bei Goal-to-go sowie Ballverlust differenziert zu behandeln.

Die [ESPN-Teamstatistik](https://www.espn.com/college-football/team/stats/_/type/team/id/2) dient als Referenz für Team-Boxscores, insbesondere Passing, Rushing, First Downs und Possession. ESPNs interner Erfassungsprozess ist damit **nicht** belegt; die App behauptet weder ESPN-Kompatibilität noch eine ESPN-Datenanbindung.

[iScore Football](https://iscoresports.com/football/) beschreibt visuelle Spielzugerfassung, Quick Play, nachträgliche Ergänzungen, Undo/Redo und Exporte. Daraus folgt für unseren Entwurf: Spielzugtyp → Beteiligte → Ergebnis/Endpunkt, mit Korrektur ohne erneute Gesamterfassung. [Hudl](https://www.hudl.com/blog/five-reasons-accurate-game-stats-are-vital-to-football-coaches) dient als visuelle Referenz für situationsbezogene Tablet-Erfassung. [Live Score](https://www.live-score-app.com/userguide/ipad) zeigt große, getrennte Steuerflächen.

Der bereitgestellte [v0-Chat](https://v0.app/xpplus/chat/sideline-platform-design-libyRTpcHmx) wurde nach Öffnung durch den Nutzer im angemeldeten Chrome-Browser gelesen, einschließlich der Anhänge „Pasted 9 lines“ und „Pasted 5 lines“. Einbezogen wurden die dortigen Nutzerprompts zu Offense/Defense, eigenen Playbooks, Personnel, Formation/Motion/Tags/Konzepten, Front/Coverage/Blitz/Stunts, Roster, manueller Scoreboard-Korrektur, Quarterlängen 8/10/12/15 Minuten, Tag-/Nachtmodus, Hexfarben/Farbwähler/Logo sowie Halbzeitvergleich. Der Chat entscheidet ausdrücklich **On-device only**; daher gehört geräteübergreifende Cloud-Synchronisierung nicht zum aktuellen Scope. Aussagen des früheren v0-Assistenten wurden nicht als Nachweis unserer Implementierung übernommen.

## Tatsächlich implementiert

| Bereich       | Erfassung                                                                                  | Automatische Auswertung                                                              |
| ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Spielkontext  | Quarter, Uhr-Differenz, Down, Distanz, Ballspot, Ballbesitz                                | Folgezustand, Drive, Score; Quarterwechsel bei 00:00                                 |
| Rushing       | Läufer, Netto-Yards, Sack, Team-Kneel, Fumble lost                                         | Versuche, Yards, Yards/Play, First Downs                                             |
| Passing       | Passer, Receiver, Completion, Incomplete, INT, Team-Spike                                  | C/A, Pass-Yards, Receiver-Yards, NCAA Efficiency                                     |
| Scoring       | TD aus Goalline-Endpunkt, PAT, 2-Point, FG, Safety                                         | Punkte, Conversion-/Kickoff-Phase                                                    |
| Defense       | Tackler, Assist, Sack, INT, FF, FR, PBU                                                         | Solo/Assist, geteilte Sacks/TFL, INT/FF/FR/PBU-Credits                                             |
| Special Teams | Punt-Distanz, FG-Distanz/Erfolg, Kickoff, Touchback, Folgespot                             | Puntzahl/Brutto-Yards und FG-Quote                                                   |
| Strafen       | Eigenständiger No-Play-Strafdatensatz, tatsächliche Yards, Team, Repeat/First/Loss of Down | Ballspot, Distanz, Strafzahl/-Yards; kein Offense-Yardage                            |
| Coaching      | Personnel, Formation, Motion, Tag, Konzept; Front/Coverage/Blitz/Stunt; Air Yards                                                   | Playcall-Splits nach Begriff/Down/Distanz, Richtungen, Success/Stops, Explosives, YAC |
| Spielverlauf  | Zeitgestempelter Vorher-/Nachher-Zustand pro Play                                          | Filter, letzte Plays, Rücknahme und erneute Eingabe des letzten Plays                |
| Daten         | Browserlokaler Speicher, CSV, JSON                                                         | Sofortige Neuberechnung; BroadcastChannel zwischen Tabs derselben Origin             |

Playcall-Tags sind optional; ohne Auswahl bleiben sie leer oder „Nicht erfasst“. Demo-Plays sind synthetisch, Spielernamen ebenfalls. Auswertungen rechnen ausschließlich mit dem Ereignisprotokoll, nicht mit fest eingeblendeten Zahlen.

Unsere Coaching-Definitionen sind explizit konfigurierbare Produktentscheidungen für eine spätere Version: Success = mindestens 50/70/100 Prozent der benötigten Distanz bei Down 1/2/3–4; Explosive = mindestens 10 Lauf- oder 20 Pass-Yards. Der Prototyp verwendet diese Schwellen fest. EPA, Win Probability und Total QBR werden nicht ohne belastbares Modell dargestellt.

## Bedienung am Tablet

1. Die App startet direkt in der fokussierten Erfassung, unabhängig von der Tablet-Ausrichtung. Spielsituation, vier häufige Playtypen, Yards und Speichern stehen im Vordergrund. Weitere Playtypen sind im aufklappbaren Menü erreichbar.
2. Der normale Lauf mit bereits gewähltem Spieler braucht zwei Taps: Yardwert und Speichern. Beim Pass kommt das Ergebnis hinzu.
3. Die Feldgrafik wird im Fokusmodus bei Bedarf geöffnet. Ein Tap setzt den Endpunkt; die Yard-Differenz wird abgeleitet. Pfeiltasten bieten dieselbe Funktion.
4. Nach einem Touchdown bietet die App PAT/2-Point an, anschließend Kickoff. Ein Ballwechsel setzt Spieler-Vorauswahlen aus dem gegnerischen Kader.
5. Details bleiben optional; fehlende Spieler können als offen gespeichert werden. Im Verlauf öffnet „Review“ jeden früheren Play. Änderungen werden begründet, Folgeplays neu berechnet und Revisionen gespeichert. Ungültige Folgezustände verhindern die gesamte Änderung.
6. Die Stadionuhr bleibt die Referenz. Alternativ kann die Playdauer durch Halten und Loslassen eines Buttons geschätzt werden; diese Zeit wird als geschätzt im Ereignis gespeichert. Ohne eingetragene Zeitdifferenzen ist die Possession-Zeit unvollständig. Es gibt keinen irreführenden automatisch laufenden Spieltimer.
7. Navigation erfolgt über eine feste Bottom-Bar mit kurzen Tabs. Einstellungen öffnen als seitliches Panel, Review als Dialog; beide mit Escape und Fokusbegrenzung.
8. Tag-/Nachtmodus ist unabhängig vom Clubtheme. Primär-, Sekundär- und Akzentfarbe werden unmittelbar angewendet. Kontrastfarbe auf diesen drei Flächen wird automatisch ausgewählt. Neutrale und semantische Feldfarben bleiben lesbare Funktionsfarben.

## Ergänzte NCAA-Sonderfälle und Overtime

- **Strafen:** Accepted/Declined/Offsetting, Live-/Dead-Ball, Previous/End/Foul Spot, Half Distance, automatisches First Down, Loss of Down, Safety, Übertrag zum Kickoff sowie explizite Untimed-Down-Entscheidung. Statistik-Yards und Enforcement werden getrennt erfasst. Annullierte Plays erzeugen keine Versuche/Yards.
- **Returns:** Kick/Punt/INT/Fumble/Field-Goal-Returns mit eigenen Start-/Endspots und Spielerzuordnung; Return-TD, Safety, weitere Fumbles/Recoveries und Laterals. Die Kette wird auf zusammenhängende Spots geprüft. Bei Momentum-Ausnahmen muss der offizielle Ballspot statt eines vermeintlichen Safetys eingegeben werden.
- **Laterals:** Yard-Anteile am Lauf oder vollständigen Pass, ohne zusätzlichen Versuch oder zusätzliche Reception. Grounding wird als Team-Rushing-Verlust statt Passversuch/Sack gewertet; Bad Snap als Team-Fumble.
- **Special Teams:** Fair Catch einschließlich regulärer Kickoff-25, Safety Free Kick, Touchbacks, Onside-Recovery, geblockte Kicks, eigene Recovery/Advance und Muff-Recovery jenseits der Neutral Zone. Missed FG ohne Return nutzt Previous Spot bzw. eigene 20. Punt-Netto, Inside-20, Touchbacks und Return-Yards; fehlende Returndetails bleiben sichtbar unvollständig.
- **Conversions:** offensive Punkte, defensive 2 Punkte und 1-Punkt-Safetys, ohne normale Offense-Yards/Attempts. Fouls können eine Wiederholung oder Ende durch Loss of Down auslösen.
- **OT:** Start nur nach beendetem Q4 bei Gleichstand. Erste zwei OT-Runden mit Serien an OPP25, ab OT2 verpflichtender 2-Point-Try, ab OT3 je ein Try an OPP3. Wahl der nächsten ersten Offense überschreibbar. Eine Auszeit pro Team in OT1 und OT2; ab OT3 ein gemeinsames Kontingent für alle restlichen Runden. Kein Kickoff und keine Spieluhr. Defensive Scores außerhalb des Try sowie entscheidende zweite Serien beenden das Spiel. Defensive Try-Punkte der ersten Serie lassen den gegnerischen Try bestehen.
- **OT-Strafen nach Ballwechsel:** „Nach Ballwechsel“ erfasst 3-1-3g; gewöhnliche Fouls werden per Regel abgelehnt, eigene Live-Ball-Fouls annullieren den Score. Qualifizierende Überträge werden am Start der nächsten Serie bzw. des nächsten Plays vollzogen. Das konkrete Foul und die Übertragsentscheidung kommen von den Officials.

Regelquellen: [NCAA Football-Regelportal](https://www.ncaa.org/championships/playing-rules/football-playing-rules/), [NCAA Rule 3-1-3 mit Approved Rulings bei SDCFOA](https://www.sdcfoa.org/ncaa/rule-3-periods-time-factors-and-substitutions-1/college-3-1-3), [NCAA zu den Timeoutänderungen 2025](https://www.ncaa.org/news/media-center-changes-to-injury-timeouts-approved-in-football/) und das oben verlinkte NCAA Statistics Manual. Die App ersetzt keine Officials-Entscheidung.

## Verbleibende Grenzen

- Keine Behauptung vollständiger NCAA-Zertifizierung. Seltene Kombinationen wie erneuter Kick oder Pass nach einem Block innerhalb desselben Downs haben noch kein vollständiges mehrstufiges Statistikmodell. Fumble-Advance-Beschränkungen, Momentum, Kick-Interference und komplexe Strafwahlrechte brauchen die offizielle Entscheidung und den legalen Endspot. Individuelle Run-after-Block-Yards sowie sämtliche Conversion-Return-Credits sind noch nicht separat ausgewiesen.
- Defense-Credits brauchen praktische Sonderfallvalidierung: zwei Tackler ergeben je einen Assist und bei Sack/TFL je 0,5; eine einzelne Zuordnung Solo. Hurries und Blocks sind ergänzt.
- Mehrspielarchiv, Halbzeit-Kickoffplanung, Löschen von Kaderspielern und Identitätsmigration bei Nummernwechseln fehlen weiterhin. Namen und Positionen sind editierbar.
- Ein HTTPS-Deployment und Test auf physischen iPads/Android-Tablets stehen aus. Der Produktionsbuild unterstützt bereits Offline-Neustart über einen versionierten Service Worker. Browserdaten können vom Nutzer/System entfernt werden.
- Nur bei späterer Erweiterung des On-device-Modells: Serverpersistenz, Authentifizierung, Rollen und geräteübergreifende Synchronisierung.

BroadcastChannel ist für einen lokalen Arbeitsbereich gedacht, nicht als konkurrierendes Mehrbenutzerprotokoll. Mehrere gleichzeitig schreibende Tabs können Änderungen überschreiben. Für den Prototyp soll genau ein Tab erfassen; weitere Tabs dürfen das Dashboard beobachten.

## Halbzeit- und Playcall-Analyse

Der Halbzeitfilter verwendet für Teamwerte, Tabellen und Charts denselben gefilterten Ereignissatz. Q1/Q2 bilden Halbzeit 1, Q3/Q4 Halbzeit 2. Overtime hat einen separaten Filter und fließt nicht in die zweite Halbzeit ein. Das explizite Halftime-Panel zeigt immer beide Hälften nebeneinander. Leere Abschnitte erzeugen keine 100-Prozent-Stop-Rate. Offense zeigt eigene Werte, Defense die zugelassenen gegnerischen Werte und zusätzlich eigene Defense-Credits. Playcall-Tabellen können nach Formation, Konzept, Personnel, Motion, Tag, Front, Coverage, Blitz oder Stunt sowie Down und Distanz gefiltert werden. Der CSV-Export enthält das vollständige Ereignisprotokoll inklusive Call-Tags und anschließend eine kompakte Teamstatistik, unabhängig vom sichtbaren Halbzeitfilter.

## Optionale spätere Serverarchitektur

`clubs → teams → rosters → games → drives → play_events → player_credits`

Ein serverseitig validiertes Ereignis trägt `event_id`, `game_id`, `revision`, `ruleset_version`, `actor_id`, `device_id`, `recorded_at`, `game_clock`, `before`, `payload` und `after`. Die Statistikprojektion wird deterministisch daraus berechnet. Korrekturen referenzieren ein Originalereignis, statt es unbemerkt zu überschreiben. Der Offline-Client hält eine Outbox; der Server quittiert eindeutige Ereignisse und löst Versionskonflikte explizit auf. Dashboard-Abonnenten erhalten nur bestätigte Projektionen und separat markierte lokale Änderungen.

## Ergänzung vom 22. Oktober 2026

JSON-Sicherungen können mit Vorschau importiert werden. Daten werden strukturell validiert; vor dem Ersetzen bleibt der aktuelle Stand lokal als vorherige Sicherung erhalten. Die Validierung bestätigt keine fachliche NCAA-Richtigkeit fremder Statistiken. Demo und neues Spiel sind bewusst getrennte Aktionen. Details: [Produktqualität](PRODUCT-QUALITY.md).
