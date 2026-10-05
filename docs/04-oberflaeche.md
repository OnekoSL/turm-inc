# Oberfläche und Spielerführung

> Aktueller Stand v0.3: [Sechs Elemente und neun Türme](12-elemente-und-tuerme.md). Dort festgelegte Erweiterungen haben Vorrang vor älteren Angaben.

> Aktueller Stand v0.2: [Bewohner, Räume und Ressourcen](11-bewohner-und-raeume.md). Diese Erweiterung hat bei abweichenden Angaben Vorrang.
Stand: 4. Oktober 2026 · umgesetzt für Windows-Desktop v0.1

## Hauptansicht
- Oben: Magieguthaben, gesamte Istproduktion, nach Lieferungen verbleibender Ertrag, Hilfe und Pause.
- Links: drei Turmkarten mit Motiven, Stufen, Betriebsarten und Instabilität. Auswahl verändert keine Produktion.
- Mitte: das vollständige Originalmotiv des gewählten Turms vor einer unscharfen Erweiterung desselben Bilds. Ortsname, Turmname und Kurzbeschreibung ordnen die Szene ein.
- Rechts: aktuelle Leistung, Nennleistung, Instabilität mit Trend, Betriebsarten samt resultierender Produktion und Bindungszeit sowie Ausbauknopf mit Preis und Wirkung.
- Unten: nächstes Ziel, letzte Ereignisse und gemeinsamer Auftrag mit Prämie, Frist, Fortschritt und Liefergeschwindigkeit beider Seiten, eigenem Lieferanteil und Rivalenabsicht.

## Gestaltung und Bedienung
Dunkle grüne Flächen, warme Serifenschrift für Namen, klare Zahlen und dezente Lichtpartikel. Der erste Umfang nutzt die vier vorhandenen Bilder für Wald, Pilze, Blitz und Obsidianbund. Kein Audio, keine externen Schriftdateien und keine Bildgenerierung.

Maus- und Tastaturbedienung; sichtbarer Fokus, beschriftete Schaltflächen, semantische Fortschrittsanzeigen. Escape pausiert. Dialoge halten den Tastaturfokus; die Hintergrundoberfläche ist während Pause nicht interaktiv. Reduzierte Bewegung wird respektiert.

Das Fenster startet mit 1440 × 960 und lässt sich bis 1080 × 760 verkleinern. Inhaltsabhängige Zeilen verhindern überlappende Steuerungen bei Windows-Skalierung. In niedrigen Fenstern darf die Ansicht vertikal scrollen; horizontales Scrollen ist nicht erforderlich.

## Einführung
Ein Willkommensdialog erklärt das Ziel. Nach dem Start ist die kostenlose Aktivierung des Waldturms die erste Handlung. Der nächste Schritt wird ständig angezeigt. Die Hilfe erklärt Erwecken, Instabilität, Lieferaufträge und Pause. Gesperrte Türme zeigen Entdeckungsbedingungen; nicht bezahlbare Verbesserungen zeigen den Fehlbetrag.

## Pause und Fehler
Fokusverlust, Minimieren, Systemsuspendierung und manuelle Pause öffnen einen Fortsetzen-Dialog. Keine wirtschaftlichen Aktionen während Pause, kein automatisches Fortsetzen. Ein neues Spiel erfordert eine bewusste Bestätigung; vorherige Daten werden archiviert.

Speicherfehler erscheinen sichtbar und können erneut versucht werden. Eine beschädigte Hauptdatei wird erklärt und eine vorhandene Sicherung ausdrücklich zum Fortsetzen angeboten. Beim Schließen nach einem Speicherfehler wird gefragt, ob ohne Speichern beendet werden soll.

Verbindliche Regeln: [Prototypspezifikation](08-prototyp-spezifikation.md). Prüfergebnisse: [Prüfbericht](09-pruefbericht.md).

## Sprache

Deutsch/English-Auswahl in der Kopfleiste sowie in Start-/Pause- und Hilfedialogen. Die Auswahl ist mit Tastatur erreichbar und Teil der Fokusführung im Dialog. Sie wirkt sofort auf Texte und Zahlen, ohne das Spiel fortzusetzen. Keine Flaggen: Sprachen werden mit ihrem Eigennamen benannt.
