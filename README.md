# Projekt PIZE aka IBISplusplus
## Projektziel
Das Ziel dieses Projektes ist die vollständige Reimplementation einer IBIS-Zentral-Einheit (IZE) der Firma HPW.

### Was ist eine IZE?
Eine IZE (IBIS-Zentral-Einheit) ist ein Bordrechner für das Integrierte Bordinformationssystem (IBIS), welches in Busses und Straßen-/Stadtbahnen dazu verwendet wird, um die Außen- und Innenanzeigen, Haltestellenansagen, Fahrscheinentwerter sowie die Funkkommunikation mit der Leitstelle zu ermöglichen.

## Warum dieses Projekt
Durch die Tatsache, dass mittlerweile (fast) alle Verkehrsbetriebe auf neuere Betriebsleitsystemtechnik (ITCS) umgestellt haben, sind IBIS-Mastergeräte selten zu bekommen. Außerdem ergeben sich durch das Alter der Technik folgende Probleme:
- Datenversorgungen existierender IBIS-Master werden ungültig
- Neue Datenversorgungen lassen sich aktuell nur mithilfe der Originalsoftware (IFIS, IFISET, etc. erstellen), welche lizenzrechtlich schwer zu bekommen sind
- Selbst wenn Datenversorgungen erstellt werden können, braucht es Spezialhardware (UDL, etc.), um diese auf die Bordrechner zu spielen
- Pufferbatterien, welche Parameterspeicher am Leben erhalten, leeren sich
- Wissen über die alte Technik geht verloren

## Kann ich meine Anzeige / mein MAS / mein abgesetztes Bedienteil hiermit verwenden?
Natürlich kommt es drauf an, welche Geräte du hast. Linien-, Kursnummern und Zielanzeigen sollten funktionieren.
Wenn in der Konfiguration (device_config.json) deine Tastenbelegung richtig anpasst, sollte diese auch funktionieren. 
Leider haben viele Hersteller damals eigene Datensätze entwickelt. Diese werden bisher noch nicht alle unterstützt.

## Aktuell unterstütze Datensätze
- Liniennummer
- Linien-Sonderzeichen
- Kursnummer
- Routennummer
- Zielnummer
- Zieltext
- Haltestellennummer
- Haltestellenname
- Ansagennummer
- Richtung
- Entwertermerkmale
- Terminalfunktionen (Text, Abfragen, Melodien)

## In Planung
- Funktelegeramme
- Besetzgraderfassung
- Fahrpläne
- LSA-Beeinflussung
- Ortung
- Weiterschaltung per Wegimpuls
- Testfunktionen
- Datenversorgungs-Editor
- GPIO-Aus- und Eingänge (WI, TK, OBI, UEB)