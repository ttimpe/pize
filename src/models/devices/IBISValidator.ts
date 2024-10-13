import { IBISController } from "../../controllers/IBISController";
import { IBISTelegram } from "../../extensions/IBISTelegram";
import { TelegramGenerator } from "../../TelegramGenerator";
import { Util } from "../../util";

class IBISValidator {
    address: IBISAddress
    status?: number
    lastStatusQueriedTime?: Date
    lastStatusReceivedTime?: Date
    ibisController: IBISController
    constructor(ibisController: IBISController, address: IBISAddress) {
        this.ibisController = ibisController
        this.address = address
    }



    queryStatus() {
        if (this.status == undefined || this.status == 0) {
        this.lastStatusQueriedTime = new Date()
        this.ibisController.sendTelegram(TelegramGenerator.DS070(this.address))
        setTimeout(() => {
            if (this.lastStatusReceivedTime != undefined && (this.lastStatusReceivedTime.getTime() - this.lastStatusQueriedTime.getTime()) >= 2000) {
                // Is active, have received status
                Util.log("Entwerter ", this.address, " OK")

            } else {
                // Have not received status, throw error
                this.ibisController.throwError("ENTW. " + this.address + " DEFEKT");
                Util.log("Entwerter ", this.address, " FAIL")

            }
            this.ibisController.currentValidator = undefined;

        }, 1000);
        }
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        if (telegram.match('g[0-9]')) {
            Util.log('Received response from validator', this.address)
            this.lastStatusReceivedTime = new Date();
            // Is status back from sign
            this.status = parseInt(telegram.substring(1, 2));
        }
    }

 
}
export { IBISValidator }