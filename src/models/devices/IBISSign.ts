import { TelegramGenerator } from "../../TelegramGenerator"
import { IBISController } from "../../controllers/IBISController"
import { IBISTelegram } from "../../extensions/IBISTelegram"

class IBISSign {
    address: IBISAddress
    ibisController: IBISController
    status: number
    lastStatusQueriedTime?: Date
    lastStatusReceivedTime?: Date
    constructor(ibisController: IBISController, address: IBISAddress) {
        this.address = address
        this.ibisController = ibisController
    }
    
    queryStatus() {
        this.lastStatusQueriedTime = new Date()
        this.ibisController.sendTelegram(TelegramGenerator.DS020(this.address))
        setTimeout(() => {
            if (this.lastStatusReceivedTime != undefined && (this.lastStatusReceivedTime.getTime() - this.lastStatusQueriedTime.getTime()) >= 1000) {
                // Is active, have received status
                
            } else {
                // Have not received status, throw error
                this.ibisController.throwError("ANZ. " + this.address + " DEFEKT");
            }
            this.ibisController.currentSign = undefined;

        }, 1000);
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