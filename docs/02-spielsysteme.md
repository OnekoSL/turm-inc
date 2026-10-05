# Spielsysteme

Die verbindlichen Formeln, Startwerte, Betriebsarten, Freischaltungen und Auftragsregeln stehen in [Prototypspezifikation v0.1](08-prototyp-spezifikation.md).

## Festgelegter Ablauf
Waldturm erwecken → erste Verbesserungen → Belastung erkennen und erholen → Pilzturm aktivieren → Obsidianbund und gemeinsamen Auftrag kennenlernen → Blitzturm aktivieren. Alle aktiven Türme produzieren unabhängig von der Auswahl. Aufbau und Wettbewerb laufen gleichzeitig.

## Vollständige Pause
Die frühere Offline-Planung ist verworfen. Bei Fokusverlust, Minimieren, manueller Pause, Systemsuspendierung oder geschlossenem Spiel läuft weder eigener Betrieb noch Wettbewerb weiter. Fortsetzen ist bewusst auszulösen. Kein Nachholen realer Abwesenheitszeit.

## Balanceprüfung
Konkrete Anfangswerte sind für den ersten Prototyp festgelegt und zentral im Code hinterlegt. Ertrag, Eingriffshäufigkeit und Durchlaufdauer werden gemessen. Weitere Balanceänderungen sind anhand von Spieltests zu begründen; Ausbauziele dürfen auch nach verlorenen Aufträgen erreichbar bleiben.
