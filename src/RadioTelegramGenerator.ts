import { Meldungsart } from "./enums/Meldungsart";

class RadioTelegramGenerator {
    // Standard-Antwort, wenn keine Information vorliegt
    R00(besetzgrad: number, wegzaehler: number, wegzaehlerLetzteTuer: number) {

    }
    /* Absolute Standortangabe, Ortsmarke, Überlauf oder Fahrereingabe
        - Zuglänge 3-bit
        - Fahrereingabe 1-bit
    */
    R01(zuglaenge: number, fahrereingabe: boolean) {

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
    R02(meldungsart: Meldungsart) {

    }

}