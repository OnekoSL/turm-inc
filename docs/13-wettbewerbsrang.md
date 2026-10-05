# Turm INC v0.3.1 – Wettbewerb wächst mit Siegen

Stand: 5. Oktober 2026. Diese Regeln ersetzen die Konkurrenzstufen nach Turmanzahl aus v0.3. Alle übrigen Turm-, Raum-, Versorgungs-, Liefer-, Pausen- und Speicherregeln bleiben bestehen.

## Rang und Größenklassen

Neue Spiele beginnen mit Wettbewerbsrang 0. Jeder alleinige Sieg erhöht den Rang um genau 1. Niederlage, Gleichstand und Ablauf ändern ihn nicht. Es gibt keinen Rangverlust und keine Erhöhung durch Erwecken oder Verbessern von Türmen.

- Rivalen-Nennproduktion: `2 × 1,1^Rang` Magie/s.
- Größenklasse: `1 + abrunden(Rang / 5)`.
- Lieferziel: `aufrunden(80 × 1,1^(5 × abrunden(Rang / 5)))` Magie.
- Prämie: `2 × Lieferziel` Magie; bei Gleichstand die Hälfte.

Die Rundung verwendet wie die Erweckungskosten eine kleine Toleranz gegen Gleitkommafehler. Produktion wächst um 10 % je Sieg. Ziel und Prämie wachsen alle fünf Ränge um ungefähr 61 %, bleiben dazwischen aber unverändert. Damit folgt ihre Größenordnung der Gegnerproduktion, ohne jeden Auftrag gleich lang zu machen.

| Rang | Klasse | Rivalen-Nennproduktion | Ziel | Prämie |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 1 | 2,000/s | 80 | 160 |
| 1 | 1 | 2,200/s | 80 | 160 |
| 4 | 1 | 2,928/s | 80 | 160 |
| 5 | 2 | 3,221/s | 129 | 258 |
| 10 | 3 | 5,187/s | 208 | 416 |
| 15 | 4 | 8,354/s | 335 | 670 |

## Zeitpunkt und Darstellung

Jeder Auftrag speichert Rang, Klasse, Ziel, Prämie und Rivalen-Nennproduktion bei Beginn. Ein Sieg zahlt die bisherige Prämie aus und erhöht den Netzwerk-Rang genau einmal. Erst der nächste Auftrag verwendet die neuen Werte. Laufende Aufträge und historische Ergebnisse werden nicht umgeschrieben. Bereits ausgelieferte Magie und überschüssige Produktion werden weiterhin zeitgenau innerhalb der 100-ms-Schritte verrechnet.

Das deutsche und englische Auftragsfeld zeigt den erreichten Wettbewerbsrang, die aktiven Regeln, den nächsten Auftrag und eine aufklappbare Erklärung mit Vorschau nach einem weiteren Sieg. Die Chronik protokolliert den Rangaufstieg. Die bisherige Anzeige einer Konkurrenzsteigerung beim Turmkauf entfällt.

## Übernahme bestehender Spiele

Speicherversion 5 / Balanceversion 3 übernimmt Versionen 1–4. Vor jeder Migration wird das ältere Format validiert. Laufender Auftrag, letzter Ausgang, Guthaben, Zeit, Rivalenzustand und übriger Spielfortschritt bleiben erhalten.

Alte Spielstände speichern keine vollständige Siegzahl. Deshalb wird diese nicht aus der Anzahl entschiedener Aufträge geschätzt. Stattdessen beginnt der neue Rang bei der kleinsten ganzen Zahl, deren Rivalenproduktion mindestens der zuletzt gespeicherten Gegnerstärke entspricht: alte 2/6/12/20 Magie/s werden zu Rang 0/12/19/25. Ein bereits laufender alter Auftrag behält seine exakten Werte bis zum Ende und wird als übernommener Auftrag kenntlich gemacht. Das nächste reguläre Angebot verwendet den neuen Rang. Vorherige Siege werden bei erneutem Laden nicht nochmals gezählt.

`GameState.competitionRank` speichert den dauerhaften Rang. `ContractRules.rank` speichert den Rang des Auftrags; `null` kennzeichnet ausschließlich die übernommenen alten Regelklassen. Die vorherigen Klassen bleiben nur für Validierung und Migration vorhanden. Quelldatei und letzte gültige Sicherung werden wie bisher geschützt.

## Abnahme

Automatisierte Fälle prüfen Sieg, Niederlage, Gleichstand und Ablauf an Rang 0/4/5/9/10/25; genaue einmalige Prämien und Rangänderung; Klassenwechsel; gleiche Fortschritte bei unterschiedlichen Darstellungsintervallen; Stillstand während Pause; keine Erhöhung durch Ausbau; Migration aller vier vorherigen Klassen; Fortsetzen nach einem gespeicherten Sieg und Ablehnung beschädigter Daten.

Eine kontrollierte Simulation mit unverändertem Dreiturmnetzwerk spielt 40 Aufträge bei 75 % Lieferung und bewussten Erholungswechseln: **14 Siege und 26 Niederlagen**, danach Rang 14 und 7,595 Magie/s Rivalen-Nennproduktion. Das zeigt den gewünschten Übergang von Erfolgen zu einer Grenze ohne weiteren Ausbau. Dieser vorbereitete Testzustand ist kein ressourcenfreier Durchlauf und bestätigt noch keine langfristige menschliche Balance.

Details zu Desktop-Prüfung und Windows-Paket stehen im [Prüfbericht](09-pruefbericht.md).
