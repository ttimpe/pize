import { IBISTelegram } from "../../../extensions/IBISTelegram";
import { Line } from "../../database/Line";
import { Route } from "../../database/Route";
import { IBISSign } from "../IBISSign";

class UestraLVA extends IBISSign {

    onSetRoute(line: Line, route: Route) {
        if (route) {
            let telegrams: IBISTelegram[] = []

            let departureStopTelegram = "aX" + this.address + "000310004" + route.stops[0].stop.name.toUpperCase().substring(0, 16)
            this.ibisController.sendTelegram(departureStopTelegram)
            let destinationTelegram = "aX" + this.address + "00310104" + route.destination.name.toUpperCase().substring(0,16)
            this.ibisController.sendTelegram(destinationTelegram)
            let lineNameTelegram = "aX" + this.address + "10310204" + line.number
            this.ibisController.sendTelegram(lineNameTelegram)

            // Loop through all stops and make telegrams
            for (var i=1; i<=route.stops.length; i++) {
                let telegram = "aX" + this.address
                let character = "1"

                if (i ==route.stops.length) {
                    character = "2"
                }
                telegram = telegram + character
                // 001-999
                let indexNumberString = i.toString().padStart(3, "0")
                telegram += indexNumberString
                telegram += route.stops[i].stop.name.toUpperCase().substring(0, 16)
                this.ibisController.sendTelegram(telegram)
            }
          

        }
    }
}
export { UestraLVA }