# Turm INC

Ein Fantasy-Incremental mit aktivem Management für Windows. Drei magische Türme, ein instabiler Betrieb und ein Rivale, der um dieselben Aufträge wirbt.

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

Die 33 Originalbilder im Projektstamm bleiben unverändert. Vier davon werden als lokale Spielassets verwendet. Keine Konten, Cloud-Speicherung oder Telemetrie.

**Bildinhaber: Nevico.** Der Bildnachweis steht auch im Spiel und in der [Bilddokumentation](docs/03-tuerme-und-bilder.md).

## Sprachen

Deutsch und Englisch sind vollständig eingebaut. Im Start-/Pausendialog, in der Spielhilfe und oben im Spiel kannst du die Sprache sofort wechseln. Die Auswahl wird lokal gespeichert und bleibt auch bei einem neuen Spiel erhalten. Zahlen, Aufträge, Chronik und Fehlermeldungen wechseln mit. Bestehende Spielstände werden automatisch übernommen. [Erweiterung und Übersetzungen](docs/10-mehrsprachigkeit.md).

## Spielen

1. Anwendung starten und „Dein Netzwerk beginnen“ wählen.
2. Den Waldturm kostenlos erwecken und erste Magie sammeln.
3. Hochleistung und Erholung ausprobieren: Erholung von mindestens 40 auf 20 Instabilität eröffnet zusammen mit dem Pilzturm die Konkurrenz.
4. Lieferanteile für Aufträge abwägen; gelieferte Magie fehlt beim Ausbau.
5. Bei einer Pause oder einem Fensterwechsel wartet die ganze Welt. Zum Weiterspielen „Fortsetzen“ wählen.

[Prüfbericht und bekannte Grenzen](docs/09-pruefbericht.md). Der Prototyp nutzt feste Anfangswerte; Spielgefühl und langfristige Balance brauchen menschliche Spieltests.
