# Mehrsprachigkeit – v0.1.1

Deutsch und Englisch sind eingebaut. Deutsch bleibt die Voreinstellung. Die Auswahl steht in der Kopfleiste und in Start-/Pausen- sowie Hilfedialogen. Sie wirkt sofort, benötigt keinen Neustart und setzt eine pausierte Welt nicht fort.

## Übersetzungsumfang

Oberfläche, Turmnamen und Beschreibungen, Betriebsarten, Einführung, Ziele, Hilfe, Rivalenabsichten, Aufträge und Ergebnisse, Chronik, Pausegründe, Speicher- und Bedienfehler sowie native Bestätigungen verwenden zentrale Kataloge. Zahlen werden mit `de-DE` beziehungsweise `en-US` formatiert. Der Spieltitel „Turm INC“ bleibt in beiden Sprachen gleich.

Die Sprachwahl wird getrennt vom Fortschritt als versionierte `settings.json` im Anwendungsdatenverzeichnis gespeichert. Neue Spiele ändern diese Einstellung nicht. Ein fehlgeschlagener Schreibvorgang meldet den Fehler und behält die bisherige Sprache. Eine ungültige Einstellungsdatei führt zur deutschen Voreinstellung; vor dem nächsten ausdrücklich gewählten Sprachwechsel wird die alte Datei archiviert.

## Architektur

- `src/i18n/de.ts`: deutsche Ausgangstexte und typisierte Schlüssel.
- `src/i18n/en.ts`: vollständige englische Entsprechungen.
- `src/i18n/index.ts`: Sprachregister, Zahlenformatierung, Parameterersetzung, verschachtelte Meldungen, Validierung und Übernahme alter Meldungen.
- `src/persistence/settings.ts`: unabhängige lokale Sprachwahl.
- `set-language`: validierte IPC-Aktion, auch während einer Pause verfügbar.

Die Simulation erzeugt sprachneutrale Meldungen wie `{ key: "log.upgrade", params: { tower: { key: "tower.wald.name" }, level: 2 } }`. Erst bei der Darstellung entsteht der übersetzte Satz. Dadurch wechseln auch bereits aufgezeichnete Ereignisse sofort die Sprache. Meldungen gelangen als React-Text in die Oberfläche, nicht als HTML.

## Vorhandene Spielstände

Die neue Speicherversion ist 2; Balanceversion und Spielregeln bleiben unverändert. Beim Laden einer Version-1-Datei werden bekannte deutsche Meldungen in Schlüssel und Parameter überführt. Guthaben, Ertrag, aktive Zeiten, Bindungen, Türme und Wettbewerb bleiben erhalten. Unbekannte historische Texte bleiben als Originaltext lesbar. Die Datei wird beim Lesen nicht geändert; der nächste reguläre Speichervorgang behält die alte gültige Datei als Sicherung. Unbekannte zukünftige Versionen werden weiterhin gesperrt und nicht überschrieben.

## Weitere Sprache ergänzen

1. Einen vollständigen Katalog analog zu `en.ts` anlegen. `satisfies Record<TranslationKey, string>` prüft fehlende oder falsche Schlüssel.
2. Sprachtyp, Sprachregister, Zulässigkeitsprüfung und Katalogauswahl in `index.ts` erweitern. Eigennamen der Sprachen verwenden, keine Länderflaggen.
3. Parameter wie `{amount}`, `{tower}` und `{seconds}` vollständig übernehmen. Ganze Sätze übersetzen; keine aus Einzelwörtern zusammengesetzten Sätze.
4. Katalog-/Parameterprüfung, Zahlenformatierung und Desktop-Sprachtest auf die zusätzliche Sprache ausweiten. Kurze und lange Texte bei kleiner Fenstergröße prüfen.
5. `npm run check`, `npm run make` und `npm run test:desktop` ausführen.

Neue Ereignisse erhalten einen Schlüssel mit Parametern. Texte, die schon in veröffentlichten Version-1-Dateien vorkamen, müssen für die Migration weiterhin erkennbar bleiben. Bei einer späteren Änderung der entsprechenden deutschen Katalogtexte deshalb auch die Legacy-Zuordnung anpassen und deren Tests erhalten.
