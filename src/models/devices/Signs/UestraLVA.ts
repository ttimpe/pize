import { IBISSign } from "../IBISSign";

class UestraLVA extends IBISSign {


    onSetRoute(line: any, route: any) {
        if (route) {
            console.log('UESTRA LVA detected')
            this.clearSign();

            /*
             let destinationTelegram = "aX" + this.address + "1" + "\x03" + "101" + "\x04" + route.destination.sign_text.toIBISUppercase().substring(0,16)
             destinationTelegram = this.convertSpecialCharacters(destinationTelegram)
             this.ibisController.sendTelegram(destinationTelegram)
             let lineNameTelegram = "aX" + this.address + "1" + "\x03" + "102" + "\x04" + line.number;
 
             this.ibisController.sendTelegram(lineNameTelegram)
             let refreshTelegram = "x2001";
             this.ibisController.sendTelegram(refreshTelegram)
 
             // Loop through all stops and make telegrams
             for (var i=0; i<route.stops.length; i++) {
                 let telegram = "aX" + this.address
                 let character = "1"
 
                 if (i == (route.stops.length - 1)) {
                     character = "2"
                 }
                 telegram = telegram + character + "\x03";
                 // 001-999
                 let indexNumberString = (i+1).toString().padStart(3, "0")
                 telegram += indexNumberString
                 telegram += "\x04"
                 telegram += route.stops[i].stop.information.shortName.toUpperCase().padEnd(16).substring(0, 16)
                 telegram = this.convertSpecialCharacters(telegram)
                 this.ibisController.sendTelegram(telegram)
             }
           */

        }
    }
    onSetZiel(ziel: any) {
        /*
        let destinationTelegram = "aX" + this.address + "1" + "\x03" + "101" + "\x04" + this.convertSpecialCharacters(ziel.sign_text.toIBISUppercase().substring(0,16))
        this.ibisController.sendTelegram(destinationTelegram)
        */
    }
    clearSign() {
        let guteFahrtTelegram = "aX" + this.address + "0\x03100\x040GUTE FAHRT";
        this.ibisController.sendTelegram(guteFahrtTelegram);
    }

    private convertSpecialCharacters(telegram: string) {
        telegram = telegram.replaceAll("ß", "\x02\x3f")
        telegram = telegram.replaceAll("Ä", "\x02\x24")
        telegram = telegram.replaceAll("Ö", "\x02\x36")
        telegram = telegram.replaceAll("Ü", "\x06\x02\\\x06")
        telegram = telegram.replaceAll("ä", "\x02\x44")
        telegram = telegram.replaceAll("ö", "\x02\x56")
        telegram = telegram.replaceAll("ü", "\x02\x5c")


        return telegram
    }
}
export { UestraLVA }