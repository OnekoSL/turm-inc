# Verbindliche Erweiterung v0.2 – Bewohner, Räume und Ressourcen

> Aktueller Stand v0.3: [Sechs Elemente und neun Türme](12-elemente-und-tuerme.md). Dort festgelegte Erweiterungen haben Vorrang vor älteren Angaben.

Stand: 5. Oktober 2026. Diese Erweiterung ergänzt und aktualisiert die Grundregeln aus der [Prototypspezifikation](08-prototyp-spezifikation.md). Plattform, drei Türme, Magieproduktion, Betriebsarten und Magieaufträge bleiben erhalten. Neue Rohstoffe sind Nahrung, Wissen und Harmoniekristalle; Minions sind zuweisbare Bewohner.

## Einstieg und Räume

Ab Waldturm Stufe 2 erhält jeder aktive Turm drei Raumplätze. Raumplanung erhöht diese Zahl auf vier. Jede Raumart darf einmal je Turm vorkommen und bis Stufe 3 ausgebaut werden. Vorräte, Forschung und Bevölkerung gelten gemeinsam für das Netzwerk. Die ersten Bewohner eröffnen Bibliotheken, der aktive Pilzturm Resonanzräume.

| Raum | Baukosten Magie | Wirkung pro Stufe bzw. Arbeiter |
|---|---:|---|
| Wohnräume | 25 | Zwei Betten je Stufe; keine Arbeiter erforderlich |
| Küche | 25 | Je Arbeiter 0,5 Magie/s → 0,2 Nahrung/s |
| Bibliothek | 40 | Je Arbeiter 0,1 Magie/s → 0,05 Wissen/s |
| Resonanzraum | 60 | Je Arbeiter 0,4 Magie/s → 0,04 Kristalle/s |
| Lager | 30 | Je Stufe zusätzlich 60 Nahrung und 30 Kristalle; keine Arbeiter erforderlich |

Produktionsräume erhalten einen Arbeitsplatz je Stufe. Der Ausbau auf Stufe 2/3 kostet aufgerundet 1,6/2,56 mal die Baukosten sowie 5/10 Wissen. Ein bestätigter Abriss erstattet exakt die Hälfte der tatsächlich bezahlten Magie, aber kein Wissen. Arbeiter werden frei. Fehlende Betten und überfüllte Lager entfernen weder Bewohner noch Vorräte; sie verhindern nur zusätzliche Anwerbung bzw. Einlagerung.

Die ersten Wohnräume bringen einmalig zwei Minions und zehn Nahrung. Weitere Bewohner kosten je 20 Magie und benötigen ein freies Bett. Jede Person kann nur einem Arbeitsplatz zugewiesen werden. Arbeitsgruppen können sofort und kostenlos umverteilt werden. Ohne Lager passen 40 Nahrung und 20 Kristalle ins Netzwerk; Wissen und Magie haben keine Kapazitätsgrenze.

## Versorgung und Produktionsbilanz

Jeder Bewohner verbraucht 0,02 Nahrung je aktiver Sekunde, auch ohne Arbeitsplatz. Versorgung startet bei 100, bleibt zwischen 0 und 100 und wächst bei voller Ration um 5 Punkte/s. Bei einer Unterversorgung fällt sie um 5 mal den ungedeckten Bedarfsanteil pro Sekunde. Ohne Bewohner steht sie auf 100.

Arbeitsleistung = 25 % + 75 % × Versorgung / 100. Einsatz und Ertrag der Arbeitsgruppen skalieren gemeinsam mit diesem Wert. Niemand stirbt oder wandert ab. Die ursprüngliche Turmproduktion läuft unabhängig von Versorgung und Räumen weiter.

Bei Magiemangel werden alle angeforderten Raumproduktionen proportional reduziert. Bei knapper Lagerkapazität teilen die produzierenden Räume den verbleibenden Platz proportional. Für nicht eingelagerte Produktion wird keine Magie verbraucht. Nur die Turmproduktion zählt als selbst erzeugte Magie und als Grundlage der Auftragsquote. Raumverbrauch wird aus dem verbleibenden Guthaben bezahlt; Auftragserträge und Prämien werden nicht doppelt gezählt.

## Kristallstabilisierung

| Einstellung je Turm | Kristalle/s | Verringerung des Belastungsanstiegs/s |
|---|---:|---:|
| Aus | 0 | 0 |
| Sanft | 0,015 | 0,2 |
| Stark | 0,05 | 0,5 |

Ein Resonanzraum im Netzwerk ermöglicht die Stabilisierung. Sie senkt positiven Instabilitätsanstieg höchstens auf null, baut bestehende Belastung aber nicht ab. Hochleistung erzeugt selbst bei starker Stabilisierung noch 0,5 Instabilität/s. Erholung und inaktive Türme verbrauchen keine Kristalle. Bei Mangel erhalten alle eingeschalteten Türme denselben Deckungsanteil. Einstellungen bleiben bei Mangel oder Abriss des letzten Resonanzraums erhalten und wirken nach Nachschub bzw. Neubau wieder automatisch.

## Forschung

Eine vorhandene Bibliothek eröffnet fünf einmalige, sofort wirksame Forschungen ohne gegenseitigen Ausschluss. Erworbene Wirkungen bleiben auch nach Abriss der Bibliothek erhalten.

| Forschung | Wissen | Magie | Wirkung |
|---|---:|---:|---|
| Vorratspflege | 10 | 30 | Gesamte Nahrung- und Kristallkapazität +25 % |
| Küchenorganisation | 20 | 60 | Magiekosten der Küche −20 % |
| Studienordnung | 25 | 75 | Wissensertrag +25 %, unveränderter Magieeinsatz |
| Kristallzucht | 30 | 90 | Kristallertrag +25 %, unveränderter Magieeinsatz |
| Raumplanung | 40 | 120 | Vierter Raumplatz je Turm |

## Einführung, Bedienung und Pause

Die Ziele führen durch Waldturm Stufe 2, Wohnräume und besetzte Küche, bevor der bisherige Ausbaupfad fortgeführt wird. Zusätzlich zum bisherigen Einführungsabschluss sind zwei Bewohner, mindestens einmal eine besetzte Küche, eine Forschung und zehn aktive Sekunden tatsächlich kristallversorgte Stabilisierung erforderlich. Erholung wird weiterhin nur durch eine bewusste Erholungsphase von mindestens 40 auf höchstens 20 Instabilität erfüllt.

Die globale Ressourcenleiste zeigt Kapazitäten, Nettoänderungen, Reichweite bei aktuellem Nettoverbrauch, Bevölkerung, Betten, freie Arbeiter und Versorgung. Die Turmansicht wechselt zwischen Betrieb und Räumen; Forschung ist ein gemeinsames Fenster. Hinweise erklären Freischaltungen, volle Lager, Magiemangel und Nahrungsknappheit. Alle Texte sind deutsch und englisch verfügbar. Bildinhaber: **Nevico**.

Wirtschaftliche Aktionen sind während der Pause gesperrt. Fokusverlust, Minimieren, Suspendierung und Schließen stoppen auch Nahrung, Arbeitsgruppen und Resonanz vollständig. Kein Offline-Fortschritt.

## Technik und Kompatibilität

`src/game/economy.ts` hält die zentralen Startwerte, Raumaktionen und Ressourcenberechnungen. Die unabhängige Simulation bleibt im Electron-Hauptprozess. Die begrenzte IPC-Brücke ergänzt Bauen, Ausbauen, bestätigten Abriss, Anwerben, Zuweisen, Forschen und Resonanzwahl.

Innerhalb der festen 100-ms-Schritte werden Auftragsgrenzen weiterhin zeitlich aufgelöst. Kristalldeckung wird für das bevorstehende Teilintervall bestimmt; Turmertrag und Lieferung werden integriert, verbrauchte Kristalle abgezogen, vorhandene Nahrung verteilt und Raumproduktion bezahlt. Neu erzeugte Ressourcen stehen ab dem nächsten Teilintervall bereit. Daher entstehen keine rückwirkenden Erträge oder ressourcenabhängigen Vorteile durch die Bildrate.

Speicherversion 3 übernimmt Version 1 und 2 ohne Änderung der bisherigen Wirtschaft, Zeiten oder Rivalenzustände. Neue Vorräte, Räume und Bevölkerung beginnen leer, Versorgung bei 100. Alte Einführungen erhalten zusätzliche Ziele. Die bisherige Datei bleibt beim Laden unverändert und beim regulären Speichern als Sicherung erhalten. Beschädigte und unbekannte Spielstände bleiben geschützt.

## Prüfung und weitere Entwicklung

Automatisierte Prüfungen decken Mengenbilanz, Arbeitszuweisung, Kosten, Erstattungen, Lagergrenzen, Versorgungserholung, Kristallverteilung, Forschungen, Pause, Migration und vollständigen Durchlauf ab. Desktop-Prüfungen verwenden eigene temporäre Spielstände und prüfen beide Sprachen sowie kleine Fenster. Ergebnisse und Paketdaten stehen im [Prüfbericht](09-pruefbericht.md).

Dies sind feste Ausgangswerte, keine abschließend bewertete Balance. Zu beobachten sind Wartezeiten, Küchenauslastung und Arbeitsumverteilung. Garten, Werkstatt, individuelle Minions, neue Lieferressourcen und eine umfassende Gegnerwirtschaft bleiben außerhalb von v0.2.
