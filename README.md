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
- GPIO-Aus- und Eingänge (WI, TK, OBI, UEB)


## In Entwicklung

- Testfunktionen per Weboberfläche (Port 2000)
- Weiterschaltung per Wegimpuls
- Funktelegeramme

## In Planung
- Besetzgraderfassung
- Fahrpläne
- LSA-Beeinflussung
- Ortung
- Datenversorgungs-Editor


## Installation und Inbetriebnahme

### Voraussetzungen
- Node.js 20 oder neuer
- Für die Entwicklung ohne Hardware: `socat` (erzeugt ein virtuelles serielles Portpaar)
- Für den Zielbetrieb: Raspberry Pi mit einem IBIS-Pegelwandler an einer seriellen Schnittstelle

### Erststart

```bash
npm install
cd setup_ui && npm install && npm run build && cd ..   # Setup-Assistent bauen
npm run build && npm start                             # oder: npm run dev (virtuelles Port-Paar via socat)
```

Beim ersten Start existiert noch keine `device_config.json`. Das Programm legt
daraufhin automatisch eine minimale Standardkonfiguration an und startet im
**Setup-Modus**: ohne serielle Schnittstelle, ohne Terminals, ohne Funk — es läuft
lediglich der Webserver, damit der Setup-Assistent erreichbar ist.

Der Assistent ist anschließend unter **<http://localhost:2000/setup>** erreichbar.
Dort werden konfiguriert:

1. **Fahrzeug und Schnittstelle** — serielle Schnittstelle (z. B. `/dev/ttyUSB0`), Fahrzeugnummer
2. **Angeschlossene Geräte** — Terminals, Anzeigen, Entwerter, LVA, IRIS
3. **Tastenbelegung** des Terminals sowie GPIO-Pinbelegung
4. **Datenversorgung** — Upload eines `bundle.zip`

Da die Konfiguration beim Start eingelesen und die Datenbankverbindung beim Start
aufgebaut wird, ist nach Änderungen ein Neustart nötig. Der Assistent bietet dafür
eine Schaltfläche an; auf dem Raspberry Pi startet ein Supervisor (z. B. systemd
oder Docker mit `restart: always`) den Prozess automatisch neu.

### Datenversorgung

**Fahrpläne und Ansagen sind nicht Bestandteil dieses Repositories.** Es handelt
sich um betreiberspezifische und teilweise urheberrechtlich geschützte Daten. Die
folgenden Pfade sind daher bewusst per `.gitignore` ausgenommen und werden zur
Laufzeit vom Setup-Assistenten geschrieben:

| Pfad                 | Inhalt                                                            |
|----------------------|-------------------------------------------------------------------|
| `test.sqlite3`       | VDV-452-Fahrplandatenbank (Linien, Fahrten, Haltestellen)          |
| `announcements/`     | Haltestellenansagen als WAV-Dateien                                |
| `device_config.json` | Gerätekonfiguration des konkreten Fahrzeugs                        |

Die Datenversorgung wird als ZIP-Archiv über den Setup-Assistenten hochgeladen
(`POST /api/setup/data`). Erwarteter Aufbau:

```
bundle.zip
├── <beliebiger_name>.sqlite3     # VDV-452-Datenbank, muss mindestens die Tabellen
│                                 # REC_LID, LID_VERLAUF und BASIS_VER_GUELTIGKEIT enthalten
└── announcements/
    ├── HBF.wav                   # Dateinamen müssen REC_ANR.ANR_DATEI entsprechen
    ├── Gong.wav                  # Gong vor der Ansage
    ├── Links.wav                 # Türseite links
    ├── Rechts.wav                # Türseite rechts
    └── Ende.wav                  # Endhaltestellenansage
```

Die hochgeladene Datenbank wird vor dem Überschreiben gesichert und auf die
erforderlichen VDV-Tabellen geprüft; schlägt die Prüfung fehl, wird die vorherige
Version wiederhergestellt. Erzeugt werden solche Datenversorgungen mit dem
separaten Projekt `ifesx-backend` (Datenversorgungs-Editor).

## Konfiguration
Die Konfiguration, abgesehen von Datenversorgung, wird über die device_config.json-Datei vorgenommen.
Als Ausgangspunkt dient `device_config.example.json` — diese Datei kann nach
`device_config.json` kopiert und von Hand angepasst werden, komfortabler ist
jedoch der Setup-Assistent unter `/setup`.

In dieser befindet sich die Tastenbelegung des Terminals, die Einstellungen zu den angeschlossenen Geräten wie Anzeigen und Entwertern sowie die Pinbelegung für die GPIO-Pins.

### Aufbau der device_config.json und Erläuterung der Parameter


Parametername                           |Typ                          |Beschreibung
----------------------------------------|-----------------------------|----------------------------------------------------------------------
*serial_port*                           |Text (optional)              |Pfad zur seriellen IBIS-Schnittstelle, z.B. /dev/ttyUSB0. Ohne Angabe startet das System im Setup-Modus
*vehicle_number*                        |Zahl (optional)              |Fahrzeug-/Wagennummer (unabhängig von RADIO.vehicle_address)
*MFD*                                   |Boolean                      |Soll ein Multifunktionsdisplay auf Port 2000 gestartet werden ja/nein
*external_announcements*                |Boolean                      |Externes Ansagegerät ansteuern ja/nein
*TERMINAL_A*                            |Boolean                      |Terminal A angeschlossen ja/nein
*TERMINAL_B*                            |Boolean                      |Terminal B angeschlossen ja/nein
*validators*                            |Boolean-Array                |Welche Entwerter sind angeschlossen?
*signs*                                 |Boolean-Array                |Welche Anzeigen sind angeschlossen?
*UESTRA_LVA*                            |IBIS-Adressen-Array          |Auf welchen Adressen sind LVA der üstra angeschlossen?
*DS021_STOP_NAME*                       |IBIS-Adressen-Array          |Auf welchen DS021-Anzeigen soll der Haltestellenname ausgegeben werden?
*terminal_config*                       |~IBIS-Terminal-Konfiguration~|IBIS-Terminal-Konfiguration, siehe weiter unten
*use_gpio*                              |Boolean                      |GPIO-Pins des Raspberry Pi verwenden ja/nein
*GPIO_PINOUT*                           |~GPIO-Pinoutkonfiguration*   |GPIO-Pinbelegung für Schalt Ein/Ausgänge
*announcement_distance_before_next_stop*|Zahl in Meter                |Meterabstand zur nächsten Haltestelle, ab der die Ansage abgespielt wird
*line_number_in_ds009*                  |Boolean                      |Liniennummer in DS009-Datensatz einbauen ja/nein
*query_device_status*                   |Boolean                      |Anzeigen und Entwerterstatus abfragen und Fehlermeldungen sammeln
*RADIO*                                 |~Funkkonfiguration~          |Funkgeräte-Konfiguration

#### IBIS-Terminal-Konfiguration
TODO

### GPIO-Pinoutkonfiguration
Pinname|Beschreibung
-------|-----------------------------------
WI     |Wegimpuls
OBI    |Ortsbaken-Interrupt
TK     |Türkriterium
FLE    |Innenlautsprecher einschalten
PLE    |Außenlautsprecher einschalten
UEB    |Überfalltaster
KKA    |Kupplungskriterium A
KKB    |Kupplungskriterium B
K1     |Funkkanal Bit 1 (LSB)
K2     |Funkkanal Bit 2
K4     |Funkkanal Bit 4
K8     |Funkkanal Bit 8 (MSB)
DS     |Funkgerät Umschaltung Daten/Sprache
STAST  |Funkgerät Sendetastung

## Lizenz

Der Quellcode steht unter der MIT-Lizenz, siehe [LICENSE](LICENSE).

Die Lizenz gilt ausschließlich für den Code dieses Repositories. Fahrplandaten,
Haltestellenansagen und Gerätekonfigurationen sind nicht Bestandteil des
Repositories (siehe [Datenversorgung](#datenversorgung)) und unterliegen den
Rechten des jeweiligen Verkehrsbetriebs.

*IBIS* ist in DIN 43322 bzw. VDV-Schrift 300 spezifiziert. Genannte Hersteller-
und Betreibernamen dienen ausschließlich der Bezeichnung kompatibler Geräte;
dieses Projekt steht in keiner Verbindung zu ihnen.




