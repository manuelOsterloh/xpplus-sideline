# Produktqualität für die Kundendurchsicht

Stand: 22. Oktober 2026 · unviber **Improve** · lokale Nuxt-App.

Die App wurde für eine nachvollziehbare Kundenvorführung überarbeitet: zügige Erfassung, konsistente Ansichten und verlässlicher Umgang mit lokalen Daten. Das Ergebnis ist eine prüfbare Präsentationsversion, keine Produktions-, NCAA- oder Barrierefreiheitszertifizierung.

## Umgesetzt

| ID / Bereich | Änderung und Nutzen | Nachweisgrenze |
| --- | --- | --- |
| PQ-01 · UX | Direkte Spielerkacheln mit Nummer, Name und Auswahlmarkierung; vollständiger Kader weiter über „Alle“ erreichbar. Kurze Aktionen und feste Navigation halten den Erfassungsweg kompakt. | Komponenten-/Layoutprüfung; tatsächliche Bedienzeiten nicht gemessen. |
| PQ-02 · UX | Gemeinsame Flächen-, Text-, Fokus- und Trennfarben; Clubfarben behalten ihre Rollen. Vordergrundfarben werden anhand des Kontrasts gewählt. Halftime-Texte verlieren den berechneten Kontrast nicht mehr durch reduzierte Deckkraft. | Kontrastfunktion mit 4.096 RGB-Farben getestet; keine vollständige Prüfung sämtlicher gerenderter Kombinationen. |
| PQ-03 · UX / NAT | Review mit zugänglichem Titel, passenden Ergebnisoptionen, Pflichtgrund und sichtbarer Validierung. Drawer geben Fokus nach dem Entfernen von `inert` zurück. Spielfeld unterstützt Pfeile, Home/End und Page Up/Down. | Code geprüft; einzelne Browserabläufe siehe Prüfprotokoll. Screenreader und physische Tablets bleiben gesondert zu prüfen. |
| PQ-04 · UX | Playbook mit Auswahlzuständen, Fehlermeldungen, Leerzuständen und Speicherbestätigung; Navigation mit aktiver Ansicht, URL-Hash und Seitentitel. Beispieldaten sind als Demo erkennbar und bewusst erneut ladbar. | Alle unten aufgeführten Ansichten im Umfang; kein erfundener Kunden- oder Live-Spielnachweis. |
| PQ-05 · Daten | JSON-Sicherungen werden vor Übernahme strukturell geprüft. Vorschau nennt Spiel, Kader und ersetzte Inhalte. Vor Import, Neustart oder Demo-Wechsel bleibt der vorherige Stand wiederherstellbar. | Tests für ungültige Dateien, doppelte Identitäten, unerlaubte Medien/Farbwerte und fehlgeschlagene Übernahme. Kein Nachweis der sportlichen Richtigkeit fremder Importdaten. |
| PQ-06 · Daten | Nicht lesbare Originaldaten bleiben erhalten. Speicherfehler werden angezeigt; Änderungen bleiben exportierbar und können erneut gespeichert werden. Ein Play schreibt einen konsistenten Zustand statt mehrerer Zwischenstände. | Tests der tatsächlichen Vue-Composable einschließlich Quotenfehlern und Wiederherstellung. |
| PQ-07 · PER | Lokal ausgelieferte Fonts auf benötigte Varianten reduziert; kein zusätzliches UI-Framework oder externer Laufzeitdienst. | Gemessene Produktionsartefakte; keine Aussage zu realen Sideline-Geräten oder Netzlatenzen. |

Die Regeln UX, NAT, PER und PRV aus unviber dienten als Prüfraster. Datenverlust- und Scoring-Grenzen sind ergänzende projektspezifische Prüfungen.

## Vollständiger UI-Umfang

| Oberfläche | Berücksichtigte Zustände / Varianten |
| --- | --- |
| Spiel | Demo, bestehendes Spiel, Einstieg in Erfassung, Offense/Defense und Setup-Aktionen |
| Erfassen | Lauf/Pass, direkte Spielerwahl, weitere Playtypen, Feld, Playcall, Details/Ruling, Fehler, Undo, Final und OT-Kontext |
| Analyse | Offense/Defense, Halbzeiten/OT, Team-/Spieler-/Special-Teams-Werte, Halftime und leere Abschnitte |
| Verlauf / Review | Filter, leerer Verlauf, frühere Korrektur, Begründung, ungültige Folgezustände |
| Kader / Playbook | Anlegen, Bearbeiten, Validierung, leere Kategorien und ausgewählte Begriffe |
| Einstellungen | Drei Clubfarben, Logo, Tag/Nacht, Regeln, Export, Importvorschau, Wiederherstellung, Demo und neues Spiel |
| Hilfe / Spielsituation | Anleitung, manuelle Korrektur, Spieluhr, Quarter, Timeouts und Overtime |
| Übergreifend | Bottom-Navigation, Fokus, Entwurf, Speichermeldung, Offline-Bereitschaft und App-Update |

Es gibt einen lokalen Arbeitsbereich ohne Anmeldung, Rollen, Serverdatenbank, Zahlungsfluss oder Cloud-Synchronisierung. Gleichzeitiges Schreiben mehrerer Tabs ist weiterhin kein abgesichertes Mehrbenutzerverfahren. Die visuellen Varianten sind Tag/Nacht, drei konfigurierbare Clubfarben sowie Tablet hoch/quer, schmale Mobilansicht und Desktop. Ihre Aufnahme in den Umfang ist kein pauschaler Testpass.

## Prüfergebnisse und Umfang

- **Pass – lokal ausgeführt:** 93 automatisierte Tests, TypeScript-Prüfung und Produktionsbuild. Enthalten sind bestehende Football-/OT-/Offline-Tests sowie neue Speicher-, Import-, Composable- und Farbkontrastprüfungen.
- **Browser:** konkrete Abläufe, Viewports und Screenshots werden im [Prüfprotokoll](VALIDATION.md) mit ihrem tatsächlich geprüften Umfang geführt. Aktueller Offline-Reload mit Erfassung und erneuter Persistenzprüfung ist nachgewiesen. Die älteren vollständigen Serverstopp-Nachweise stammen vom 12. Oktober; beides ersetzt keinen physischen Gerätetest.
- **Unverifiziert:** physisches iPad/Android, Installation vom HTTPS-Host, Betriebssystem-Neustart/Speicherbereinigung, Screenreader-Gesamtdurchlauf, gerenderter Reduced-Motion-/Textzoom-Durchlauf, Sonne/Handschuhe und längerer echter Spielbetrieb.
- **Nicht anwendbar im aktuellen Umfang:** Login-/Rollen-/Tenant-Isolation, Zahlungsannahme und serverseitige Datensicherheit. Daraus folgt keine Sicherheitsgarantie für eine spätere Cloud-Version.

Produktionsartefakte nach Optimierung:

| Asset | Dateien | Bytes | Gzip-Bytes |
| --- | ---: | ---: | ---: |
| JavaScript | 5 | 297.726 | 101.927 |
| CSS | 3 | 78.567 | 16.319 |
| Fonts | 6 | 101.748 | — |

Die Font-Basis lag bei 14 Dateien / 175.904 Bytes: rund 42 % weniger Font-Daten. Artefaktgrößen sind kein Ersatz für gemessene Lade- und Reaktionszeiten auf Zielgeräten.

## Offene Abhängigkeiten

Der am **22. Oktober 2026 live ausgeführte `npm audit`** meldet weiterhin **0 critical / 11 high**. Die Pfade zu `braces@3.0.3` und `node-forge@1.4.0` führen über Nuxt/Nitro und dessen Werkzeuge. Der lokale Vorschau-Server liefert statische Dateien und verwendet ausschließlich Node-Bordmittel. Das begrenzt den hier geprüften Betrieb, beweist aber keine allgemeine Nicht-Erreichbarkeit der Advisories. Npm schlägt für Teile der Kette einen Nuxt-Downgrade vor; Abhängigkeiten wurden deshalb nicht blind verändert.

Vor einer öffentlichen Bereitstellung: betroffene Abhängigkeiten samt tatsächlichem Betriebsmodell bewerten, HTTPS-Hosting einrichten und die genannten physischen Gerätetests durchführen. Die übrigen fachlichen Grenzen stehen in [Statistik und UX](STATISTICS-AND-UX.md). Ein persistentes Mehrspielarchiv ist weiterhin nicht enthalten; die vorherige Sicherung ist kein Archiv.

## Referenzen

Die Kontrastentscheidung orientiert sich an [W3C: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Große Tablet-Touchflächen sind eine Produktentscheidung; sie ersetzen nicht die Prüfung von Größe und Abstand nach [W3C: Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Dialogbenennung, Fokusbegrenzung, Escape und Fokusrückgabe folgen dem [W3C-Muster für modale Dialoge](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
