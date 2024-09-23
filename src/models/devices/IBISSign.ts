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
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        if (this == this.ibisController.currentSign) {
        if (telegram.match('a[0-9]')) {
            this.lastStatusReceivedTime = new Date();
            // Is status back from sign
            this.status = parseInt(telegram.substring(1, 2));
        }
    }
    }
}
export { IBISSign }