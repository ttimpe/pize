import { IBISTelegram } from "../../../extensions/IBISTelegram";
import { Line } from "../../database/Line";
import { Route } from "../../database/Route";
import { IBISSign } from "../IBISSign";

class UestraLVA extends IBISSign {

    onSetRoute(line: Line, route: Route) {
        if (route) {
            console.log('UESTRA LVA detected')

            let guteFahrtTelegram = "aX" + this.address + "0100GUTE FAHRT";
            this.ibisController.sendTelegram(guteFahrtTelegram);
           
            let destinationTelegram = "aX" + this.address + "1101" + "ZIELNAME".toUpperCase().substring(0,16)
            this.ibisController.sendTelegram(destinationTelegram)
            let lineNameTelegram = "aX" + this.address + "1102" + line.number.padStart(3, "0");
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
                telegram = telegram + character
                // 001-999
                let indexNumberString = (i+1).toString().padStart(3, "0")
                telegram += indexNumberString
                telegram += route.stops[i].stop.information.shortName.toUpperCase().padEnd(16).substring(0, 16)
                this.ibisController.sendTelegram(telegram)
            }
          

        }
    }
}
export { UestraLVA }