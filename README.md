# Turm INC

## English

A fantasy incremental game for Windows: manage nine magical towers across six elements, assign minions to rooms and compete against the Obsidian Alliance. In v0.3.1, every victory raises your competition rank and makes the rival 10% stronger for the next contract. Defeats and ties leave your rank unchanged. Existing saves are migrated automatically.

[**Download Turm INC v0.3.1 for Windows x64**](https://github.com/OnekoSL/turm-inc/releases/tag/v0.3.1) · [Release notes — English, then German](docs/releases/v0.3.1.md)

Close the old version, extract the full Windows ZIP and run `Turm INC/Turm INC.exe`. English and German are included. No development server or Node.js installation is required to play. **Image owner: Nevico.**

## Deutsch

Ein Fantasy-Incremental mit aktivem Management für Windows. Neun magische Türme in sechs Elementen, ein instabiler Betrieb und ein Rivale, der um dieselben Aufträge wirbt.

## Download für Windows

[**Turm INC v0.3.1 herunterladen**](https://github.com/OnekoSL/turm-inc/releases/tag/v0.3.1)

Unter „Assets“ das Windows-x64-ZIP wählen, vollständig entpacken und `Turm INC/Turm INC.exe` starten. Deutsch und Englisch sind enthalten. Zum Spielen werden weder Node.js noch ein Entwicklungsserver benötigt.

## Neu in v0.3.1

Jeder gewonnene Auftrag erhöht den Wettbewerbsrang und macht den Obsidianbund beim nächsten Auftrag um 10 % stärker. Niederlagen, Gleichstände und abgelaufene Aufträge verändern den Rang nicht. Alle fünf Ränge wachsen Lieferziel und Prämie. Die bisherigen Stärke-Sprünge durch zusätzliche Türme entfallen. Bestehende Aufträge und Spielstände werden übernommen.

[Regeln des Wettbewerbsrangs](docs/13-wettbewerbsrang.md) · [Aktueller Prüfbericht](docs/09-pruefbericht.md)

## Neu in v0.3

Fels, Eis, Lava, Wind, Sonne und Mond ergänzen Wald, Pilz und Blitz. Erde, Wasser, Feuer, Luft, Licht und Schatten besitzen lokale Boni für Betrieb oder Räume. Nach der bisherigen Einführung kannst du die sechs neuen Türme in beliebiger Reihenfolge erwecken. Elementbefehle vereinfachen gemeinsame Betriebswechsel; seit v0.3.1 wächst der Obsidianbund mit deinem Wettbewerbsrang. Bestehende Spielstände werden übernommen.

[Verbindliche Regeln v0.3](docs/12-elemente-und-tuerme.md) · [Prüfbericht](docs/09-pruefbericht.md)

## Bewohner und Räume seit v0.2

Bewohner beziehen Wohnräume und arbeiten in Küche, Bibliothek und Resonanzraum. Nahrung hält ihre Arbeitsleistung aufrecht, Wissen finanziert fünf Forschungen und Harmoniekristalle stabilisieren die Türme automatisch. Lager und begrenzte Raumplätze erfordern Entscheidungen über den Innenausbau. Der Einstieg beginnt ab Waldturm Stufe 2.

[Regeln der Erweiterung](docs/11-bewohner-und-raeume.md) · [Windows-Paket bauen](#entwicklung)

## Verbindliche Planung

[Prototypspezifikation v0.1.1](docs/08-prototyp-spezifikation.md) · [Spielkonzept](docs/01-spielkonzept.md) · [Spielsysteme](docs/02-spielsysteme.md) · [33 Turmbilder](docs/03-tuerme-und-bilder.md) · [Oberfläche](docs/04-oberflaeche.md) · [Technik](docs/05-technisches-grundgeruest.md) · [Entwicklung](docs/06-entwicklungsplan.md) · [Betrieb und Konkurrenz](docs/07-betrieb-und-konkurrenz.md)

## Entwicklung

Node.js ab 22.13 und npm installieren, dann im Projektordner:

```powershell
npm ci
npm start
```

```powershell
npm run check
npm run make
npm run test:desktop
```

Das ZIP-Paket entsteht unter out/make/zip/win32/x64. Komplett entpacken und Turm INC.exe starten. Die Anwendung benötigt keinen Entwicklungsserver und keine Internetverbindung. Fortschritt wird im Windows-Anwendungsdatenverzeichnis von Turm INC gespeichert. Bei Fokusverlust pausiert die ganze Welt; bei Rückkehr bewusst fortsetzen.

Die 33 Originalbilder im Projektstamm bleiben unverändert. Zehn davon werden als lokale Spielassets verwendet. Keine Konten, Cloud-Speicherung oder Telemetrie.

**Bildinhaber: Nevico.** Der Bildnachweis steht auch im Spiel und in der [Bilddokumentation](docs/03-tuerme-und-bilder.md).

## Sprachen

Deutsch und Englisch sind vollständig eingebaut. Im Start-/Pausendialog, in der Spielhilfe und oben im Spiel kannst du die Sprache sofort wechseln. Die Auswahl wird lokal gespeichert und bleibt auch bei einem neuen Spiel erhalten. Zahlen, Aufträge, Chronik und Fehlermeldungen wechseln mit. Bestehende Spielstände werden automatisch übernommen. [Erweiterung und Übersetzungen](docs/10-mehrsprachigkeit.md).

## Spielen

1. Anwendung starten und „Dein Netzwerk beginnen“ wählen.
2. Den Waldturm kostenlos erwecken und erste Magie sammeln.
3. Den Waldturm auf Stufe 2 verbessern. Unter „Räume“ Wohnräume und eine Küche bauen, dann Minions zuweisen.
4. Hochleistung und Erholung ausprobieren: Erholung von mindestens 40 auf 20 Instabilität eröffnet zusammen mit dem Pilzturm die Konkurrenz.
5. Lieferanteile für Aufträge abwägen; gelieferte Magie fehlt beim Ausbau.
6. Bibliothek und Resonanzraum besetzen, forschen und im Turmbetrieb die Kristallstabilisierung wählen.
7. Nach Abschluss der Einführung weitere Elemente erwecken; Elementbefehle erreichen alle verfügbaren Türme der Kategorie.
8. Bei einer Pause oder einem Fensterwechsel wartet die ganze Welt. Zum Weiterspielen „Fortsetzen“ wählen.

[Prüfbericht und bekannte Grenzen](docs/09-pruefbericht.md). Der Prototyp nutzt feste Anfangswerte; Spielgefühl und langfristige Balance brauchen menschliche Spieltests.
