import { TelegramGenerator } from "../../IBISTelegramGenerator"
import { IBISController } from "../../controllers/IBISController"
import { IBISTelegram } from "../../extensions/IBISTelegram"
import { Util } from "../../util"

class IBISSign {
    address: IBISAddress
    ibisController: IBISController
    status?: number
    lastStatusQueriedTime?: Date
    lastStatusReceivedTime?: Date
    constructor(ibisController: IBISController, address: IBISAddress) {
        this.address = address
        this.ibisController = ibisController
    }

    queryStatus() {
        if (this.status === undefined || this.status == 0) {

            this.lastStatusQueriedTime = new Date()
            this.ibisController.sendTelegram(TelegramGenerator.DS020(this.address))
            setTimeout(() => {
                if (this.lastStatusReceivedTime != undefined && (this.lastStatusReceivedTime.getTime() - this.lastStatusQueriedTime.getTime()) <= 6000) {
                    // Is active, have received status
                    Util.log("Anzeige ", this.address, " OK")
                } else {
                    // Have not received status, throw error
                    this.ibisController.throwError("ANZEIGE.DEF.1:" + this.address.toString().padStart(2, '0'));
                    Util.log("Anzeige ", this.address, " FAIL")
                    this.status = null;
                }
                this.ibisController.aktuelleAnzeige = undefined;

            }, 6000);
        }
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        if (telegram.match('a[0-9]')) {
            this.lastStatusReceivedTime = new Date();
            // Is status back from sign
            this.status = parseInt(telegram.substring(1, 2));

        }
    }
}
export { IBISSign }