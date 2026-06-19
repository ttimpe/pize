# TODO MTT:
Mobile Touch Terminal von Trapeze, normalerweise ein 4:3 Touchdisplay, was bei neueren IBISplus-Systemen zur Steuerung verwendet wird. Es wird nicht mit den existierenden Telegrammen angesteuert, sondern sollte zum Beispiel per Websocket oder REST-Abfragen mit dem ibisplusplus-Server kommunizieren. 

Es hat verschiedene Tabs und Modi, Linienverlauf, Fahrtauswahl, On-Screen-Keyboards zur Filterung.

Ich hab vor einiger Zeit mal einen Prototyp gebaut als Angular-App, der mit den echten EFA-Daten funktioniert.

Bau das mal nach, so dass es mit dem IBISplus-Server kommunizieren kann und die Daten vom Server abruft.

Das MTT ist ein Touchdisplay, das in den Fahrzeugen verbaut ist und zur Steuerung des IBISplus-Systems verwendet wird.

Pack es unter Port 2000 /mtt

Es soll nachher als Vollbild auf einem Touchdisplay laufen, das im Fahrzeug verbaut ist.

Bei weitere Fragen bitte nachfragen, ich habe einige Screenshots/Fotos.

Die alte kompilierte Angular-App liegt im Workspace unter dist/mtt

Die Farben und Icons kannst du so übernehmen, wie sie in der alten App sind.

Unten befinden sich 5 Tabs:
Fahrtauswahl
Systemeinstellungen
Glossar (ausgegraut, wird nicht verwendet)
Meldungen
Linienverlauf


# TODO VDV 452 – offene Konformitätspunkte

Abgeglichen gegen `ifesx-backend/VDV452_v1.5.xsd`. Die BASIS_VERSION-Auflösung
(datumsbasiert über `BASIS_VER_GUELTIGKEIT`, inkl. Zeit-Offset/Zeitreise) ist
umgesetzt. Noch offen:

- **SEL_FZT_FELD-Lookup ignoriert `BEREICH_NR`.** `IBISController.computeStopTimes`
  und `MFDController.getConnectionDepartures` filtern Fahrzeiten inzwischen nach
  `BASIS_VERSION`, aber nicht nach `BEREICH_NR`. Bei mehreren Bereichen kann
  `findOne` die falsche Fahrzeit liefern. `BEREICH_NR` liegt auf `REC_FRT`
  (`currentTrip.BEREICH_NR`) und gehört in die where-Klausel.
- **`REC_LID` fehlen Spalten aus der XSD:** `LI_RI_NR` (Richtung 1=Hin/2=Rück),
  `BEREICH_NR`, `ROUTEN_ART`, `LINIEN_CODE`. Modell `RecLid.ts` ergänzen, damit
  Richtung/Bereich aus den Daten ableitbar sind (ifesx-backend schreibt diese
  Felder bereits).
- **60-s-Default in `computeStopTimes`** fabriziert Fahrplandaten, wenn keine
  `SEL_FZT` gefunden wird – nicht VDV-konform, ggf. als „unbekannt" markieren.

