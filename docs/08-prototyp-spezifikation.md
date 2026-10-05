# Verbindlicher Desktop-Prototyp v0.1.1

> Aktueller Stand v0.3: [Sechs Elemente und neun Türme](12-elemente-und-tuerme.md). Dort festgelegte Erweiterungen haben Vorrang vor älteren Angaben.

> Aktueller Stand v0.2: [Bewohner, Räume und Ressourcen](11-bewohner-und-raeume.md). Diese Erweiterung hat bei abweichenden Angaben Vorrang.
Stand: 4. Oktober 2026. Vom Nutzer zur Umsetzung freigegeben. Diese Spezifikation ersetzt die früheren offenen Browser-, Offline- und Konkurrenzvorschläge.

## Umfang
Windows-x64-Anwendung mit Electron, TypeScript, React, Vite und Electron Forge. Drei feste Türme (Wald, Pilz, Blitz), eine Ressource (Magie), Instabilität, drei Betriebsarten und ein KI-Rivale. Keine Schäden, Ausfälle, Offline-Produktion, Sabotage, Prestige oder freie Platzierung. Originalbilder bleiben unverändert.

## Produktion
| Turm | Basis/s | Aktivierung | Basiskosten Verbesserung | Entdeckung |
|---|---:|---:|---:|---|
| Wald | 1 | 0 | 10 | sofort |
| Pilz | 0,5 | 75 | 25 | 100 insgesamt erzeugt |
| Blitz | 5 | 350 | 80 | Pilz aktiv, 500 insgesamt erzeugt |

Stufe 1–10. Nennproduktion = Basis × 1,18^(Stufe−1). Nächste Verbesserung = aufrunden(Basiskosten × 1,35^(Stufe−1)). Der Wald erhält den Multiplikator 1 + 0,25 × Pilzstufe. Käufe verändern den Gesamtproduktionszähler nicht; Verbesserungen verändern die Instabilität nicht.

## Betrieb
Instabilität I liegt zwischen 0 und 100. Normal: Faktor 1−0,0075×I, Änderung +0,4/s. Hochleistung: Faktor 1,6−0,015×I, Änderung +1/s. Erholung: Faktor 0,2, Änderung −1/s. Betriebswechsel sind kostenlos und binden für 15 aktive Sekunden. Erholung gilt als bewusst abgeschlossen, wenn ein Turm ab mindestens 40 Instabilität durchgehend in Erholung bis höchstens 20 gebracht wird. Inaktive Türme produzieren nichts.

## Wettbewerb
Der Obsidianbund erscheint nach aktiviertem Pilzturm und bewusster Erholung. Ein Auftrag gleichzeitig; 30 s erste Vorbereitung, 80 Magie Ziel, 160 Magie Prämie, 180 s Frist, 60 s Pause nach jedem Ergebnis. Lieferquote 0/25/50/75 % der aktuellen Gesamtproduktion; keine direkte Einzahlung. Lieferungen zählen zur erzeugten Gesamtmagie, aber nicht zusätzlich zum Guthaben. Die Prämie zählt nur zum Guthaben. Erste Zielerreichung gewinnt, Gleichstand teilt, Fristablauf ohne Ziel vergibt nichts. Lieferung bleibt verbraucht, Überschuss nach Abschluss geht ins Guthaben. Quote wird am Ende auf 0 gesetzt. Auswahl einer Quote während Vorbereitung gilt für den nächsten Auftrag.

Rivale: feste Nennproduktion 2/s, gleiche Betriebsregeln und 15-s-Bindung, Entscheidung alle 5 s. Normal: 50 % Lieferung. Bei Rückstand und I≤40 Hochleistung mit 75 %, bis I≥60. Ab I≥70 Erholung mit 25 %, bis I≤20. Zwischen Aufträgen keine Lieferung und Erholung, sobald die Bindung dies erlaubt. Zustand bleibt erhalten; kein heimliches Aufholen, keine KI-Ausbauwirtschaft.

## Anwendung und Daten
Main-Prozess besitzt Simulation, Spielzustand und Speicherung. Renderer zeigt Snapshots und sendet typisierte Aktionen über eine begrenzte Preload-Brücke. Feste Simulationsschritte 100 ms, analytische Ertragsintegration innerhalb eines Schritts; Auftragsabschlüsse zeitgenau auflösen. Versionierter JSON-Spielstand in Electron userData, temporäre Datei und letzte gültige Sicherung. Speichern nach Aktionen, alle 10 s, bei Pause und Schließen. Beschädigte Dateien sichern und nicht still überschreiben. Nur eine Instanz.

Fokusverlust, Minimieren, Systemsuspendierung und manuelle Pause stoppen alles. Zurückkehren startet nicht automatisch; Fortsetzen erforderlich. Wirtschaftliche Aktionen sind während Pause gesperrt. Reale Abwesenheitszeit erzeugt keinerlei Fortschritt. Start lädt immer pausiert.

## Darstellung
Deutsch und Englisch mit sofortigem Wechsel und lokal gespeicherter Sprachwahl; dunkle ruhige Flächen, große vorhandene Turmszene. Oben Guthaben/Produktion/verbleibender Ertrag, links Türme mit Zustand, rechts Steuerung und Ausbau, unten Ziel und Auftrag. Maus/Tastatur, sichtbarer Fokus, reduzierte Bewegung. Keine neuen generierten Bilder, kein Audio.

## Abschluss und Abnahme
Einführung abgeschlossen: drei Türme aktiv, bewusste Erholung, ein entschiedener Auftrag (Sieg nicht nötig). Danach weiterspielen. Tests: darstellungsunabhängige Simulation; korrekte Käufe und Modusbindung; aktiver Zehn-Minuten-Ertrag mindestens 30 % über unbeaufsichtigtem Normalbetrieb; Lieferung ohne Doppelzählung; Sieg/Niederlage/Gleichstand/Ablauf; einmalige Prämie; Pause/Laden unverändert; beschädigter Spielstand und Schreibfehler; gepackte App ohne Netzwerk/Server mit Bildern. Ein automatisierter vollständiger Ablauf und eine visuelle Kontrolle ergänzen die Regeltests. Spaß und Verständlichkeit müssen zusätzlich menschlich getestet werden.

## Mehrsprachigkeit

Deutsch ist die Voreinstellung. Die Sprachwahl ist im aktiven Spiel, auf dem Start-/Pausenbildschirm und in der Hilfe erreichbar. Sie verändert weder Wirtschaft noch pausierte Zeiten. Alle Oberflächentexte, Turmnamen, Spielereignisse, Hinweise, Fehlermeldungen und nativen Bestätigungen sind übersetzt; Zahlen nutzen das gewählte Gebietsschema. Sprache wird getrennt vom Spielstand in settings.json gespeichert. Speicherversion 2 verwendet sprachneutrale Meldungsschlüssel; Version 1 wird verlustfrei übernommen. Details und Erweiterungsanleitung: [Mehrsprachigkeit](10-mehrsprachigkeit.md).
