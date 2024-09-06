import { IBISTelegram } from "../../../extensions/IBISTelegram";
import { Destination } from "../../database/Destination";
import { Line } from "../../database/Line";
import { Route } from "../../database/Route";
import { IBISSign } from "../IBISSign";

class UestraLVA extends IBISSign {


    onSetRoute(line: Line, route: Route) {
        if (route) {
            console.log('UESTRA LVA detected')
            this.clearSign();
            
           
            let destinationTelegram = "aX" + this.address + "1" + "\x03" + "101" + "\x04" + route.destination.sign_text.toIBISUppercase().substring(0,16)
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
                this.ibisController.sendTelegram(telegram)
            }
          

        }
    }
    onSetZiel(ziel: Destination) {
        let destinationTelegram = "aX" + this.address + "1" + "\x03" + "101" + "\x04" + ziel.short_name.toIBISUppercase().substring(0,16)
        this.ibisController.sendTelegram(destinationTelegram)
    }
    clearSign() {
        let guteFahrtTelegram = "aX" + this.address + "0\x03100\x040GUTE FAHRT";
        this.ibisController.sendTelegram(guteFahrtTelegram);
    }
}
export { UestraLVA }