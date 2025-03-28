import { Meldungsart } from "./enums/Meldungsart";
enum C01SD {
    SetzeLinie = '0000',
    SetzeKurs = '0001',
    SetzeAnschluss = '0010',
    SetzeZiel = '0011',
    SetzeEntwerterZone = '0100',
    SetzeEntwerterKurzstrecke = '0101',
    SetzeLinieVorlassen = '0110',
    SetzeEntwerterBeiWZ = '1000'
}

enum C15Abfragetyp {
    OhneBedeutung = '000',
    Notrufabfrage = '001',
    SprechwunschFahrermeldung = '010',
    NotrufSprechwunsch = '011',
    Anmeldung = '100',
    LSAAnforderung = '101'
}

enum R02Meldung {
    Initialisierung = '0001',
    FahrerterminalBDefekt = '0010',
    OrtsempfangDefekt = '0011',
    AusweisleserDefekt = '0100',
    BesetzgraderfassungDefekt = '0101'

}

class RadioTelegramGenerator {



    // int zu bcd
    private numberToBCD(num: number): string {
        return num
            .toString()
            .split('')
            .map(digit => parseInt(digit, 10).toString(2).padStart(4, '0'))
            .join('');
    }

    // Zeitwert und Zeitfaktor aus Sekunden berechnen
    private convertSecondsToBinary(seconds: number) :string {
        const timeFactors = [30, 510, 1080, 3840]; // Corresponding ZF values
        let zf = 0;
        let zw = 0;
    
        if (seconds === null) {
            return "000000"; // All zeros for null input
        }
    
        // Find the appropriate ZF value
        for (let i = 0; i < timeFactors.length; i++) {
            if (seconds % timeFactors[i] === 0) {
                zf = i;
                break;
            }
        }
    
        let unit = timeFactors[zf];
        zw = Math.ceil(seconds / unit); // Round up to ensure correct encoding
        
        if (zw < 0 || zw > 15) {
            return "111111"; // All ones for invalid values
        }
    
        let zfBinary = zf.toString(2).padStart(2, '0');
        let zwBinary = zw.toString(2).padStart(4, '0');
    
        return zfBinary + zwBinary;
    }

    // Radix 40 gemäß VDV:
    private stringToRadix40Binary(input: string): string {
        const radix40Table = " ABCDEFGHIJKLMNOPQRSTUVWXYZ:.=0123456789";
        let binaryString = "";
    
        input = input.toUpperCase(); // Normalize input
    
        for (let i = 0; i < input.length; i += 3) {
            const chunk = input.slice(i, i + 3); // Take up to 3 characters
            const indices = chunk.split('').map(char => {
                const index = radix40Table.indexOf(char);
                if (index === -1) throw new Error(`Invalid character: ${char}`);
                return index;
            });
    
            if (indices.length === 3) {
                // Pack 3 characters into 16-bit value
                const packedValue = (indices[0] * 40 * 40) + (indices[1] * 40) + indices[2];
                binaryString += packedValue.toString(2).padStart(16, '0');
            } else {
                // Encode 1 or 2 characters as 6-bit each
                binaryString += indices.map(index => index.toString(2).padStart(6, '0')).join('');
            }
        }
    
        return binaryString;
    }
    



    /* Telegramme:
    Aufrufdatensätze die dekodiert werden müssen:
    1. 111111 - Bitsynchronisation
    2. 000000000 - Rahmensychronisation
    3. 1 - Startbit
    4. Infobyte 1
    5. Sperrbit
    6. Infobyte 2
    7. Sperrbit
    8. Infobyte 3
    9. Sperrbit
    10. Infobyte 4
    11. Sperrbit
    12. CRC-Byte 1
    13. Sperrbit
    14. CRC-Byte 2
    */
    private bitSync = '111111'
    private frameSync = '000000000'


    // BK - Betriebskennziffer

    private BK = '00'

    // FA - Fahrzeugadresse
    private FK = '0000000001';



    buildTelegram(infobytes:string[]): string {
        // Bitsync + Framesync
        let output = this.bitSync + this.frameSync
        // Startbit
        output += '1'
        // Infobytes zum output hinzufügen, mit Sperrbit dahinter
        for (var i=0; i<infobytes.length; i++) {
            output += infobytes[i] + '1'
        }
        // TODO: CRC-Bytes berechnen
        return output
    }

    // Aufrufdatensätze

    // Allgemeine Anfrage
    C00(zeitart: boolean, zeitvorzeichen: boolean, zeit: number): string {
        let output = '0000'
        output += this.BK
        output += this.FK
        output += zeitart ? '1' : '0'
        output += zeitvorzeichen ? '1' : '0'
        output += this.convertSecondsToBinary(zeit)
        output += '00000000'
        return output
    }

    // Daten
    
    C01(spezifiziertDaten: C01SD, daten: string): string {
        let output = '0001'
        output += this.BK
        output += this.FK
        output += spezifiziertDaten
        output += daten;
        return output
    }

    // Kanäle, Anweisungen selektiv
    C02(innenlautsprecher: boolean, mikrofon: boolean, loescheAnzeige: boolean, sprachkanal: boolean, kanal: number, setzeAnweisung: boolean, quittierung: boolean, funktion: number, anweisung: number): string {
        let output = '0010';
        output += this.BK
        output += this.FK
        output += innenlautsprecher ? '1': '0'
        output += mikrofon ? '1' : '0'
        output += loescheAnzeige ? '1' : '0'
        output += sprachkanal ? '1' : '0'
        output += kanal.toString(2).padStart(4, '0')
        output += setzeAnweisung ? '1' : '0'
        output += quittierung ? '1' : '0'
        output += funktion.toString(2).padStart(2, '0')
        output += anweisung.toString(2).padStart(4, '0')
        return output
    }
    // Kanäle, Anweisungen Sammelruf
    C03(liniennnummer: number, innenlautsprecher: boolean, mikrofon: boolean, loescheAnzeige: boolean, sprachkanal: boolean, kanal: number, setzeAnweisung: boolean, quittierung: boolean, funktion: number, anweisung: number): string {
        let output = '0011';
        output += this.numberToBCD(liniennnummer).padStart(12, '0')
        output += innenlautsprecher ? '1': '0'
        output += mikrofon ? '1' : '0'
        output += loescheAnzeige ? '1' : '0'
        output += sprachkanal ? '1' : '0'
        output += kanal.toString(2).padStart(4, '0')
        output += setzeAnweisung ? '1' : '0'
        output += quittierung ? '1' : '0'
        output += funktion.toString(2).padStart(2, '0')
        output += anweisung.toString(2).padStart(4, '0')
        return output
    }
    // Abfragen und Quittierungen ?
    C04() {

    }

    // C05 - C09 Reserve

    // Anforderung vorbereiten

    C10(abstand: number, anforderungspunkt: number): string {
        let output = '1010'
        output += this.BK
        output += this.FK
        output += abstand.toString(2).padStart(8, '0')
        output += anforderungspunkt.toString(2).padStart(8, '0')
        return output
    }

    // C11, C12 - Belegt für Bedarfsbetrieb

    // Textempfang vorbereiten
    C13(cl: number, cs: number = 0, ci: number, se: boolean, qe: boolean, text: string) {
        let output = '1101'
        output += this.BK
        output += this.FK

        // CL - Anzahl der folgenden C14
        output += cl.toString(2).padStart(2, '0')
        output += cs.toString(2).padStart(2, '0')

        output += ci.toString(2).padStart(4, '0')
        output += se ? '1' : '0'
        output += qe ? '1' : '0'
        output += this.stringToRadix40Binary(text[0])
        return output
    }

    // Text
    C14(teiltext: boolean, text: string) {
        let output = '1110'
        output += teiltext ? '1' : '0'
        output += this.stringToRadix40Binary(text)
    }

    // Sammelabfrage, Zeitsynchronisation
    C15(liniennummer: number, abfragetyp: C15Abfragetyp) {
        const date = new Date()
        let output = '1111'
        output += this.numberToBCD(liniennummer).padStart(12, '0')
        let sendTime = false
        if (abfragetyp == C15Abfragetyp.Notrufabfrage || abfragetyp == C15Abfragetyp.NotrufSprechwunsch || abfragetyp == C15Abfragetyp.LSAAnforderung) {
            sendTime = true
        }
        if (sendTime) {
            /* Zeit senden:
            Stunden-Zehner, Stunden-Einer, Minuten-Zehner, Minuten-Einer
            */
            const hourString = date.getHours().toString().padStart(2,'0')

            const minuteString = date.getMinutes().toString().padStart(2, '0')

            output += parseInt(hourString[0]).toString(2).padStart(2, '0')
            output += parseInt(hourString[1]).toString(2).padStart(4, '0')

            output += parseInt(minuteString[0]).toString(2).padStart(3, '0')
            output += parseInt(minuteString[1]).toString(2).padStart(4, '0')
        
            
        } else {
            /* Datum senden:
            Tag im Monat, Monat, Jahresendziffer
            */
            const day = date.getDate()
            output += day.toString(2).padStart(5, '0')
            const month = date.getMonth() + 1
            output += month.toString(2).padStart(4, '0')
            const yearEndDigit = date.getFullYear() % 10
            output += yearEndDigit.toString(2).padStart(4, '0')

        }
        return output
    }





    // Antwortdatensätze


    // Standard-Antwort, wenn keine Information vorliegt

    R00(besetzgrad: number, wegzaehler: number, wegzaehlerLetzteTuer: number): string {
        let output = '0000'
        output += besetzgrad.toString(2).padStart(3, '0')
        output += wegzaehler.toString(2).padStart(9, '0')
        output += wegzaehlerLetzteTuer.toString(2).padStart(8,'0')
        return output
    }
    /* Absolute Standortangabe, Ortsmarke, Überlauf oder Fahrereingabe
        - Zuglänge 3-bit
        - Fahrereingabe 1-bit
    */
    R01(zuglaenge: number, fahrereingabe: boolean, ortsmarke: number, overflows: number, zaehlerstand: number, eingabe?: number) {
        /* Keine Fahrereingabe: Ortsmarke, Zählerstand, und Überlauf */
        let output = '0001'
        output += zuglaenge.toString(2).padStart(3, '0')
        output += fahrereingabe ? '1' : '0'
        if (fahrereingabe == false) {
            output += zaehlerstand.toString(2).padStart(8, '0')
            // TODO: Wenn Überlauf dann anders
        } else {
            // Fahrereingabe
            output += this.numberToBCD(eingabe).padStart(16, '0')
        }
    }

    /* R02: Meldungen und quittierte Anweisungen:
        - MA: Meldungsart:
        0000: keine Bedeutung
        0001: Frei
        0010: Fehlererfassungssysteme, technische Meldungen extern
        0011: Technische Meldungen intern
        0100: Fahrerquittierung auf C01, ME entspricht SD-Bits
        0101: Fahrerquittierung auf C02, ME entspricht AW-Bits
        0110: Fahrerquittierung auf C13/C14, ME = 0000
        0111: Frei
        1111: Frei
        - ME: Meldung
        0000: Keine Bedeutung
        Belegung für MA = 0011:
        ME  = 0001: Initialisierung
            = 0010: Fahrerterminal B defekt
            = 0011: Ortsempfang defekt
            = 0100: Ausweisleser defekt
            = 0101: Besetzgraderfassung defekt
            - weitere für BB
    */
    R02(meldungsart: Meldungsart, meldung?: R02Meldung) {
        let output = '0010'
        // Reservierte Bits
        output += '0000'
        output += meldungsart
        
    }

    /* R03: Besetzung
    FE - Fahrereingabe
    FZ: Fahrzeugstellung im Zugverbund (3 bit)
    EI: Einsteiger (8 bit) oder feinauflösende Gewichtserfassung bzw. 8x 0 bei Fahrereingabe
    AU: Aussteiger (8 bit) oder Fahrereingabe (BCD-Wert, rechtsbündig) bzw. 8 x 1 bei feinauflösender Gewichtserfassung
    */
   R03(fahrereingabe: boolean, fahrzeugstellung: number, einsteiger: number, aussteiger: number, eingabe: number): string {
    let output = '0011'
    output += fahrereingabe ? '1': '0'
    output += fahrzeugstellung.toString(2).padStart(3, '0')
    if (fahrereingabe) {
        output += '00000000'
        output += this.numberToBCD(eingabe).padStart(8, '0')
    } else {
        output += einsteiger.toString(2).padStart(8, '0')
        output += aussteiger.toString(2).padStart(8, '0')
    }
    return output
   }

   /* R04: Linien-/Kursnummer */
   R04(liniennummer: number, kurs: number): string {
    let output = '0100'
    output += this.numberToBCD(liniennummer).padStart(12, '0')
    output += this.numberToBCD(kurs).padStart(8, '0')
    return output
   }

   /* R05: Fahrernummer */
   R05(fahrernummer: number) :string {
    let output = '0101'
    output += this.numberToBCD(fahrernummer).padStart(20, '0')
    return output

   }
   /* R06: Beiwagen */
   R06(fahrzeugstellung: number, beiwagennummer: number): string {
    let output = '0110'
    output += '0'
    output += fahrzeugstellung.toString(2).padStart(3, '0')
    // TODO: WN?
    return output
   }
   
   /* R07: Zielnummer */

   R07(zielnummer: number): string {
    let output = '0111'
    output += '00000000'
    output += this.numberToBCD(zielnummer).padStart(12, '0')
    return output
   }
   
   /* R08: Gerätenummer */
   R08(nummer: number): string {
    let output = '1000'
    output += '0000000000'
    output += nummer.toString(2).padStart(10, '0')
    return output
   }

   R09() {

   }
   /* Anforderung */
   R10(liniennummer: number, anforderungspunkt: number) {
    let output = '1010'
    output += this.numberToBCD(liniennummer).padStart(12, '0')
    output += anforderungspunkt.toString(2).padStart(8, '0')
    return output

   }

   /* TODO: Bedarfsbetrieb */

   /* R14: Wegzähler */
   R14(wegzaehlerVorletzteTuer: number, wegzaehlerDrittletzteTuer: number): string {
    let output = '1110'
    output += '0000'
    return output

   }


}