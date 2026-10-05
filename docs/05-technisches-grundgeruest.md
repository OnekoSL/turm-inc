# Technisches Grundgerüst

> Aktueller Stand v0.3: [Sechs Elemente und neun Türme](12-elemente-und-tuerme.md). Dort festgelegte Erweiterungen haben Vorrang vor älteren Angaben.

> Aktueller Stand v0.2: [Bewohner, Räume und Ressourcen](11-bewohner-und-raeume.md). Diese Erweiterung hat bei abweichenden Angaben Vorrang.
Verbindlicher Stand: Windows-x64-Desktop-Anwendung mit Electron, React, TypeScript, Vite und Electron Forge; kein Server. [Prototypspezifikation](08-prototyp-spezifikation.md).

## Zuständigkeiten
- src/game: reine Simulationsregeln, typisierte Aktionen, Zustände und Balancewerte.
- src/main.ts: Electron-Lebenszyklus, feste 100-ms-Schritte, Fokus/Pause, Single-Instance und IPC.
- src/persistence: validiertes versioniertes JSON, atomarer Ersatz und Sicherung.
- src/preload.ts: begrenzte Schnittstelle; kein direkter Dateizugriff aus der Oberfläche.
- src/ui: React-Oberfläche, lokale Bildassets, Styling und zugängliche Bedienung.
- tests: Regel-, Speicher- und Desktop-Prüfungen.

## Zeit
Ausschließlich aktive Spielzeit; monotone Uhr während des Betriebs. Fokusverlust, Minimieren und Suspendierung stoppen die Simulation. Beim Fortsetzen wird die Echtzeitreferenz neu gesetzt. Kein Offline-Ertrag. Produktion wird mit der veränderlichen Instabilität integriert. Ereignisse innerhalb eines Schritts werden zeitlich aufgelöst.

## Speicherung
Main-Prozess schreibt nach Aktionen, alle zehn Sekunden, bei Pause und vor dem Schließen. Ein Spielstand und letzte gültige Sicherung im Anwendungsdatenverzeichnis; beschädigte Dateien bleiben zur Diagnose erhalten. Speicherversion 3 mit sprachneutralen Meldungsschlüsseln; deutsche Spielstände aus Version 1 und 2 werden beim Laden migriert. Unbekannte zukünftige Versionen werden nicht still ersetzt. Nur eine Anwendung darf den Spielstand verwenden.

## Entwicklung und Paketierung
Versionen werden im package-lock.json festgehalten. npm start startet die Entwicklung; npm run check prüft Typen und Regeln; npm run make erzeugt ein entpackbares Windows-x64-Paket. npm run test:desktop prüft die gepackte Anwendung mit einem eigenen temporären Spielstand. Keine Veröffentlichung, Konten oder Telemetrie.

## Paketierung unter Node 25
Forge 8 erzeugt Main und Preload als .cjs-Dateien. Der Startpunkt und die Preload-Referenz entsprechen diesem Format. Die Anwendung wird mit Forge paketiert; scripts/make-zip.mjs erstellt danach per yazl das ZIP. Dies ersetzt die mit Node 25 inkompatible rekursive rmdir-Verwendung im bisherigen ZIP-Maker. Das Paket enthält nur gebündelten Code, lokale Assets, Symbol und Electron-Laufzeit.

## Lokalisierung

Typisierte deutsche und englische Kataloge unter src/i18n. Simulation und Speicherung halten Meldungsschlüssel und Parameter, die Oberfläche übersetzt sie erst bei der Anzeige. Native Dialoge nutzen denselben Katalog. Die validierte Aktion set-language speichert nur die Einstellung und veröffentlicht den neuen Snapshot. Die unabhängige settings.json bleibt bei einem Spielneustart bestehen. Weitere Details: [Mehrsprachigkeit](10-mehrsprachigkeit.md).
