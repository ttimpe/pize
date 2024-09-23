import { IBISController } from "../../controllers/IBISController";
import { IBISTelegram } from "../../extensions/IBISTelegram";
import { TelegramGenerator } from "../../TelegramGenerator";

class IBISValidator {
    address: IBISAddress
    status: number
    lastStatusReceivedTime: Date
    ibisController: IBISController
    constructor(ibisController: IBISController, address: IBISAddress) {
        this.ibisController = ibisController
        this.address = address
    }

    queryStatus() {
        this.ibisController.sendTelegram(TelegramGenerator.DS070(this.address));
        
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        if (this == this.ibisController.currentValidator) {
            if (telegram.match('g[0-9]')) {
                this.lastStatusReceivedTime = new Date();
                // Is status back from sign
                this.status = parseInt(telegram.substring(1, 2));
            }
        }
    }
}
export { IBISValidator }