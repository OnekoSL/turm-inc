# Turm INC v0.3 – Sechs Elemente und neun Türme

Stand: 5. Oktober 2026. Verbindliche Erweiterung von [v0.2](11-bewohner-und-raeume.md). Bei Abweichungen gelten die Regeln dieses Dokuments. Auslieferung: Windows x64, v0.3.0.

## Elemente und lokale Wirkung

| Element | Türme | Bonus im jeweiligen Turm |
| --- | --- | --- |
| Erde | Wald, Pilz, Fels | Küche: Nahrung ×1,2, Magieeinsatz unverändert. |
| Wasser | Eis | Erholung: −1,2 Instabilität/s. |
| Feuer | Lava | Nennproduktion an Magie ×1,2. |
| Luft | Blitz, Wind | Betriebsbindung 12 statt 15 aktive Sekunden. |
| Licht | Sonne | Bibliothek: Wissen ×1,2, Magieeinsatz unverändert. |
| Schatten | Mond | Resonanzraum: Kristalle ×1,2, Magieeinsatz unverändert. |

Boni gelten auch für die drei bisherigen Türme, ausschließlich lokal. Forschung und Element multiplizieren sich: Licht und Studienordnung ergeben ×1,5 Wissen bei gleichem Einsatz. Versorgungsleistung, Lagergrenzen und anteilige Magieversorgung bleiben wirksam. Pilz verstärkt weiterhin nur Wald. Wasser verbraucht in Erholung keine Kristalle; Stabilisierung selbst baut weiterhin keine Instabilität ab. Der Rivale erhält keine Elementboni.

Die sechs neuen Türme haben je 6 Magie/s Basisproduktion, Verbesserungsbasiskosten 100 Magie und maximal Stufe 10. Nennproduktion: Basis ×1,18^(Stufe−1), anschließend Elementbonus. Verbesserung: aufgerundet 100×1,35^(Stufe−1). Drei Raumplätze, durch Raumplanung vier; gleiche Raumarten, Kosten und Freischaltregeln wie v0.2. Alle neun Türme dürfen gleichzeitig aktiv sein.

## Freie Erweckungsreihenfolge

Die bisherige vollständige Einführung verlangt weiterhin nur Wald, Pilz und Blitz, bewusste Erholung, mindestens einen entschiedenen Auftrag, zwei Bewohner, einmal eine besetzte Küche, eine Forschung und zehn Sekunden tatsächlich versorgte Kristallstabilisierung. Ihr Abschluss gibt alle sechs Erweiterungstürme dauerhaft frei. Eine Niederlage zählt als entschiedener Auftrag.

| Bereits erweckte Erweiterungstürme | Nächster Preis in Magie |
| ---: | ---: |
| 0 | 600 |
| 1 | 960 |
| 2 | 1.536 |
| 3 | 2.458 |
| 4 | 3.933 |
| 5 | 6.292 |

Formel: aufrunden(600×1,6^Anzahl). Ein numerischer Toleranzabzug vor dem Aufrunden verhindert einen zusätzlichen Magiepunkt durch Gleitkommadarstellung bei exakt ganzzahligen Preisen. Fehlgeschlagene und doppelte Erweckungen ändern weder Guthaben noch Preisstufe. Alle noch inaktiven Erweiterungstürme haben denselben aktuellen Preis. Die UI zeigt außerdem die Konkurrenzstufe nach dem Kauf. Nach der Einführung lautet das Ausbauziel „Neue Türme: X/6“.

## Elementbedienung und Konkurrenz

Die Turmauswahl enthält sechs aufklappbare Elementgruppen. Karten zeigen Bild, Stufe, Leistung, Bonus, Modus, Instabilität und Bindung; inaktive Karten zeigen Preis oder Sperrgrund. Die ausgewählte Ansicht behält das große Turmbild sowie Betrieb und Räume. Elementboni stehen auch bei der Raumplanung sichtbar.

Elementbefehle wechseln sofort alle aktiven, ungebundenen Türme der gewählten Kategorie. Bereits passende Modi bleiben unverändert, gebundene Türme werden übersprungen. Rückmeldung nennt beide betroffenen Gruppen. Keine Warteschlange, keine spätere Automatik, keine Rücksetzung der Instabilität. Jeder gewechselte Turm erhält seine vollständige lokale Bindung. Bei Pause ist die Aktion gesperrt.

| Aktive Türme | Stufe | Auftragsziel | Prämie | Rivalen-Nennproduktion |
| ---: | ---: | ---: | ---: | ---: |
| 1–3 | 1 | 80 | 160 | 2 Magie/s |
| 4–5 | 2 | 240 | 480 | 6 Magie/s |
| 6–7 | 3 | 480 | 960 | 12 Magie/s |
| 8–9 | 4 | 800 | 1.600 | 20 Magie/s |

Auftragsbeginn friert diese Werte bis zum Abschluss ein. Erweckungen und Laden ändern einen laufenden Auftrag nicht. Ergebnisse bewahren ihre Regeln einschließlich voller Prämie und tatsächlich ausgezahltem Betrag. Gleichstand halbiert die jeweilige Prämie. Erste Vorbereitung 30 Sekunden, Laufzeit 180 Sekunden und Pause 60 Sekunden bleiben bestehen. KI-Regeln, 15-Sekunden-Bindung des Rivalen, Lieferquoten und zeitgenaue Auflösung bleiben erhalten. Aktuelle und nächste Konkurrenzstufe sind sichtbar.

## Architektur und Speicherung

Der zentrale Katalog enthält Elementzuordnung, Bilder und Balancewerte. Gemeinsame Funktionen berechnen Erweckungspreis, Betriebsbindung, Nennproduktion, Erholungsrate, Raumwirkung und Konkurrenzstufe. Darstellung und Simulation verwenden dieselben Funktionen. STARTER_IDS ist getrennt von der vollständigen TOWER_IDS-Liste; Zustandskarten werden aus dem Katalog erzeugt.

GameAction ergänzt `element-mode` mit Element und Modus. ActionResult liefert `changed` und `skippedLocked` als Turm-IDs. IPC validiert die IDs, der Hauptprozess bearbeitet und speichert den Gruppenbefehl als eine Aktion. GameState ergänzt die dauerhafte Freigabe und gespeicherte Auftragsregeln. Die Bevölkerung darf maximal 54 erreichen, unabhängig vom nachträglichen Abriss von Betten. Individuelle Raumgrenzen bleiben unverändert.

Speicherversion 4 und Balanceversion 2 übernehmen Versionen 1–3 über ihre bisherigen Migrationsschritte. Der alte Zustand wird vor der Erweiterung validiert. Neue Türme starten auf Stufe 0 mit Normalbetrieb, Instabilität 0, ohne Bindung, leeren Räumen und Resonanz aus. Alte Wirtschaftsgrößen, Fortschritt, Restzeiten und bereits laufende Bindungen bleiben erhalten. Die Freigabe wird aus den bisherigen Einführungszielen ermittelt. Laufende alte Aufträge und Ergebnisse erhalten Stufe 1. Historische Auftragsmeldungen bekommen ihre alten Ziel-/Prämienwerte. Laden überschreibt die Quelldatei nicht; beim folgenden Speichern bleibt die letzte gültige Fassung als Sicherung erhalten.

Simulation bleibt bei festen 100-ms-Schritten im Hauptprozess. Fokusverlust, Minimieren, Suspendierung und manuelle Pause stoppen sämtliche Systeme. Keine Offline-Erträge. Deutsch und Englisch gelten für alle neuen Inhalte einschließlich Rückmeldungen und alten Chronikeinträgen.

## Bilder, Prüfung und Grenzen

Neue Motive: Fels 13, Eis 28, Lava 33, Wind 29, Sonne 05, Mond 22. Lokale Spielkopien liegen unter public/assets, Originale bleiben unverändert. Bildinhaber: **Nevico**. Bild 08 bleibt dem Obsidianbund vorbehalten.

Der [Prüfbericht](09-pruefbericht.md) dokumentiert Regeltests, Migrationen, Mengenbilanzen, neun aktive Türme, Desktop-Tests bei 1080×760, Offline-Start und vollständige reguläre Durchläufe. Elementkombinationen, zusätzliche Rohstoffe, automatische Betriebswechsel und eine eigene Rivalenwirtschaft werden nicht eingeführt. Die Zahlen sind Ausgangswerte; menschliche Spieltests müssen Eingriffsfrequenz, Wartezeiten und langfristige Vielfalt noch bewerten.
