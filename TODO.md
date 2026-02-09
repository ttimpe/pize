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

