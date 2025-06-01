import { Line } from "./models/database/Line";
import  './extensions/String'
import './extensions/Number'

import { IBISTerminalMode } from "./models/devices/Terminal/IBISTerminalMode";
import { IBISTelegram } from "./extensions/IBISTelegram";
class IBISTelegramGenerator {

    /// DS001
    // DS001 - Liniennummer
    static DS001(lineNumber: number): IBISTelegram {
        return 'l' + lineNumber.toString().padStart(3, '0')
    }
    // DS001a - Liniensonderzeichen
    static DS001a(sonderzeichen: number): IBISTelegram {
        return 'lE' + sonderzeichen.toString().padStart(2, '0')
    }
    
    // DS001b - Funkkennung - Linie/Kurs
    static DS001b(lineNumber: number, courseNumber: number): IBISTelegram {
        return 'lF' + lineNumber.toString().padStart(3, '0') + courseNumber.toString().padStart(2, '0')
    }

    // DS001c - Linienbandposition
    static DS001c(position: number): IBISTelegram {
        return 'lP' + position.toString().padStart(3, '0')
    }

    // DS001d - Liniennummer alphanumerisch - 4 Zeichen
    static DS001d(lineNumber: string): IBISTelegram {
        return 'lC' + lineNumber.substring(0,4)
    }
    
    // DS001d - Liniennummer alphanumerisch - 8 Zeichen
    static DS001e(lineNumber: string): IBISTelegram {
        return 'lC' + lineNumber.substring(0,8)
    }

    // DS001d - Liniennummer alphanumerisch - 7 Zeichen
    static DS001f(lineNumber: string): IBISTelegram {
        return 'lC' + lineNumber.substring(0,7)
    }

    // DS002 - Kursnummer 2 stellig
    static DS002(courseNumber: number): IBISTelegram {
        return 'k' + courseNumber.toString().padStart(2, '0')
    }

    // DS002a - Zugnummer 5 stellig
    static DS002a(zugnummer: number): IBISTelegram {
        return 'k' + zugnummer.toString().padStart(5, '0')

    }

    // DS003 - Zielnummer
    static DS003(ziel: number): IBISTelegram {
        return 'z' + ziel.toString().padStart(3, '0')
    }

    // DS003a - Außenanzeigen Text

    static DS003a(text: string): IBISTelegram {
        return 'zA' + Math.ceil(text.length / 16).toIBISHexString() + text.toIBISUppercase()
    }

    // DS003b - Ziel für ZUB / Fahrstraßenanforderung
    static DS003b(ziel: number): IBISTelegram {
        return 'zR' + ziel.toString().padStart(3, '0')
    }

    // DS003c - Haltestellenname
    static DS003c(name: string): IBISTelegram {
        return 'zI' + Math.ceil(name.length / 4).toIBISHexString() + name.toIBISUppercase()
    }

    // DS003d - Routennummer für ZUB / Fahrstraßenanforderung
    static DS003d(route: number): IBISTelegram {
        return 'zN' + route.toString().padStart(3, '0')
    }

    // DS003e - Zielbandposition
    static DS003e(ziel: number): IBISTelegram {
        return 'zP' + ziel.toString().padStart(3, '0')
    }

    // DS003f - Routennummer erweitert auf 6 Zeichen
    static DS003f(route: number): IBISTelegram {
        return 'zN' + route.toString().padStart(6, '0') 
    }

    // DS003g - Liniennummer 4 stellig
    static DS003g(lineNumber: number): IBISTelegram {
        return 'zL' + lineNumber.toString().padStart(4, '0')
    }

    // DS003h - Ziel, Fahrweg Fronttext - Seitentext
    static DS003h(text: string, mode: string): IBISTelegram {
        return ''
    }

    // DS004 - Entwertermerkmale
    static DS004(zone: number, kurzstrecke: number, richtung: number) {
        return 'e' + zone.toString().padStart(2, '0').substring(0, 2) + kurzstrecke.toString().padStart(2, '0') + richtung;
    }

    // DS004a - Entwertermerkmale erweitert
    static DS004a(extension: number) {
        return 'eA' + extension.toString().padStart(4, "0");
    }

    // DS004b - Entwerter Haltestellennummer
    static DS004b(nummer: number): IBISTelegram {
        return 'eH' + nummer.toString().padStart(7, '0')
    }

    // DS004c - Entwerter Haltestellenname
    static DS004c(name: string) {

    }

    static DS070(addresse: IBISAddress) {
        return 'g' + addresse;
    }

    // DS005 - Uhrzeit 4 stellig
    static DS005(uhrzeit: Date): IBISTelegram {
        let hour = uhrzeit.getHours().toString().padStart(2, '0')
        let minute = uhrzeit.getMinutes().toString().padStart(2, '0')

        return 'u' + hour + minute
    }

    // DS006 - Datum 5 stellig

    static DS006(datum: Date): IBISTelegram {
        const tag = datum.getDate().toString().padStart(2, '0')
        const monat = (datum.getMonth() + 1).toString().padStart(2, '0')
        const jahr = datum.getFullYear().toString().substring(3)
        return 'd' + tag + monat + jahr
    }

    // DS006a - Datum 6 stellig

    static DS006a(datum: Date): IBISTelegram {
        const tag = datum.getDate().toString().padStart(2, '0')
        const monat = (datum.getMonth() + 1).toString().padStart(2, '0')
        const jahr = datum.getFullYear().toString().substring(2)
        return 'd' + tag + monat + jahr
    }

    // DS007 - Zuglänge 1 stellig
    static DS007(zuglaenge: number): IBISTelegram {
        return 'w' + zuglaenge.toString()
    }

    // DS008 - Fehlererfassungssysten Wagenadresse
    static DS008() {

    }

    // DS008a - Wagennummern aller Fahrzeuge im Zugverbund + Beiwagennummer
    static DS008a() {

    }

    // DS009 - Haltestellenname 16 Zeichen
    static DS009(name: string): IBISTelegram {
        return 'v' + name.toIBISUppercase().padEnd(16, ' ').substring(0, 16)
    }

    // DS009a - Haltestellenname 20 Zeichen
    static DS009a(name: string): IBISTelegram {
        return 'v' + name.toIBISUppercase().padEnd(20, ' ').substring(0, 20)
    }

    // DS009b - Haltestellenname 24 Zeichen
    static DS009b(name: string): IBISTelegram {
        return 'v' + name.toIBISUppercase().padEnd(24, ' ').substring(0, 24)
    }
    // DS009b - Haltestellenname 32 Zeichen
    static DS009c(name: string): IBISTelegram {
        return 'v' + name.toIBISUppercase()
    }


    // DS010 - Voranzeige Haltestellenummer 4 stellig 

    static DS010(haltestelle: number): IBISTelegram {
        return 'x' + haltestelle.toString().padStart(4, '0')
    }

    // DS010a - Voranzeige Haltestellennummer 4 stellig Perlenschnur
    static DS010a(haltestelle: number): IBISTelegram {
        return 'xH' + haltestelle.toString().padStart(4, '0')
    }

    // DS010b - Haltestellenindex
    static DS010b(index: number): IBISTelegram {
        return 'xI' + index.toString().padStart(2, '0')
    }

    // DS010c - Haltestellenindex der Zielhaltestelle
    static DS010c(zielIndex: number): IBISTelegram {
        return 'xZ' + zielIndex.toString().padStart(2, '0')
    }

    // DS010d - Jahreszahl 4 stellig
    static DS010d(datum: Date): IBISTelegram {
        return 'xJ' + datum.getFullYear().toString()
    }

    // DS010e - aktuelle Verspätung/Verfrühung
    static DS010e(delay: number): IBISTelegram {
        let delayTypeChar = '+'
        if (delay < 0) {
            delayTypeChar = '-'
        }
        return 'xV' + delayTypeChar + Math.abs(delay).toString().substring(0, 3)
    }

    // DS010f   - Umsteigemöglichkeiten an der nächsten Haltestelle
    static DS010f(nummer: number, text: string): IBISTelegram {
        return 'xU' + nummer.toIBISHexString().padStart(2, '0') + text.length.toIBISHexString().padStart(2, '0') + text
    }
    
    // DS010g - Anzeige "Nächste Haltestelle"
    static DS010g(): IBISTelegram {
        return 'xN'
    }

    // DS010h - Fortschaltung vor erreichen der nächsten Haltestelle
    static DS010h(): IBISTelegram {
        return 'xT'
    }

    // DS010I - FGI Statusabfrage
    static DS010i(id: number): IBISTelegram {
        return 'xS' + id.toIBISHexString().padStart(2, '0')
    } 

    // DS011 - Ortscode / Wegzähler

    static DS011(code: number): IBISTelegram {
        return 'yO' + code.toIBISHexString().padStart(8, '0')
    }

    // DS011a - Funkgerät Stellwerk Anschaltbereich
    static DS011a(anschaltbereich: number): IBISTelegram {
        return 'y' + anschaltbereich.toString().padStart(8, '0')
    }

    // DS011b - Funkgerät Betriebszustand

    static DS011b(betriebszustand: number): IBISTelegram {
        return 'yF' + betriebszustand.toIBISHexString().padStart(2, '0')
    }

    // DS011c - Funkgerät Nenne Status

    static DS011c(): IBISTelegram {
        return 'y'
    }

    // DS012a - Rückspeisezustand

    static DS012a(status: boolean): IBISTelegram {
        if (status) {
            return 'rE'
        } else {
            return 'rA'
        }
    }

    // DS013a - Ortscode + Wegzähler für ZUB

    static DS013a(code: number): IBISTelegram {
        return 'oCW' + code.toIBISHexString().padStart(8, '0')
    }

    // DS013b - Funkgerät Linienkennung 2 Ziffern
    static DS013b(linie: number): IBISTelegram {
        return 'oCLO' + linie.toString().substring(0,2).padStart(2, '0')
    } 

    // DS020 - Statusabfrage Anzeige
    static DS020(adresse: number): IBISTelegram {
        return 'a' + adresse.toIBISHexString()
    }

    // DS201 - Versionsabfrage
    static DS0201(adresse: number): IBISTelegram {
        return 'aV' + adresse.toIBISHexString()
    } 

    // DS021 - Text Ziel, Fahrweg
    static DS021(adresse: number, text: string): IBISTelegram {
        return 'aA' + adresse.toIBISHexString() + (Math.ceil(text.length / 16) + 1).toIBISHexString() + text + '\n\n' + " ".repeat(text.length - 1)
    }

    // DS021a - Streckenverlaufsanzeigen - Haltestellennamen und Umsteigehinweise
    static DS021a(adresse: number, text: string): IBISTelegram {
        return 'aL' + adresse.toIBISHexString() + (Math.ceil(text.length / 16) + 1).toIBISHexString().padStart(2, '0') + text
    }

    // DS021b - Haltestellenname und Umsteigehinweise
    static DS021b(text: string): IBISTelegram {
        return 'aA' + Math.ceil(text.length / 16).toIBISHexString().padStart(3, '0') + text
    }

    // DS021c - Perlenschnur ?
    static DS021c(): IBISTelegram {
        return 'aX'
    }

    // DS030 - Ansagegerät Status

    static DS030(): IBISTelegram {
        return 'hS'
    }

    // DS301 - Ansagegerät Versionsabfrage
    static DS301(): IBISTelegram {
        return 'hV'
    }

    // DS031 - Ansagegerät stumme Fortschaltung
    static DS031(): IBISTelegram {
        return 'hM'
    }

    // DS032 - Ansagegerät nächste Haltestelle
    static DS032(): IBISTelegram {
        return 'hN'

    }

    // DS033 - Ansagegerät Haltestelle wiederholen
    static DS033(): IBISTelegram {
        return 'hR'
    }

    // DS034 - Sende Haltestellenname
    static DS034(name: string): IBISTelegram {
        return 'hC' + name
    }

    // DS035 - Sende Haltestellendaten
    static DS035(data: string): IBISTelegram {
        return 'hD' + data
    }

    // DS036 - Haltestellennummer Ansagegerät
    static DS036(nummer: number): IBISTelegram {
        return 'hP' + nummer.toString().padStart(4, '0')
    }

    // DS036a - Haltestellenansage erweitert
    static DS036a(nummer: number): IBISTelegram {
        return 'hE' + nummer.toString().padStart(8, '0')
    }

    // DS037 - Haltestellennummer Ansagegerät stumm
    static DS037(nummer: number): IBISTelegram {
        return 'hM' + nummer.toString().padStart(4, '0')
    }

    // DS038 - ELA Laustärke
    static DS038(pfad: number, volume:number): IBISTelegram {
        return 'rL' + pfad.toIBISHexString() + volume.toString().padStart(3, '0')
    }

    // DS038a - ELA Pfadumschaltung
    static DS038a(pfad: number): IBISTelegram {
        return 'rA' + pfad.toIBISHexString()
    }

    // DS038b ELA Versionsabfrage
    static DS038b(): IBISTelegram {
        return 'rEV'
    }

    //DS038c - ELA Statusabfrage

    static DS038c(): IBISTelegram {
        return 'rES'
    }

    // DS038d - ELA Parameter speichern
    static DS038d(): IBISTelegram {
        return 'rEP'
    }

    // DS039 - Haltestellenansage Text
    static DS039(text: string): IBISTelegram {
        return 'hA'+text.hexLength() + text
    }

    // DS039a - Haltestellenansage Lautstärke

    static DS039a(volume: number): IBISTelegram {
        return 'hL' + volume.toString().padStart(3, '0')
    }

    // DS039b - Haltestellenansage Text ?

    static DS039b(text: String) {

    }

    // DS040a - Terminal A - Eingabe Status
    static DS040a(mode: IBISTerminalMode): IBISTelegram {
        return 'mS' + mode
    }

     // DS040b - Terminal B - Eingabe Status
    static DS040b(mode: IBISTerminalMode): IBISTelegram {
        return 'tS' + mode
    }

    // DS040c - Terminal B - Ausweis-Leser-Abfrage

    static DS040c(mode: number): IBISTelegram {
        return 'tP' + mode.toString()
    }

    // Fahrerterminal A, Anzeige Versionsabfrage

    static DS041a(): IBISTelegram {
        return 'mVS'
    }

    // DS043 - Terminal A - Blinken ein aus

    static DS043(mode: IBISTerminalMode, posx: number, posy: number, count: number): IBISTelegram {
        return 'mA' + mode + (count+1).toIBISHexString() + posy.toIBISHexString() + posx.toIBISHexString()
    }
    // DS043b - Terminal B - Blinken ein aus

    static DS043b(mode: IBISTerminalMode, posx: number, posy: number, count: number): IBISTelegram {
        return 'tA' + mode + (count+1).toIBISHexString() + posy.toIBISHexString() + posx.toIBISHexString()
    }

    // DS044a - Terminal A - Text

    static DS044a(mode: IBISTerminalMode, posx: number, posy:number, text: string): IBISTelegram {
        return 'mC' + mode + text.length.toIBISHexString() + posy.toString() + posx.toString() + text
    }

    // DS044b - Terminal B - Text

    static DS044b(mode: IBISTerminalMode, posx: number, posy:number, text: string): IBISTelegram {
        return 'tC' + mode + text.length.toString(16) + posy.toString() + posx.toString() + text
    }

    // DS045a - Terminal A Summer
    static DS045a(mode: IBISTerminalMode, sound: number): IBISTelegram {
        return 'mK' + mode + sound.toIBISHexString()
    }

    // DS045b - Terminal B Summer
    static DS045b(mode: IBISTerminalMode, sound: number): IBISTelegram {
        return 'tK' + mode + sound.toIBISHexString()
    }

    // D046a - Terminal A Cursor an/aus
    static DS046a(mode: IBISTerminalMode, posx: number, posy: number): IBISTelegram {
        return 'mU' + mode + posy.toIBISHexString() + posx.toIBISHexString()
    }

    // D046b - Terminal B Cursor an/aus
    static DS046b(mode: IBISTerminalMode, posx: number, posy: number): IBISTelegram {
        return 'tU' + mode + posy.toIBISHexString() + posx.toIBISHexString()
    }

    // DS046c - Terminal B Versionabfrage

    static DS046c(mode: IBISTerminalMode): IBISTelegram {
        return 'tV' + mode.toString()
    }

    // DS046d - Fahrerterminal B Testfunktion ein
    static DS046d(mode: IBISTerminalMode): IBISTelegram {
        return 'tT' + mode
    }

    // DS046e - Fahrerterminal B Testfunktion aus
    static DS046e(mode: IBISTerminalMode): IBISTelegram {
        return 'tN' + mode
    }

    // DS046f - Fahrerterminal B Fahrplanabweichung
    static DS046f(mode: IBISTerminalMode, time: number): IBISTelegram {
        return 'tF'+ mode + time.toString().padStart(5,'0')
    }

    // DS050 - Ausweisleser Statusabfrage
    static DS050(): IBISTelegram {
        return 'pS'
    }

    // DS051 - Ausweisleser Datenabfrage
    static DS051(): IBISTelegram {
        return 'pD'
    }

    // DS055 - Fehlererfassungssystem

    // DS551 - Fehlererfassungsystem Versionsabfrage

    // DS056 - Fehlergruppe abfragen

    // DS056a - Fehler abfragen

    // DS057 - Fehlertext abfragen

    // DS571 - Fehlertext abfragen

    // DS060 - Ortung - Status

    static DS060(richtung: string): IBISTelegram {
        return 'o' + richtung + 'S';
    }
    // DS061 - Ortung Datenabfrage
    static DS061(richtung: string): IBISTelegram {
        return 'o' + richtung + 'D';
    }

    // DS062- Ortung Zielrichtung
    static DS062(richtung: string, zielrichtung: string): IBISTelegram {
        return 'o' + richtung + 'R' + zielrichtung;
    }
    
    // DS063 - Ortung einschalten
    static DS063(richtung: string): IBISTelegram {
        return 'o' + richtung + 'E';
    } 

    static DS064(richtug: string): IBISTelegram {
        return 'o' + richtug + 'A';
    }

// TODO: Check status replies
   


}
export { IBISTelegramGenerator as TelegramGenerator }